/**
 * Retrieves daily historical weather for a date range and updates the almanac.
 *
 * This is for days before the daily almanac cron was put into place.
 */

import dayjs from 'dayjs';

const THINGSPEAK_URL_START_FRAGMENT = `https://api.thingspeak.com/channels/`;

function encodeGetParams(params: { [key: string]: string | number }): string {
    return Object.entries(params)
        .map((kv) => kv.map(encodeURIComponent).join('='))
        .join('&');
}

export interface DateRange {
    start: Date;
    end: Date;
}

export function dateRangesToUrls(range: DateRange, channelId: string): string {
    function dateToThingspeakDateString(d: Date) {
        // Fix the time at 7:00:00h UTC which is 00:00 PDT
        return dayjs(d).format('YYYY-MM-DD 7:00:00'); // Original format: 'yyyy-MM-dd hh:mm:ss'
    }

    const getParams = {
        start: dateToThingspeakDateString(range.start),
        end: dateToThingspeakDateString(range.end),
    };
    const url = `${THINGSPEAK_URL_START_FRAGMENT}${channelId}` + `/feed.json?${encodeGetParams(getParams)}`;
    return url;
}

async function main() {

    const channelId = '581842'; // Mabel Indoor / Outdoor sensor
    const { start, end } = parseArgs();
    console.log(`start`, start, `end`, end);
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
    const start = new Date(startInput);
    const end = new Date(endInput);

    if (!dayjs(start).isValid()) {
        exitWithUsage(`Invalid start date: ${startInput}`);
    }
    if (!dayjs(end).isValid()) {
        exitWithUsage(`Invalid end date: ${endInput}`);
    }
    return { start, end };
}

main();
