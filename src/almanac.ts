import dayjs from 'https://cdn.skypack.dev/dayjs@1.10.6';
import { exists } from 'https://deno.land/std@0.102.0/fs/mod.ts';

import { NumericValue, TemperatureDay, TemperatureReading } from './thingspeak-sensor-api.ts';

const ALMANAC_PATH = 'lake-almanac.json';
// The size of metric sequences to store e.g., top N coldest days
const SEQUENCE_SIZE = 5;

/**
 * Almanac Metrics:
 * - Sequences are in descending order with the most as the first index
 *   e.g. ColdesDays[0] is the coldest day
 * - All dates are in sensor time, Pacific Time
 */

// e.g. 2021 or All
type Year = string;
const ALL = 'All';
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

    FirstFreezesBeforeSummer: Sequence<Reading>;
    FirstFreezesAfterSummer: Sequence<Reading>;

    // LargestVariationDays: Sequence<Reading>;
}

const EmptyAlmanacYear: AlmanacYear = {
    HottestDays: [],
    ColdestDays: [],

    HottestNightime: [],
    ColdestNighttime: [],
    HottestDaytime: [],
    ColdestDaytime: [],

    FirstFreezesAfterSummer: [],
    FirstFreezesBeforeSummer: [],

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

    FirstFreezesAfterSummer: 'other',
    FirstFreezesBeforeSummer: 'other',
    // LargestVariationDays: 'other',
};

type Sequence<T> = T[];

type Reading = {
    // Of form '2021-07-02 14:22:55' in Pacific Time
    date: string;
} & NumericValue;

const last = <T>(arr: T[]) => arr[arr.length - 1];
const first = <T>(arr: T[]) => arr[0];
// const fileExists = async (path: string) => !!(await fs.promises.stat(path).catch((e) => false));
// const fileExists(filePath).then((result : boolean) => console.log(result))

export async function processDay(temperatureDay: TemperatureDay) {
    const alm = await getAlmanac();
    updateAlmanac(alm, temperatureDay);
    await Deno.writeTextFile(ALMANAC_PATH, JSON.stringify(alm, undefined, 2));
    console.log(`Wrote`, ALMANAC_PATH);
}

async function getAlmanac(): Promise<Almanac> {
    if (await exists(ALMANAC_PATH)) {
        return JSON.parse(await Deno.readTextFile(ALMANAC_PATH));
    } else {
        return {};
    }
}

function updateAlmanac(almanac: Almanac, temperatureDay: TemperatureDay) {
    const year = dayjs(temperatureDay.day).year().toString();
    if (!almanac[year]) almanac[year] = JSON.parse(JSON.stringify(EmptyAlmanacYear));
    if (!almanac[ALL]) almanac[ALL] = JSON.parse(JSON.stringify(EmptyAlmanacYear));

    const metrics = getMetrics(temperatureDay);

    for (const [k, type] of Object.entries(AlmanacPropertyDesc)) {
        // We know key is 'keyof AlmanacYear' but it's typing as string, I wonder why ts has this limitation?
        const key = k as keyof AlmanacYear;
        const metric = metrics[key];
        if (type === 'other') {
            if (key === 'FirstFreezesAfterSummer' || key === 'FirstFreezesBeforeSummer') {
                updateFirstFreezeSequence(metric, almanac[year][key]);
                // Skip first freezes for 'ALL' as doesn't make sense
            } else {
                throw new Error(`No handler defined for ${key}`);
            }
        } else {
            if (metric !== undefined) {
                updateHiLowSequence(metric, almanac[year][key], type);
                updateHiLowSequence(metric, almanac[ALL][key], type);
            }
        }
    }
}

function toReading(tr: TemperatureReading): Reading {
    return { date: tr.date.format('YYYY-MM-DD HH:mm:ssZ[Z]'), value: tr.value };
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

    // Skip if already exists
    if (seq.some((e) => e.date === reading.date && e.value === reading.value)) {
        return seq;
    }
    if (seq.length < SEQUENCE_SIZE) {
        seq.push(reading);
        seq.sort(ascValueSort);
    } else if (type !== 'high' && type !== 'low') {
        throw new Error(`${type} readings are not compatible with this function`);
    } else if (type === 'high' && reading.value > first(seq).value) {
        seq[0] = reading;
        seq.sort(ascValueSort);
    } else if (type === 'low' && reading.value < last(seq).value) {
        seq[seq.length - 1] = reading;
        seq.sort(ascValueSort);
    }
    return seq;
}

function updateFirstFreezeSequence(tempReading: TemperatureReading | undefined, seq: Sequence<Reading>) {
    if (tempReading) {
        const reading = toReading(tempReading);
        // Skip if already exists
        if (seq.some((e) => e.date === reading.date && e.value === reading.value)) {
            return seq;
        }

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
    const { daytimeReadings, nighttimeReadings, afterSummerReadings, beforeSummerReadings } =
        getSubsetReadings(temperatureDay);

    return {
        HottestDays: last(allReadings),
        ColdestDays: first(allReadings),
        HottestDaytime: last(daytimeReadings),
        ColdestDaytime: first(daytimeReadings),
        HottestNightime: last(nighttimeReadings),
        ColdestNighttime: first(nighttimeReadings),
        FirstFreezesAfterSummer: firstFreeze(afterSummerReadings),
        FirstFreezesBeforeSummer: firstFreeze(beforeSummerReadings),
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

function getSubsetReadings(td: TemperatureDay) {
    // TODO: Pacific is [utc - 7], but this will be an hour off during daylight

    // 6am Pacific
    const DAY_START = dayjs(`${td.day} 13:00:00-00:00Z`);
    // 6pm Pacific
    const DAY_END = DAY_START.add(12, 'hour');
    const PREV_DAY_END = DAY_END.subtract(1, 'day');
    const NEXT_DAY_START = DAY_START.add(1, 'day');
    const SUMMER_SPLIT = dayjs(`${td.day.split('-')[0]}-07-01`);

    const daytimeReadings: TemperatureReading[] = [];
    const nighttimeReadings: TemperatureReading[] = [];
    const afterSummerReadings: TemperatureReading[] = [];
    const beforeSummerReadings: TemperatureReading[] = [];
    for (const r of td.readings) {
        if (
            (r.date.isAfter(DAY_START) || r.date.isSame(DAY_START)) &&
            (r.date.isBefore(DAY_END) || r.date.isSame(DAY_END))
        ) {
            daytimeReadings.push(r);
        } else if (
            (r.date.isAfter(DAY_END) && r.date.isBefore(NEXT_DAY_START)) ||
            (r.date.isBefore(DAY_START) && r.date.isAfter(PREV_DAY_END))
        ) {
            nighttimeReadings.push(r);
        }

        if (r.date.isBefore(SUMMER_SPLIT)) {
            beforeSummerReadings.push(r);
        } else {
            afterSummerReadings.push(r);
        }
    }
    return { daytimeReadings, nighttimeReadings, afterSummerReadings, beforeSummerReadings };
}
