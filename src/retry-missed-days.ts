/**
 * Utility script to retry fetching data for missed days recorded in the almanac.
 */
import dotenv from 'dotenv';
import { Command } from 'commander';

// Load environment variables from .env.local (and .env as fallback)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env
import { readFile } from 'fs/promises';
import { fetchLakeDay } from './thingspeak-sensor-api';
import { processDay, processDayFailure, AlmanacWithMetadata } from './almanac';
import { writeZippedStringToFile } from './writer';
import dayjs from 'dayjs';

const ALMANAC_PATH = 'output/lake-almanac.json';

async function main() {
    const options = parseArgs();

    try {
        const almanacContent = await readFile(ALMANAC_PATH, 'utf8');
        const almanac: AlmanacWithMetadata = JSON.parse(almanacContent);

        if (!almanac._metadata || !almanac._metadata.missedDays || almanac._metadata.missedDays.length === 0) {
            console.log('No missed days found in almanac metadata.');
            return;
        }

        const missedDays = [...almanac._metadata.missedDays]; // Copy to avoid modification during iteration
        console.log(`Found ${missedDays.length} missed days to retry:`, missedDays);

        for (const day of missedDays) {
            console.log(`\nRetrying day: ${day}`);

            try {
                const response = await fetchLakeDay(day);

                if (options.saveResponses) {
                    const dayjs_day = dayjs(day);
                    await writeZippedStringToFile(
                        `output/responses-archive/${dayjs_day.year()}`,
                        response.day,
                        JSON.stringify(response.json)
                    );
                }

                await processDay(response);
                console.log(`✓ Successfully processed day ${day}`);
            } catch (error) {
                const err = error instanceof Error ? error : new Error(String(error));
                console.error(`✗ Failed to retry day ${day}:`, err.message);

                if (!options.removeFailedRetries) {
                    await processDayFailure(day, err);
                }
            }
        }

        console.log('\nRetry process completed.');
    } catch (error) {
        console.error('Error reading almanac:', error);
        process.exit(1);
    }
}

function parseArgs(): { saveResponses: boolean; removeFailedRetries: boolean } {
    const program = new Command();
    program
        .option('--save-responses', 'Save API responses to archive')
        .option('--remove-failed-retries', 'Remove days from missed list even if retry fails')
        .option('-h, --help', 'Show help')
        .parse();

    const options = program.opts();

    if (options.help) {
        console.log(`
Usage: retry-missed-days.ts [options]

Retries fetching data for all days marked as missed in the almanac metadata.

Options:
  --save-responses         Save successful API responses to archive
  --remove-failed-retries  Remove days from missed list even if retry fails
  -h, --help              Show this help message

Examples:
  retry-missed-days.ts
  retry-missed-days.ts --save-responses
  retry-missed-days.ts --remove-failed-retries
`);
        process.exit(0);
    }

    return {
        saveResponses: !!options.saveResponses,
        removeFailedRetries: !!options.removeFailedRetries,
    };
}

main();
