/**
 * Retrieves daily historical weather for a date range and updates the almanac.
 *
 * This is for days before the daily almanac cron was put into place.
 */
import { Command } from 'commander';
import dayjs, { Dayjs } from 'dayjs';

import { fetchLakeDay, EARLIEST_RECORD } from './thingspeak-sensor-api';
import { processDay } from './almanac';
import { writeZippedStringToFile } from './writer';

async function main() {
    const range = parseArgs();
    // console.log(`start`, range.start.toString(), `end`, range.end.toString(), `saveJson`, range.saveJson);

    const numDays = range.end.diff(range.start, 'day');
    for (let i = 0; i < numDays; i++) {
        const curDay = range.start.add(i, 'day');
        const response = await fetchLakeDay(curDay.format('YYYY-MM-DD'));
        if (range.saveResponses) {
            await writeZippedStringToFile(
                `output/responses-archive/${curDay.year()}`,
                response.day,
                JSON.stringify(response.json)
            );
        }
        await processDay(response);
    }
}

function parseArgs(): { start: Dayjs; end: Dayjs; saveResponses: boolean } {
    function exitWithUsage(errMessage: string) {
        console.log(
            `Error: ${errMessage}.
Usage:
 1. archiver.ts [--${SAVE_RESPONSES_FLAG}] <start-date> <end-date>
 2. archiver.ts (For github-actions, run with no arguments, or 1 argument it will ignore, 
    to only process yesterday and with --${SAVE_RESPONSES_FLAG} enabled)
Examples:
 archiver.ts ${EARLIEST_RECORD} 2020-09-01
 archiver.ts
`
        );
        process.exit(1);
    }
    const SAVE_RESPONSES_FLAG = 'save-responses';
    const program = new Command();
    program
        .argument('[start-date]', 'Start date (YYYY-MM-DD)')
        .argument('[end-date]', 'End date (YYYY-MM-DD)')
        .option(`--${SAVE_RESPONSES_FLAG}`, 'Save API responses to archive')
        .option('-h, --help', 'Show help')
        .parse();

    const args = program.args;
    const options = program.opts();
    
    if (options.help) exitWithUsage('Help');
    if (args.length === 0 || args.length === 1) {
        const now: Dayjs = dayjs();
        // Treat yesterday as 2 days ago to eliminate any issues with running this when UTC is past midnight
        const end = dayjs(now.subtract(1, 'day').format('YYYY-MM-DD'));
        const start = dayjs(now.subtract(2, 'day').format('YYYY-MM-DD'));
        return { start, end, saveResponses: true };
    } else if (args.length !== 2) {
        exitWithUsage(`Invalid number of args ${args.length}`);
    }
    const startInput = args[0];
    const endInput = args[1];
    const start = dayjs(startInput);
    const end = dayjs(endInput);

    if (!start.isValid()) {
        exitWithUsage(`Invalid start date: ${startInput}`);
    }
    if (!end.isValid()) {
        exitWithUsage(`Invalid end date: ${endInput}`);
    }
    return { start, end, saveResponses: options[SAVE_RESPONSES_FLAG] };
}

main();