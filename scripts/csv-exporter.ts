/**
 * Exports archived temperature data to CSV format for PostgreSQL import.
 *
 * Usage: csv-exporter.ts <start-date> <end-date> [output-file]
 * Example: csv-exporter.ts 2020-01-01 2020-12-31 lake-data-2020.csv
 */
import { Command } from 'commander';
import dayjs, { Dayjs } from 'dayjs';
import { readFile } from 'fs/promises';
import JSZip from 'jszip';
import { createWriteStream } from 'fs';

import { FieldResponse } from '../src/thingspeak-sensor-api';

interface CsvRow {
    date_recorded: string;
    entry_id: number;
    indoor_temp: string | null;
    outdoor_temp: string | null;
    channel_id: number;
}

async function main() {
    const config = parseArgs();

    console.log(`Exporting data from ${config.start.format('YYYY-MM-DD')} to ${config.end.format('YYYY-MM-DD')}`);
    console.log(`Output file: ${config.outputFile}`);

    const writeStream = createWriteStream(config.outputFile);

    // Write CSV header
    const header = 'date_recorded,entry_id,indoor_temp,outdoor_temp,channel_id\n';
    writeStream.write(header);

    const numDays = config.end.diff(config.start, 'day');
    let processedDays = 0;
    let totalRows = 0;
    let skippedDays = 0;
    const allTimestamps: Array<{ timestamp: string; dayFile: string }> = [];

    for (let i = 0; i < numDays; i++) {
        const curDay = config.start.add(i, 'day');
        const dayString = curDay.format('YYYY-MM-DD');

        try {
            const response = await loadArchivedDay(dayString);
            if (response) {
                const rows = convertToCSVRows(response);
                for (const row of rows) {
                    writeStream.write(formatCSVRow(row) + '\n');
                    allTimestamps.push({ timestamp: row.date_recorded, dayFile: dayString });
                    totalRows++;
                }
                processedDays++;
            } else {
                console.warn(`No data found for ${dayString}`);
                skippedDays++;
            }
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            console.warn(`Failed to process ${dayString}: ${err.message}`);
            skippedDays++;
        }

        // Progress update every 30 days
        if ((i + 1) % 30 === 0 || i === numDays - 1) {
            console.log(`Progress: ${i + 1}/${numDays} days processed, ${totalRows} rows exported`);
        }
    }

    writeStream.end();

    // Calculate timestamp gap statistics
    const gapStats = calculateTimestampGaps(allTimestamps);

    console.log(`\nExport completed:`);
    console.log(`- Days processed: ${processedDays}`);
    console.log(`- Days skipped: ${skippedDays}`);
    console.log(`- Total rows: ${totalRows}`);
    console.log(`- Output file: ${config.outputFile}`);

    if (gapStats) {
        console.log(`\nTimestamp Gap Statistics (between files only):`);
        console.log(`- Total gaps analyzed: ${gapStats.totalGaps}`);
        console.log(`- Average gap (≤ 10 min only): ${gapStats.avgGapMinutes.toFixed(1)} minutes`);
        console.log(`- Minimum gap: ${gapStats.minGapMinutes.toFixed(1)} minutes`);
        console.log(`- Maximum gap: ${gapStats.maxGapMinutes.toFixed(1)} minutes`);
        console.log(`- Files with gaps > 10 minutes: ${gapStats.largeGaps.length}`);
        console.log(`- Files with gaps ≤ 10 minutes: ${gapStats.totalGaps - gapStats.largeGaps.length}`);

        if (gapStats.largeGaps.length > 0) {
            console.log(`\nFiles with gaps > 10 minutes:`);
            for (const gap of gapStats.largeGaps) {
                console.log(`- ${gap.fromFile} to ${gap.toFile}: ${gap.gapMinutes.toFixed(1)} minutes`);
            }
        }
    } else {
        console.log(`\nNo inter-file gaps found (only one file or no valid timestamps)`);
    }

    console.log(`\nPostgreSQL COPY command:`);
    console.log(`COPY lake_temperature_readings (date_recorded, entry_id, indoor_temp, outdoor_temp, channel_id)`);
    console.log(`FROM '${config.outputFile}' WITH (FORMAT CSV, HEADER);`);
}

