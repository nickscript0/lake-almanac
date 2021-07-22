import dayjs from 'https://cdn.skypack.dev/dayjs@1.10.6';
import dayjsTypes from 'https://deno.land/x/dayjs@v1.10.6/types/index.d.ts';

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
const OUTDOOR_TEMP_FIELD = 'field2';
// The earliest valid record for the lake Outdoor temp sensor
const EARLIEST_RECORD = '2018-10-06';

function encodeGetParams(params: { [key: string]: string | number }): string {
    return Object.entries(params)
        .map((kv) => kv.map(encodeURIComponent).join('='))
        .join('&');
}

export interface DateRange {
    start: string;
    end: string;
}

function dateToThingspeakDateString(d: dayjsTypes.Dayjs) {
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
export async function fetchLakeDay(day: string): Promise<TemperatureDay> {
    const startDayjs = dayjs(day);
    // Assert day is valid
    if (!startDayjs.isValid()) throw new Error(`Invalid day requested ${day}`);
    if (startDayjs.isBefore(EARLIEST_RECORD))
        throw new Error(`Invalid day requested ${day}, no data before ${EARLIEST_RECORD}`);

    const endDayJs = startDayjs.add(1, 'day');
    const start = dateToThingspeakDateString(startDayjs);
    const end = dateToThingspeakDateString(endDayJs);
    const url = dateRangeToUrl({ start, end }, channelId);
    console.log(`fetch`, url);
    const json: FieldResponse = await (await fetch(url)).json();
    return { readings: frToOutdoorReadingDay(json), day };
}

export interface NumericValue {
    value: number;
}

export type TemperatureReading = {
    date: dayjsTypes.Dayjs;
} & NumericValue;

export interface TemperatureDay {
    readings: TemperatureReading[];
    /**
     * Date only string e.g. '2021-07-02'
     */
    day: string;
}

function frToOutdoorReadingDay(fr: FieldResponse): TemperatureReading[] {
    return fr.feeds.map((f) => {
        const v = f[OUTDOOR_TEMP_FIELD];
        const value = v ? parseFloat(v) : NaN;
        return { date: dayjs(f.created_at), value };
    });
}
