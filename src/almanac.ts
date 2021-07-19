import * as fs from 'fs';
import { NumericValue, TemperatureDay, TemperatureReading } from './thingspeak-sensor-api';
import dayjs from 'dayjs';

const ALMANAC_PATH = 'mabel-almanac.json';
// The size of metric sequences to store e.g., top N coldest days
const SEQUENCE_SIZE = 5;

/**
 * Almanac Metrics:
 * - Sequences are in descending order with the most as the first index
 *   e.g. ColdesDays[0] is the coldest day
 * - All dates are in sensor time, Pacific Time
 */

// e.g. 2021
type Year = string;
type Almanac = Record<Year, AlmanacYear>;

/**
 * All Hottest/Coldest metrics are sorted by asc temperature
 * FirstFreezes: sorted by asc date
 */
interface AlmanacYear {
    HottestDays: Sequence<Reading>;
    ColdestDays: Sequence<Reading>;

    HottestNightime: Sequence<Reading>;
    ColdestNighttime: Sequence<Reading>;
    HottestDaytime: Sequence<Reading>;
    ColdestDaytime: Sequence<Reading>;

    FirstFreezes: Sequence<Reading>;

    // LargestVariationDays: Sequence<Reading>;
}

const EmptyAlmanacYear: AlmanacYear = {
    HottestDays: [],
    ColdestDays: [],

    HottestNightime: [],
    ColdestNighttime: [],
    HottestDaytime: [],
    ColdestDaytime: [],

    FirstFreezes: [],

    // LargestVariationDays: [],
};

type ReadingType = 'high' | 'low' | 'other';

const AlmanacPropertyDesc: Record<keyof AlmanacYear, ReadingType> = {
    HottestDays: 'high',
    ColdestDays: 'low',

    HottestNightime: 'high',
    ColdestNighttime: 'low',
    HottestDaytime: 'high',
    ColdestDaytime: 'low',

    FirstFreezes: 'other',
    // LargestVariationDays: 'other',
};

type Sequence<T> = T[];

type Reading = {
    // Of form '2021-07-02 14:22:55' in Pacific Time
    date: string;
} & NumericValue;

const last = <T>(arr: T[]) => arr[arr.length - 1];
const first = <T>(arr: T[]) => arr[0];
const fileExists = async (path: string) => !!(await fs.promises.stat(path).catch((e) => false));

async function getAlmanac(): Promise<Almanac> {
    if (fileExists(ALMANAC_PATH)) {
        return JSON.parse(await fs.promises.readFile(ALMANAC_PATH, 'utf-8'));
    } else {
        return {};
    }
}

async function updateAlmanac(almanac: Almanac, temperatureDay: TemperatureDay) {
    const year = dayjs(temperatureDay.day).year().toString();
    if (!almanac[year]) almanac[year] = JSON.parse(JSON.stringify(EmptyAlmanacYear));

    const metrics = getMetrics(temperatureDay);

    for (const [k, type] of Object.entries(AlmanacPropertyDesc)) {
        // We know key is 'keyof AlmanacYear' but it's typing as string, I wonder why ts has this limitation?
        const key = k as keyof AlmanacYear;
        const metric = metrics[key];
        if (type === 'other') {
            if (key === 'FirstFreezes') updateFirstFreezeSequence(metric, almanac[year][key]);
        } else {
            if (metric !== undefined) {
                updateHiLowSequence(metric, almanac[year][key], type);
            }
        }
    }
}

function toReading(tr: TemperatureReading): Reading {
    return { date: tr.date.toString(), value: tr.value };
}

/**
 * All Sequences are assumed sorted in asc order by `value`
 * For 'high' type, add the reading if it is higher than the 1st element
 * For 'low' type, add the reading if it is lower than the last element
 * @param tempReading
 * @param seq
 * @param asc
 */
function updateHiLowSequence(tempReading: TemperatureReading, seq: Sequence<Reading>, type: ReadingType) {
    const reading = toReading(tempReading);
    if (seq.length < SEQUENCE_SIZE) {
        seq.push(reading);
        seq.sort(ascValueSort);
    } else if (type === 'high' && reading.value > first(seq).value) {
        seq[0] = reading;
        seq.sort(ascValueSort);
    } else if (type === 'low' && reading.value < last(seq).value) {
        seq[seq.length - 1] = reading;
        seq.sort(ascValueSort);
    } else {
        throw new Error(`${type} readings are not compatible with this function`);
    }
    return seq;
}

function updateFirstFreezeSequence(tempReading: TemperatureReading | undefined, seq: Sequence<Reading>) {
    if (tempReading) {
        const reading = toReading(tempReading);
        if (seq.length < SEQUENCE_SIZE) {
            seq.push(reading);
            seq.sort(ascDateSort);
        } else if (tempReading.date.isBefore(last(seq).date)) {
            seq[seq.length - 1] = reading;
            seq.sort(ascDateSort);
        }
    }
    return seq;
}

function getMetrics(temperatureDay: TemperatureDay): Record<keyof AlmanacYear, TemperatureReading | undefined> {
    const allReadings = temperatureDay.readings;
    allReadings.sort(ascValueSort);
    const { daytimeReadings, nighttimeReadings } = getDayNightReadings(temperatureDay);

    return {
        HottestDays: last(allReadings),
        ColdestDays: first(allReadings),
        HottestDaytime: last(daytimeReadings),
        ColdestDaytime: first(daytimeReadings),
        HottestNightime: last(nighttimeReadings),
        ColdestNighttime: first(nighttimeReadings),
        FirstFreezes: firstFreeze(allReadings),
        // LargestVariationDays: ???
    };
}

function ascValueSort(a: NumericValue, b: NumericValue) {
    return a.value - b.value;
}

function ascDateSort(a: Reading, b: Reading) {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
}

function firstFreeze(ascReadings: TemperatureReading[]) {
    for (const r of ascReadings) {
        if (r.value <= 0) {
            return r;
        }
    }
    return undefined;
}

function getDayNightReadings(td: TemperatureDay) {
    const DAY_START = dayjs(`${td.day} 06:00`);
    const DAY_END = dayjs(`${td.day} 18:00`);

    const daytimeReadings: TemperatureReading[] = [];
    const nighttimeReadings: TemperatureReading[] = [];
    for (const r of td.readings) {
        if (
            (r.date.isAfter(DAY_START) || r.date.isSame(DAY_START)) &&
            (r.date.isBefore(DAY_END) || r.date.isSame(DAY_END))
        ) {
            daytimeReadings.push(r);
        } else if (r.date.isAfter(DAY_END) || r.date.isBefore(DAY_START)) {
            nighttimeReadings.push(r);
        }
    }
    return { daytimeReadings, nighttimeReadings };
}
