/**
 * Script to backfill database with temperature readings from archived JSON files.
 * Reads existing archived data and inserts into database without updating almanac or storing new files.
 */
import dotenv from 'dotenv';
import { Command } from 'commander';
import { existsSync } from 'fs';
import dayjs from 'dayjs';
import { loadArchivedDay } from '../src/archive-storage';
import { saveDayToDatabase, closeDatabase } from '../src/database';
import { SensorConfig, resolveSensorConfigs, supportsSensorDay } from '../src/sensor-config';

// Load environment variables from .env.local (and .env as fallback)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env

interface BackfillResult {
    date: string;
    sensor: string;
    status: 'success' | 'missing' | 'error';
    message?: string;
    recordCount?: number;
}

function getArchiveFilePath(sensor: SensorConfig, date: string): string {
    const year = dayjs(date).year();
    return `${sensor.archiveRoot}/${year}/${date}.zip`;
}

async function backfillDate(sensor: SensorConfig, date: string): Promise<BackfillResult> {
    if (!supportsSensorDay(sensor, date)) {
        return {
            date,
            sensor: sensor.key,
            status: 'missing',
            message: 'Date is before sensor start date',
        };
    }

    const archivePath = getArchiveFilePath(sensor, date);

    if (!existsSync(archivePath)) {
        return {
            date,
            sensor: sensor.key,
            status: 'missing',
            message: 'Archive file not found',
        };
    }

    try {
        console.log(`Processing ${sensor.key} ${date}...`);

        const response = await loadArchivedDay(sensor, date);
        await saveDayToDatabase(response.json);

        return {
            date,
            sensor: sensor.key,
            status: 'success',
            recordCount: response.json.feeds.length,
            message: `Successfully inserted ${response.json.feeds.length} temperature readings`,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            date,
            sensor: sensor.key,
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
        .option('--sensor <sensor>', 'Backfill only one sensor (outdoor-air or lake-water)')
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
  --sensor <sensor>        Backfill only one sensor (outdoor-air or lake-water)
  --dry-run               Show what would be processed without making database changes
  -h, --help              Show this help message

Examples:
  backfill-database-from-archive.ts -s 2024-01-01 -e 2024-01-31
  backfill-database-from-archive.ts --sensor lake-water -d 2026-05-09
  backfill-database-from-archive.ts --dry-run -s 2024-01-01 -e 2024-01-07

Note: This script only processes dates that have archived JSON files.
`);
        process.exit(0);
    }

    try {
        let datesToProcess: string[] = [];

        if (options.dates) {
            datesToProcess = options.dates.split(',').map((date: string) => date.trim());
        } else if (options.startDate && options.endDate) {
            datesToProcess = generateDateRange(options.startDate, options.endDate);
        } else if (options.startDate) {
            datesToProcess = [options.startDate];
        } else {
            console.error('Error: Must specify either --dates, or --start-date (with optional --end-date)');
            process.exit(1);
        }

        for (const date of datesToProcess) {
            if (!dayjs(date).isValid()) {
                console.error(`Error: Invalid date format: ${date}. Use YYYY-MM-DD format.`);
                process.exit(1);
            }
        }

        const sensors = resolveSensorConfigs(options.sensor);

        console.log(`📊 Database Backfill from Archive`);
        console.log(
            `Processing ${datesToProcess.length} date(s) across ${sensors.length} sensor(s)${options.dryRun ? ' (DRY RUN)' : ''}`
        );
        console.log(`Date range: ${datesToProcess[0]} to ${datesToProcess[datesToProcess.length - 1]}`);
        console.log('');

        const results: BackfillResult[] = [];
        let successCount = 0;
        let missingCount = 0;
        let errorCount = 0;
        let totalRecords = 0;

        for (const sensor of sensors) {
            for (const date of datesToProcess) {
                if (!supportsSensorDay(sensor, date)) {
                    continue;
                }

                if (options.dryRun) {
                    const archivePath = getArchiveFilePath(sensor, date);
                    const exists = existsSync(archivePath);
                    console.log(
                        `${exists ? '✓' : '✗'} ${sensor.key} ${date} - Archive ${exists ? 'exists' : 'missing'}`
                    );
                    if (exists) successCount++;
                    else missingCount++;
                } else {
                    const result = await backfillDate(sensor, date);
                    results.push(result);

                    switch (result.status) {
                        case 'success':
                            console.log(`✓ ${result.sensor} ${result.date} - ${result.message}`);
                            successCount++;
                            totalRecords += result.recordCount || 0;
                            break;
                        case 'missing':
                            console.log(`⚠ ${result.sensor} ${result.date} - ${result.message}`);
                            missingCount++;
                            break;
                        case 'error':
                            console.log(`✗ ${result.sensor} ${result.date} - ${result.message}`);
                            errorCount++;
                            break;
                    }
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
            results
                .filter((r) => r.status === 'error')
                .forEach((r) => console.log(`  ${r.sensor} ${r.date}: ${r.message}`));
        }

        if (missingCount > 0) {
            console.log('\n📁 Missing archive files:');
            results.filter((r) => r.status === 'missing').forEach((r) => console.log(`  ${r.sensor} ${r.date}`));
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
