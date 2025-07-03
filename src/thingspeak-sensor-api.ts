import dayjs, { Dayjs } from 'dayjs';
import fetch from 'node-fetch';
import { isBefore } from './util';

// Thingspeak API response
export interface FieldResponse {
    channel: Channel;
    feeds: FieldFeed[];
}

export interface Channel {
    id: number;
    name: string;
    latitude: string;
    longitude: string;
    field1: string;
    field2?: string;
    field3?: string;
    field4?: string;
    field5?: string;
    field6?: string;
    field7?: string;
    field8?: string;
    created_at: string;
    updated_at: string;
    last_entry_id: number;
}

export interface FieldFeed {
    created_at: string;
    entry_id: number;
    field1: string;
    field2?: string | null;
    field3?: string | null;
    field4?: string | null;
    field5?: string | null;
    field6?: string | null;
    field7?: string | null;
    field8?: string | null;
}

const THINGSPEAK_URL_START_FRAGMENT = `https://api.thingspeak.com/channels/`;
const channelId = '581842'; // lake Indoor / Outdoor sensor
// The earliest valid record for the lake Outdoor temp sensor
export const EARLIEST_RECORD = '2018-10-06';

function encodeGetParams(params: { [key: string]: string | number }): string {
    return Object.entries(params)
        .map((kv) => kv.map(encodeURIComponent).join('='))
        .join('&');
}

export interface DateRange {
    start: string;
    end: string;
}

function dateToThingspeakDateString(d: Dayjs) {
    return d.format('YYYY-MM-DD 00:00:00');
}

function dateRangeToUrl(range: DateRange, channelId: string): string {
    const getParams = {
        start: range.start,
        end: range.end,
        timezone: 'America/Los_Angeles', // Request data in Pacific time (Lake Time)
    };
    const url = `${THINGSPEAK_URL_START_FRAGMENT}${channelId}` + `/feed.json?${encodeGetParams(getParams)}`;
    return url;
}

// day of form '2021-07-02'
export async function fetchLakeDay(day: string): Promise<DayResponse> {
    const startDayjs = dayjs(day);
    // Assert day is valid
    if (!startDayjs.isValid()) throw new Error(`Invalid day requested ${day}`);
    if (isBefore(startDayjs, dayjs(EARLIEST_RECORD)))
        throw new Error(`Invalid day requested ${day}, no data before ${EARLIEST_RECORD}`);

    const endDayJs = startDayjs.add(1, 'day');
    const start = dateToThingspeakDateString(startDayjs);
    const end = dateToThingspeakDateString(endDayJs);
    const url = dateRangeToUrl({ start, end }, channelId);
    console.log(`fetch`, url);
    const response = await fetch(url);
    const json: FieldResponse = await response.json() as FieldResponse;
    return { json, day };
}

export interface NumericValue {
    value: number;
}

export interface DayResponse {
    json: FieldResponse;
    /**
     * Date only string e.g. '2021-07-02'
     */
    day: string;
}
