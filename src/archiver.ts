/**
 * Retrieves daily historical weather for a date range and updates the almanac.
 *
 * This is for days before the daily almanac cron was put into place.
 */

// import dayjs from 'dayjs';
import dayjs from "https://cdn.skypack.dev/dayjs@1.10.6";

import { fetchLakeDay } from './thingspeak-sensor-api.ts';
import { processDay } from './almanac.ts';

async function main() {
    const range = parseArgs();
    // console.log(`start`, range.start, `end`, range.end);

    const numDays = range.end.diff(range.start, 'day');
    for (let i = 0; i < numDays; i++) {
        const curDay = range.start.add(i, 'day');
        const day = await fetchLakeDay(curDay.format('YYYY-MM-DD'));
        await processDay(day);
    }
}

function parseArgs() {
    function exitWithUsage(errMessage: string) {
        console.log(`${errMessage}. Usage: archiver.ts <start-date> <end-date> e.g. archiver.ts 2020-05-01 2020-09-01`);
        Deno.exit(1);
    }

    if (Deno.args.length !== 2) {
        exitWithUsage(`Invalid number of args ${Deno.args.length}`);
    }
    const startInput = Deno.args[0];
    const endInput = Deno.args[1];
    const start = dayjs(startInput);
    const end = dayjs(endInput);

    if (!start.isValid()) {
        exitWithUsage(`Invalid start date: ${startInput}`);
    }
    if (!end.isValid()) {
        exitWithUsage(`Invalid end date: ${endInput}`);
    }
    return { start, end };
}

main();
