/**
 * Script to check for gaps in the database temperature readings and identify missing dates for backfill.
 */
import dotenv from 'dotenv';
import { Command } from 'commander';

// Load environment variables from .env.local (and .env as fallback)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env
import { Pool } from 'pg';
import dayjs from 'dayjs';

interface DatabaseGapResult {
    latestDate: string | null;
    missingDates: string[];
    totalGaps: number;
}

let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        pool = new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    return pool;
}

async function getLatestDatabaseDate(): Promise<string | null> {
    const pool = getPool();
    const client = await pool.connect();

    try {
        const result = await client.query(`
            SELECT MAX(DATE(date_recorded)) as latest_date 
            FROM lake_temperature_readings
        `);

        return result.rows[0]?.latest_date || null;
    } finally {
        client.release();
    }
}

async function getExistingDates(startDate: string, endDate: string): Promise<Set<string>> {
    const pool = getPool();
    const client = await pool.connect();

    try {
        const result = await client.query(
            `
            SELECT DISTINCT DATE(date_recorded) as date_recorded
            FROM lake_temperature_readings
            WHERE DATE(date_recorded) BETWEEN $1 AND $2
            ORDER BY date_recorded
        `,
            [startDate, endDate]
        );

        return new Set(result.rows.map((row) => dayjs(row.date_recorded).format('YYYY-MM-DD')));
    } finally {
        client.release();
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

async function findDatabaseGaps(startDate?: string, endDate?: string): Promise<DatabaseGapResult> {
    const latestDate = await getLatestDatabaseDate();

    if (!latestDate) {
        return {
            latestDate: null,
            missingDates: [],
            totalGaps: 0,
        };
    }

    // Default range: from project start (2018-10-06) to yesterday
    const defaultStartDate = '2018-10-06';
    const defaultEndDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    const rangeStart = startDate || defaultStartDate;
    const rangeEnd = endDate || defaultEndDate;

    console.log(`Checking database gaps from ${rangeStart} to ${rangeEnd}`);
    console.log(`Latest date in database: ${latestDate}`);

    const expectedDates = generateDateRange(rangeStart, rangeEnd);
    const existingDates = await getExistingDates(rangeStart, rangeEnd);

    const missingDates = expectedDates.filter((date) => !existingDates.has(date));

    return {
        latestDate,
        missingDates,
        totalGaps: missingDates.length,
    };
}

async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

async function main() {
    const program = new Command();
    program
        .option('-s, --start-date <date>', 'Start date for gap checking (YYYY-MM-DD)')
        .option('-e, --end-date <date>', 'End date for gap checking (YYYY-MM-DD)')
        .option('--recent <days>', 'Check only the last N days', parseInt)
        .option('--list-missing', 'List all missing dates')
        .option('-h, --help', 'Show help')
        .parse();

    const options = program.opts();

    if (options.help) {
        console.log(`
Usage: check-database-gaps.ts [options]

Checks for gaps in the database temperature readings and identifies missing dates.

Options:
  -s, --start-date <date>  Start date for gap checking (YYYY-MM-DD)
  -e, --end-date <date>    End date for gap checking (YYYY-MM-DD)
  --recent <days>          Check only the last N days
  --list-missing           List all missing dates
  -h, --help              Show this help message

Examples:
  check-database-gaps.ts                           # Check all gaps from project start
  check-database-gaps.ts --recent 30               # Check last 30 days
  check-database-gaps.ts -s 2024-01-01 -e 2024-12-31  # Check specific date range
  check-database-gaps.ts --list-missing             # Show all missing dates
`);
        process.exit(0);
    }

    try {
        let startDate = options.startDate;
        let endDate = options.endDate;

        if (options.recent) {
            endDate = dayjs().subtract(1, 'day').format('YYYY-MM-DD');
            startDate = dayjs().subtract(options.recent, 'days').format('YYYY-MM-DD');
        }

        const result = await findDatabaseGaps(startDate, endDate);

        if (!result.latestDate) {
            console.log('❌ No data found in database');
            return;
        }

        console.log(`\n📊 Database Gap Analysis:`);
        console.log(`Latest date in database: ${result.latestDate}`);
        console.log(`Total missing dates: ${result.totalGaps}`);

        if (result.totalGaps === 0) {
            console.log('✅ No gaps found - database is complete for the specified range');
        } else {
            console.log(`⚠️  Found ${result.totalGaps} missing dates`);

            if (options.listMissing && result.missingDates.length > 0) {
                console.log('\nMissing dates:');
                result.missingDates.forEach((date) => console.log(`  ${date}`));
            } else if (result.missingDates.length > 0) {
                console.log(`\nFirst few missing dates:`);
                result.missingDates.slice(0, 10).forEach((date) => console.log(`  ${date}`));
                if (result.missingDates.length > 10) {
                    console.log(`  ... and ${result.missingDates.length - 10} more`);
                    console.log('\nUse --list-missing to see all missing dates');
                }
            }

            console.log(`\n💡 To backfill missing data, you have two options:`);
            console.log(`   1. From existing archives: npm run backfill-database`);
            console.log(`      (Recommended: Uses archived data, database-only update)`);
            console.log(`   2. Fetch new data: npm run retry-missed-days`);
            console.log(`      (Requires dates to be in almanac metadata, fetches from API)`);
        }
    } catch (error) {
        console.error('Error checking database gaps:', error);
        process.exit(1);
    } finally {
        await closeDatabase();
    }
}

main();
