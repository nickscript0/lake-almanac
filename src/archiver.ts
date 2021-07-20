/**
 * Retrieves daily historical weather for a date range and updates the almanac.
 *
 * This is for days before the daily almanac cron was put into place.
 */

import dayjs from 'dayjs';

import { fetchLakeDay } from './thingspeak-sensor-api';
import { processDay } from './almanac';

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
        process.exit(1);
    }

    if (process.argv.length !== 4) {
        exitWithUsage(`Invalid number of args ${process.argv.length}`);
    }
    const startInput = process.argv[2];
    const endInput = process.argv[3];
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