function parseArgs(): { start: Dayjs; end: Dayjs; outputFile: string } {
    const program = new Command();
    program
        .argument('<start-date>', 'Start date (YYYY-MM-DD)')
        .argument('<end-date>', 'End date (YYYY-MM-DD)')
        .argument('[output-file]', 'Output CSV file path', 'lake-data-export.csv')
        .option('-h, --help', 'Show help')
        .parse();

    const args = program.args;
    const options = program.opts();

    if (options.help || args.length < 2) {
        console.log(`
Usage: csv-exporter.ts <start-date> <end-date> [output-file]

Examples:
  csv-exporter.ts 2020-01-01 2020-12-31
  csv-exporter.ts 2018-10-06 2025-01-01 full-dataset.csv

The script will create a CSV file suitable for PostgreSQL COPY command.
        `);
        process.exit(args.length < 2 ? 1 : 0);
    }

    const startInput = args[0];
    const endInput = args[1];
    const outputFile = args[2] || 'lake-data-export.csv';

    const start = dayjs(startInput);
    const end = dayjs(endInput);

    if (!start.isValid()) {
        console.error(`Error: Invalid start date: ${startInput}`);
        process.exit(1);
    }
    if (!end.isValid()) {
        console.error(`Error: Invalid end date: ${endInput}`);
        process.exit(1);
    }
    if (end.isBefore(start)) {
        console.error(`Error: End date must be after start date`);
        process.exit(1);
    }

    return { start, end, outputFile };
}

async function loadArchivedDay(day: string): Promise<FieldResponse | null> {
    const dayjs_day = dayjs(day);
    if (!dayjs_day.isValid()) {
        throw new Error(`Invalid day requested ${day}`);
    }

    const year = dayjs_day.year();
    const archivePath = `output/responses-archive/${year}/${day}.zip`;

    try {
        const zipBuffer = await readFile(archivePath);
        const zip = await JSZip.loadAsync(zipBuffer);
        const jsonFile = zip.file(`${day}.json`);

        if (!jsonFile) {
            throw new Error(`JSON file not found in archive: ${day}.json`);
        }

        const jsonContent = await jsonFile.async('text');
        const json: FieldResponse = JSON.parse(jsonContent);

        // Validate that we got meaningful data
        if (!json.feeds || json.feeds.length === 0) {
            throw new Error(`No data feeds in archived file for day ${day}`);
        }

        return json;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load archived day ${day}: ${errorMessage}`);
    }
}

function convertToCSVRows(response: FieldResponse): CsvRow[] {
    const rows: CsvRow[] = [];

    for (const feed of response.feeds) {
        // Skip feeds with no temperature data
        if (!feed.field1 && !feed.field2) {
            continue;
        }

        rows.push({
            date_recorded: feed.created_at,
            entry_id: feed.entry_id,
            indoor_temp: feed.field1 || null,
            outdoor_temp: feed.field2 || null,
            channel_id: response.channel.id,
        });
    }

    return rows;
}

function formatCSVRow(row: CsvRow): string {
    // Escape and format each field for CSV
    const fields = [
        escapeCSVField(row.date_recorded),
        row.entry_id.toString(),
        row.indoor_temp || '',
        row.outdoor_temp || '',
        row.channel_id.toString(),
    ];

    return fields.join(',');
}

function escapeCSVField(value: string): string {
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
        return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
}

function calculateTimestampGaps(timestampData: Array<{ timestamp: string; dayFile: string }>): {
    totalGaps: number;
    avgGapMinutes: number;
    minGapMinutes: number;
    maxGapMinutes: number;
    largeGaps: Array<{ fromFile: string; toFile: string; gapMinutes: number }>;
} | null {
    if (timestampData.length < 2) {
        return null;
    }

    // Sort timestamps chronologically
    const sortedData = timestampData
        .map((item) => ({ ...item, dayjsTimestamp: dayjs(item.timestamp) }))
        .filter((item) => item.dayjsTimestamp.isValid())
        .sort((a, b) => a.dayjsTimestamp.valueOf() - b.dayjsTimestamp.valueOf());

    if (sortedData.length < 2) {
        return null;
    }

    // Calculate gaps in minutes - only between different files
    const gaps: number[] = [];
    const smallGaps: number[] = [];
    const largeGaps: Array<{ fromFile: string; toFile: string; gapMinutes: number }> = [];

    for (let i = 1; i < sortedData.length; i++) {
        // Only count gaps between different files
        if (sortedData[i].dayFile !== sortedData[i - 1].dayFile) {
            const gapMinutes = sortedData[i].dayjsTimestamp.diff(sortedData[i - 1].dayjsTimestamp, 'minute', true);
            gaps.push(gapMinutes);

            // Track gaps larger than 10 minutes
            if (gapMinutes > 10) {
                largeGaps.push({
                    fromFile: sortedData[i - 1].dayFile,
                    toFile: sortedData[i].dayFile,
                    gapMinutes,
                });
            } else {
                smallGaps.push(gapMinutes);
            }
        }
    }

    if (gaps.length === 0) {
        return null;
    }

    const totalGaps = gaps.length;
    // Calculate average only for gaps <= 10 minutes
    const avgGapMinutes = smallGaps.length > 0 ? smallGaps.reduce((sum, gap) => sum + gap, 0) / smallGaps.length : 0;
    const minGapMinutes = Math.min(...gaps);
    const maxGapMinutes = Math.max(...gaps);

    return {
        totalGaps,
        avgGapMinutes,
        minGapMinutes,
        maxGapMinutes,
        largeGaps,
    };
}

main().catch((error) => {
    console.error('Export failed:', error);
    process.exit(1);
});
