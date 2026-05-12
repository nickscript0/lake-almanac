/**
 * Utility script to retry fetching data for missed days recorded in the almanac.
 */
import dotenv from 'dotenv';
import { Command } from 'commander';

// Load environment variables from .env.local (and .env as fallback)
dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback to .env
import { fetchThingSpeakDay } from './thingspeak-sensor-api';
import { getMissedDaysForSensor, processSensorDay, processSensorDayFailure } from './almanac';
import { resolveSensorConfigs } from './sensor-config';
import { saveArchivedDay } from './archive-storage';

async function main() {
    const options = parseArgs();

    try {
        for (const sensor of options.sensors) {
            const missedDays = await getMissedDaysForSensor(sensor);

            if (missedDays.length === 0) {
                console.log(`No missed days found for sensor ${sensor.key}.`);
                continue;
            }

            console.log(`Found ${missedDays.length} missed day(s) to retry for ${sensor.key}:`, missedDays);

            for (const day of missedDays) {
                console.log(`\nRetrying ${sensor.key} day: ${day}`);

                try {
                    const response = await fetchThingSpeakDay(day, {
                        channelId: sensor.channelId,
                        earliestRecord: sensor.earliestRecord,
                    });

                    if (options.saveResponses) {
                        await saveArchivedDay(sensor, response);
                    }

                    await processSensorDay(sensor, response);
                    console.log(`✓ Successfully processed ${sensor.key} day ${day}`);
                } catch (error) {
                    const err = error instanceof Error ? error : new Error(String(error));
                    console.error(`✗ Failed to retry ${sensor.key} day ${day}:`, err.message);

                    if (!options.removeFailedRetries) {
                        await processSensorDayFailure(sensor, day, err);
                    }
                }
            }
        }

        console.log('\nRetry process completed.');
    } catch (error) {
        console.error('Error reading almanac:', error);
        process.exit(1);
    }
}

function parseArgs(): {
    saveResponses: boolean;
    removeFailedRetries: boolean;
    sensors: ReturnType<typeof resolveSensorConfigs>;
} {
    const program = new Command();
    program
        .option('--save-responses', 'Save API responses to archive')
        .option('--remove-failed-retries', 'Remove days from missed list even if retry fails')
        .option('--sensor <sensor>', 'Retry missed days for only one sensor (outdoor-air or lake-water)')
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
  --sensor <sensor>        Retry only one sensor (outdoor-air or lake-water)
  -h, --help              Show this help message

Examples:
  retry-missed-days.ts
  retry-missed-days.ts --sensor lake-water --save-responses
  retry-missed-days.ts --remove-failed-retries
`);
        process.exit(0);
    }

    return {
        saveResponses: !!options.saveResponses,
        removeFailedRetries: !!options.removeFailedRetries,
        sensors: resolveSensorConfigs(options.sensor),
    };
}

main();
