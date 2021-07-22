/**
 * Retrieves daily historical weather for a date range and updates the almanac.
 *
 * This is for days before the daily almanac cron was put into place.
 */
import { parse } from 'https://deno.land/std@0.102.0/flags/mod.ts';

import dayjs from 'https://cdn.skypack.dev/dayjs@1.10.6';
import dayjsTypes from 'https://deno.land/x/dayjs@v1.10.6/types/index.d.ts';

import { fetchLakeDay } from './thingspeak-sensor-api.ts';
import { processDay } from './almanac.ts';
import { writeZippedStringToFile } from './writer.ts';

async function main() {
    const range = parseArgs();
    // console.log(`start`, range.start.toString(), `end`, range.end.toString(), `saveJson`, range.saveJson);

    const numDays = range.end.diff(range.start, 'day');
    for (let i = 0; i < numDays; i++) {
        const curDay = range.start.add(i, 'day');
        const response = await fetchLakeDay(curDay.format('YYYY-MM-DD'));
        if (range.saveResponses) {
            await writeZippedStringToFile('responses-archive', response.day, JSON.stringify(response.json));
        }
        await processDay(response);
    }
}

function parseArgs(): { start: dayjsTypes.Dayjs; end: dayjsTypes.Dayjs; saveResponses: boolean } {
    function exitWithUsage(errMessage: string) {
        console.log(
            `Error: ${errMessage}.
Usage:
 1. archiver.ts [--${SAVE_RESPONSES_FLAG}] <start-date> <end-date>
 2. archiver.ts [--${SAVE_RESPONSES_FLAG}] yesterday
Examples:
 archiver.ts 2020-05-01 2020-09-01
`
        );
        Deno.exit(1);
    }
    const SAVE_RESPONSES_FLAG = 'save-responses';
    const args = parse(Deno.args, { boolean: [SAVE_RESPONSES_FLAG] });

    if (args._.length === 1) {
        if (args._[0] === 'yesterday') {
            const now: dayjsTypes.Dayjs = dayjs();
            // Treat yesterday as 2 days ago to eliminate any issues with running this when UTC is past midnight
            const end = dayjs(now.subtract(1, 'day').format('YYYY-MM-DD'));
            const start = dayjs(now.subtract(2, 'day').format('YYYY-MM-DD'));
            return { start, end, saveResponses: args[SAVE_RESPONSES_FLAG] };
        } else {
            exitWithUsage(`Invalid single argument '${args._[0]}', the only acceptable single argument is 'yesterday'`);
        }
    } else if (args._.length !== 2) {
        exitWithUsage(`Invalid number of args ${Deno.args.length}`);
    }
    const startInput = args._[0];
    const endInput = args._[1];
    const start = dayjs(startInput);
    const end = dayjs(endInput);

    if (!start.isValid()) {
        exitWithUsage(`Invalid start date: ${startInput}`);
    }
    if (!end.isValid()) {
        exitWithUsage(`Invalid end date: ${endInput}`);
    }
    return { start, end, saveResponses: args[SAVE_RESPONSES_FLAG] };
}

main();
