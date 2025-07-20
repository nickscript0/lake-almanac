/**
 * Script to backfill database with temperature readings from archived JSON files.
 * Reads existing archived data and inserts into database without updating almanac or storing new files.
 */
import dotenv from 'dotenv';
import { Command } from 'commander';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import JSZip from 'jszip';
import dayjs from 'dayjs';
import { FieldResponse } from '../src/thingspeak-sensor-api';
import { saveDayToDatabase, closeDatabase } from '../src/database';

// Load environment variables from .env.local (and .env as fallback)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

const ARCHIVE_BASE_PATH = 'output/responses-archive';

interface BackfillResult {
    date: string;
    status: 'success' | 'missing' | 'error';
    message?: string;
    recordCount?: number;
}

async function getArchiveFilePath(date: string): Promise<string> {
    const dayObj = dayjs(date);
    const year = dayObj.year();
    const filename = `${date}.zip`;
    return `${ARCHIVE_BASE_PATH}/${year}/${filename}`;
}

async function readArchivedDay(date: string): Promise<FieldResponse | null> {
    const archivePath = await getArchiveFilePath(date);

    if (!existsSync(archivePath)) {
        return null;
    }

    try {
        const zipData = await readFile(archivePath);
        const zip = new JSZip();
        const zipContents = await zip.loadAsync(zipData);

        const jsonFilename = `${date}.json`;
        const jsonFile = zipContents.file(jsonFilename);

        if (!jsonFile) {
            throw new Error(`JSON file ${jsonFilename} not found in archive`);
        }

        const jsonContent = await jsonFile.async('text');
        const response: FieldResponse = JSON.parse(jsonContent);

        return response;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to read archive for ${date}: ${errorMessage}`);
    }
}

async function backfillDate(date: string): Promise<BackfillResult> {
    try {
        console.log(`Processing ${date}...`);

        const response = await readArchivedDay(date);

        if (!response) {
            return {
                date,
                status: 'missing',
                message: 'Archive file not found',
            };
        }

        await saveDayToDatabase(response);

        return {
            date,
            status: 'success',
            recordCount: response.feeds.length,
            message: `Successfully inserted ${response.feeds.length} temperature readings`,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            date,
            status: 'error',
            message: errorMessage,
        };
    }
}

function generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    let current = dayjs(startDate);
    const end = dayjs(endDate);

    while (current.isBefore(end) || current.isSame(end)) {
        dates.push(current.format('YYYY-MM-DD'));
        current = current.add(1, 'day');
    }

    return dates;
}

async function main() {
    const program = new Command();
    program
        .option('-s, --start-date <date>', 'Start date for backfill (YYYY-MM-DD)')
        .option('-e, --end-date <date>', 'End date for backfill (YYYY-MM-DD)')
        .option('-d, --dates <dates>', 'Comma-separated list of specific dates (YYYY-MM-DD)')
        .option('--dry-run', 'Show what would be processed without making database changes')
        .option('-h, --help', 'Show help')
        .parse();

    const options = program.opts();

    if (options.help) {
        console.log(`
Usage: backfill-database-from-archive.ts [options]

Backfills database with temperature readings from archived JSON files.
Reads existing archived data and inserts into database without updating almanac or storing new files.

Options:
  -s, --start-date <date>  Start date for backfill (YYYY-MM-DD)
  -e, --end-date <date>    End date for backfill (YYYY-MM-DD)
  -d, --dates <dates>      Comma-separated list of specific dates (YYYY-MM-DD)
  --dry-run               Show what would be processed without making database changes
  -h, --help              Show this help message

Examples:
  backfill-database-from-archive.ts -s 2024-01-01 -e 2024-01-31    # Backfill January 2024
  backfill-database-from-archive.ts -d 2024-01-15,2024-02-20       # Backfill specific dates
  backfill-database-from-archive.ts --dry-run -s 2024-01-01 -e 2024-01-07  # Preview what would be processed

Note: This script only processes dates that have archived JSON files in output/responses-archive/
`);
        process.exit(0);
    }

    try {
        let datesToProcess: string[] = [];

        if (options.dates) {
            // Process specific dates
            datesToProcess = options.dates.split(',').map((date: string) => date.trim());
        } else if (options.startDate && options.endDate) {
            // Process date range
            datesToProcess = generateDateRange(options.startDate, options.endDate);
        } else if (options.startDate) {
            // Process single date
            datesToProcess = [options.startDate];
        } else {
            console.error('Error: Must specify either --dates, or --start-date (with optional --end-date)');
            process.exit(1);
        }

        // Validate dates
        for (const date of datesToProcess) {
            if (!dayjs(date).isValid()) {
                console.error(`Error: Invalid date format: ${date}. Use YYYY-MM-DD format.`);
                process.exit(1);
            }
        }

        console.log(`📊 Database Backfill from Archive`);
        console.log(`Processing ${datesToProcess.length} date(s)${options.dryRun ? ' (DRY RUN)' : ''}`);
        console.log(`Date range: ${datesToProcess[0]} to ${datesToProcess[datesToProcess.length - 1]}`);
        console.log('');

        const results: BackfillResult[] = [];
        let successCount = 0;
        let missingCount = 0;
        let errorCount = 0;
        let totalRecords = 0;

        for (const date of datesToProcess) {
            if (options.dryRun) {
                const archivePath = await getArchiveFilePath(date);
                const exists = existsSync(archivePath);
                console.log(`${exists ? '✓' : '✗'} ${date} - Archive ${exists ? 'exists' : 'missing'}`);
                if (exists) successCount++;
                else missingCount++;
            } else {
                const result = await backfillDate(date);
                results.push(result);

                switch (result.status) {
                    case 'success':
                        console.log(`✓ ${result.date} - ${result.message}`);
                        successCount++;
                        totalRecords += result.recordCount || 0;
                        break;
                    case 'missing':
                        console.log(`⚠ ${result.date} - ${result.message}`);
                        missingCount++;
                        break;
                    case 'error':
                        console.log(`✗ ${result.date} - ${result.message}`);
                        errorCount++;
                        break;
                }
            }
        }

        console.log('\n📈 Backfill Summary:');
        console.log(`Total dates processed: ${datesToProcess.length}`);
        console.log(`✓ Successful: ${successCount}`);
        console.log(`⚠ Missing archives: ${missingCount}`);
        console.log(`✗ Errors: ${errorCount}`);

        if (!options.dryRun && totalRecords > 0) {
            console.log(`📊 Total temperature readings inserted: ${totalRecords}`);
        }

        if (errorCount > 0) {
            console.log('\n❌ Errors occurred during processing:');
            results.filter((r) => r.status === 'error').forEach((r) => console.log(`  ${r.date}: ${r.message}`));
        }

        if (missingCount > 0) {
            console.log('\n📁 Missing archive files:');
            results.filter((r) => r.status === 'missing').forEach((r) => console.log(`  ${r.date}`));
            console.log('\nNote: Missing archives may need to be fetched using "npm run retry-missed-days"');
        }

        if (options.dryRun) {
            console.log('\n💡 This was a dry run. Use the command without --dry-run to perform the actual backfill.');
        }
    } catch (error) {
        console.error('Error during backfill process:', error);
        process.exit(1);
    } finally {
        await closeDatabase();
    }
}

main();
