import dayjs from 'https://cdn.skypack.dev/dayjs@1.10.6';
import dayjsTypes from 'https://deno.land/x/dayjs@v1.10.6/types/index.d.ts';

import utc from 'https://cdn.skypack.dev/dayjs@1.10.6/plugin/utc';
import timezone from 'https://cdn.skypack.dev/dayjs@1.10.6/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

/**
 * The fixed timezone to perform date logic with, this makes most sense to be the tz where.
 * This makes most sense to be tz that the temperature readings are from.
 */
const TIMEZONE = 'America/Vancouver';
// This doesn't seem to do anything???
// dayjs.tz.setDefault(TIMEZONE);

import { exists } from 'https://deno.land/std@0.102.0/fs/mod.ts';

import { NumericValue, FieldResponse, DayResponse } from './thingspeak-sensor-api.ts';

const ALMANAC_PATH = 'output/lake-almanac.json';
// The size of metric sequences to store e.g., top N coldest days
const SEQUENCE_SIZE = 5;
const OUTDOOR_TEMP_FIELD = 'field2';

/**
 * Almanac Metrics:
 * - Sequences are always in asc order
 *   e.g. ColdestDays[0] is the coldest day, last(HottestDays) is the hottest
 * - All dates are in sensor time, Pacific Time
 */

// e.g. 2021 or All
type Year = string;
const ALL = 'All';
const seasons = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
type Season = typeof seasons[number];

export type Almanac = Record<Year, AlmanacYear>;

/**
 * All Hottest/Coldest metrics are sorted by asc temperature
 * FirstFreezes: sorted by asc date
 */
interface AlmanacYear {
    // Seasons
    Year: AlmanacSeason;
    Spring: AlmanacSeason;
    Summer: AlmanacSeason;
    Fall: AlmanacSeason;
    Winter: AlmanacSeason;

    // Sorted by Date asc
    FirstFreezesBeforeSummer: Sequence<Reading>;
    FirstFreezesAfterSummer: Sequence<Reading>;

    // LargestVariationDays: Sequence<Reading>;
}

interface AlmanacHiLows {
    HottestDays: Sequence<Reading>;
    ColdestDays: Sequence<Reading>;

    HottestNightime: Sequence<Reading>;
    ColdestNighttime: Sequence<Reading>;

    HottestDaytime: Sequence<Reading>;
    ColdestDaytime: Sequence<Reading>;
}

interface AlmanacAverages {
    Average: MovingAverage | undefined;
    AverageNighttime: MovingAverage | undefined;
    AverageDaytime: MovingAverage | undefined;

    AverageNoon: MovingAverage | undefined;
    AverageMidnight: MovingAverage | undefined;
}

type AlmanacSeason = AlmanacHiLows & AlmanacAverages;

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

export function frToOutdoorReadingDay(fr: FieldResponse): TemperatureReading[] {
    return fr.feeds.map((f) => {
        const v = f[OUTDOOR_TEMP_FIELD];
        const value = v ? parseFloat(v) : NaN;
        return { date: dayjs.tz(f.created_at, TIMEZONE), value };
    });
}

const EmptyAlmanacYear: AlmanacYear = {
    Year: EmptyAlmanacSeason(),
    Spring: EmptyAlmanacSeason(),
    Summer: EmptyAlmanacSeason(),
    Fall: EmptyAlmanacSeason(),
    Winter: EmptyAlmanacSeason(),

    FirstFreezesAfterSummer: [],
    FirstFreezesBeforeSummer: [],

    // LargestVariationDays: [],
};

function EmptyAlmanacSeason(): AlmanacSeason {
    return {
        HottestDays: [],
        ColdestDays: [],
        Average: undefined,

        HottestNightime: [],
        ColdestNighttime: [],
        AverageNighttime: undefined,

        HottestDaytime: [],
        ColdestDaytime: [],
        AverageDaytime: undefined,

        AverageNoon: undefined,
        AverageMidnight: undefined,
    };
}

type ReadingType = 'high' | 'low' | 'avg';

const AlmanacPropertyDesc: Record<keyof AlmanacSeason, ReadingType> = {
    HottestDays: 'high',
    ColdestDays: 'low',
    Average: 'avg',

    HottestNightime: 'high',
    ColdestNighttime: 'low',
    AverageNighttime: 'avg',
    HottestDaytime: 'high',
    ColdestDaytime: 'low',
    AverageDaytime: 'avg',

    AverageNoon: 'avg',
    AverageMidnight: 'avg',

    // LargestVariationDays: 'other',
};

type Sequence<T> = T[];
interface MovingAverage {
    average: number;
    // Number of points
    n: number;
}

type Reading = {
    // Of form '2021-07-02 14:22:55' in Pacific Time
    date: string;
} & NumericValue;

const last = <T>(arr: T[]) => arr[arr.length - 1];
const first = <T>(arr: T[]) => arr[0];

export async function processDay(response: DayResponse) {
    const alm = await getAlmanac();
    const temperatureDay = { readings: frToOutdoorReadingDay(response.json), day: response.day };
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

export function updateAlmanac(almanac: Almanac, temperatureDay: TemperatureDay) {
    const year = dayjs(temperatureDay.day).year().toString();
    if (!almanac[year]) almanac[year] = JSON.parse(JSON.stringify(EmptyAlmanacYear));
    if (!almanac[ALL]) almanac[ALL] = JSON.parse(JSON.stringify(EmptyAlmanacYear));

    temperatureDay.readings.sort(ascValueThenDateTempReadingSort);
    const { daytimeReadings, nighttimeReadings, afterSummerReadings, beforeSummerReadings } =
        getSubsetReadings(temperatureDay);
    const dailyMetrics = getDailyMetrics(temperatureDay, daytimeReadings, nighttimeReadings);

    console.log(`DEBUG daytimeReadings`, daytimeReadings.map(toReading));
    console.log(
        `DEBUG dailyMetrics.hiLows.ColdestDaytime`,
        dailyMetrics.hiLows.ColdestDaytime && toReading(dailyMetrics.hiLows.ColdestDaytime)
    );

    for (const [k, type] of Object.entries(AlmanacPropertyDesc)) {
        // We know key is 'keyof AlmanacMonth' but it's typing as string, I wonder why ts has this limitation?

        const season = getSeason(dayjs(temperatureDay.day));

        if (type === 'high' || type === 'low') {
            const key = k as keyof AlmanacHiLows;

            const metric = dailyMetrics.hiLows[key];
            if (metric) {
                // Year
                updateHiLowSequence(metric, almanac[year].Year[key], type);
                updateHiLowSequence(metric, almanac[ALL].Year[key], type);
                // Season
                updateHiLowSequence(metric, almanac[year][season][key], type);
                updateHiLowSequence(metric, almanac[ALL][season][key], type);
            }
        } else if (type === 'avg') {
            const key = k as keyof AlmanacAverages;
            const metric = dailyMetrics.averages[key];
            if (metric) {
                // Year
                almanac[year].Year[key] = combineMovingAverages(almanac[year].Year[key], metric);
                almanac[ALL].Year[key] = combineMovingAverages(almanac[ALL].Year[key], metric);
                // Season
                almanac[year][season][key] = combineMovingAverages(almanac[year][season][key], metric);
                almanac[ALL][season][key] = combineMovingAverages(almanac[ALL][season][key], metric);
            }
        }
    }

    // Freezes
    updateFirstFreezeSequence(firstFreeze(afterSummerReadings), almanac[year].FirstFreezesAfterSummer);
    updateFirstFreezeSequence(firstFreeze(beforeSummerReadings), almanac[year].FirstFreezesBeforeSummer);
}

function toReading(tr: TemperatureReading): Reading {
    return { date: tr.date.format('YYYY-MM-DD HH:mm:ssZ[Z]'), value: tr.value };
}

function dayjsToStr(d: dayjsTypes.Dayjs) {
    return d.format('YYYY-MM-DD HH:mm:ssZ[Z]');
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
        seq.sort(ascValueThenDateReadingSort);
    } else if (type !== 'high' && type !== 'low') {
        throw new Error(`${type} readings are not compatible with this function`);
    } else if (type === 'high' && reading.value > first(seq).value) {
        seq[0] = reading;
        seq.sort(ascValueThenDateReadingSort);
    } else if (type === 'low' && reading.value < last(seq).value) {
        seq[seq.length - 1] = reading;
        seq.sort(ascValueThenDateReadingSort);
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

interface DailyMetrics {
    hiLows: Record<keyof AlmanacHiLows, TemperatureReading | undefined>;
    averages: Record<keyof AlmanacAverages, MovingAverage | undefined>;
}

// Assumes ascValueSorted readings
function getDailyMetrics(
    temperatureDay: TemperatureDay,
    daytimeReadings: TemperatureReading[],
    nighttimeReadings: TemperatureReading[]
): DailyMetrics {
    const allReadings = temperatureDay.readings;

    return {
        hiLows: {
            HottestDays: last(allReadings),
            ColdestDays: first(allReadings),
            HottestDaytime: last(daytimeReadings),
            ColdestDaytime: first(daytimeReadings),
            HottestNightime: last(nighttimeReadings),
            ColdestNighttime: first(nighttimeReadings),
        },
        averages: {
            Average: allReadings.length > 0 ? valueAverage(allReadings) : undefined,
            AverageDaytime: daytimeReadings.length > 0 ? valueAverage(daytimeReadings) : undefined,

            AverageNighttime: daytimeReadings.length > 0 ? valueAverage(nighttimeReadings) : undefined,
            AverageMidnight:
                allReadings.length > 0
                    ? { average: findNearestReadingToTime(MIDNIGHT, allReadings).value, n: 1 }
                    : undefined,
            AverageNoon:
                allReadings.length > 0
                    ? { average: findNearestReadingToTime(NOON, allReadings).value, n: 1 }
                    : undefined,
        },
    };
}

function ascValueThenDateTempReadingSort(a: TemperatureReading, b: TemperatureReading) {
    if (a.value === b.value) {
        return new Date(a.date.toDate()).getTime() - new Date(b.date.toDate()).getTime();
    }
    return ascValueSort(a, b);
}

function ascValueThenDateReadingSort(a: Reading, b: Reading) {
    if (a.value === b.value) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return ascValueSort(a, b);
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

// Assumes sortAscValue readings
function getSubsetReadings(td: TemperatureDay) {
    // TODO: Pacific is [utc - 7], but this will be an hour off during daylight

    // 6am Pacific
    // const DAY_START = dayjs(`${td.day} 13:00:00-00:00Z`);
    const DAY_START: dayjsTypes.Dayjs = dayjs.tz(`${td.day} 06:00:00`, TIMEZONE);
    console.log(`DAY_START IS`, dayjsToStr(DAY_START));
    // 6pm Pacific
    const DAY_END = DAY_START.add(12, 'hour');
    const PREV_DAY_END = DAY_END.subtract(1, 'day');
    const NEXT_DAY_START = DAY_START.add(1, 'day');
    const SUMMER_SPLIT: dayjsTypes.Dayjs = dayjs.tz(`${td.day.split('-')[0]}-07-01`, TIMEZONE);

    const daytimeReadings: TemperatureReading[] = [];
    const nighttimeReadings: TemperatureReading[] = [];
    const afterSummerReadings: TemperatureReading[] = [];
    const beforeSummerReadings: TemperatureReading[] = [];

    for (const r of td.readings) {
        // Daytime / Nighttime
        if (
            (r.date.isAfter(DAY_START) || r.date.isSame(DAY_START)) &&
            (r.date.isBefore(DAY_END) || r.date.isSame(DAY_END))
        ) {
            // console.log(
            //     `DAYTIME READING`,
            //     toReading(r),
            //     `isAfter`,
            //     dayjsToStr(DAY_START),
            //     `isBefore`,
            //     dayjsToStr(DAY_END)
            // );
            daytimeReadings.push(r);
        } else if (
            (r.date.isAfter(DAY_END) && r.date.isBefore(NEXT_DAY_START)) ||
            (r.date.isBefore(DAY_START) && r.date.isAfter(PREV_DAY_END))
        ) {
            const a = r.date.isAfter(DAY_END) && r.date.isBefore(NEXT_DAY_START);
            const b = r.date.isBefore(DAY_START) && r.date.isAfter(PREV_DAY_END);
            if (r.value === 0.3125) {
                console.log(
                    `NIGHTTIME READING`,
                    dayjsToStr(r.date),
                    `isAfter`,
                    dayjsToStr(DAY_END),
                    r.date.isAfter(DAY_END),
                    `isBefore`,
                    dayjsToStr(DAY_START),
                    r.date.isBefore(DAY_START),
                    'conditions',
                    a,
                    b
                );
            }

            nighttimeReadings.push(r);
        }

        // After / Before Summer
        if (r.date.isBefore(SUMMER_SPLIT)) {
            beforeSummerReadings.push(r);
        } else {
            afterSummerReadings.push(r);
        }
    }
    return { daytimeReadings, nighttimeReadings, afterSummerReadings, beforeSummerReadings };
}

/**
 * Returns the Astronomical Season (the normal season definition used based on equinox and solstice)
 * The equinox/solstic always fall between two days in the next 10 years so we use the equinoxes and sostices for 2021
 * for a reasonable approximation.
 */
function getSeason(origDate: dayjsTypes.Dayjs): Season {
    // Normalize incoming date's year to the season boundaries year
    const d = origDate.set('year', 2021);
    const MARCH_EQUINOX: dayjsTypes.Dayjs = dayjs('2021-03-20 9:37:00-00:00Z');
    const JUNE_SOLSTICE: dayjsTypes.Dayjs = dayjs('2021-06-21 3:32:00-00:00Z');
    const SEPT_EQUINOX: dayjsTypes.Dayjs = dayjs('2021-09-22 19:21:00-00:00Z');
    const DEC_SOLSTICE: dayjsTypes.Dayjs = dayjs('2021-12-21 15:59:00-00:00Z');
    const NEXT_MARCH_EQUINOX: dayjsTypes.Dayjs = dayjs('2022-03-20 9:37:00-00:00Z');
    const PREV_DEC_SOLSTICE: dayjsTypes.Dayjs = dayjs('2020-12-21 15:59:00-00:00Z');

    if (d.isAfter(MARCH_EQUINOX.subtract(1, 'second')) && d.isBefore(JUNE_SOLSTICE)) return 'Spring';
    else if (d.isAfter(JUNE_SOLSTICE.subtract(1, 'second')) && d.isBefore(SEPT_EQUINOX)) return 'Summer';
    else if (d.isAfter(SEPT_EQUINOX.subtract(1, 'second')) && d.isBefore(DEC_SOLSTICE)) return 'Fall';
    else if (
        (d.isAfter(DEC_SOLSTICE.subtract(1, 'second')) && d.isBefore(NEXT_MARCH_EQUINOX)) ||
        (d.isAfter(PREV_DEC_SOLSTICE.subtract(1, 'second')) && d.isBefore(MARCH_EQUINOX))
    )
        return 'Winter';
    else {
        console.log(`Warning: getSeason(${d}) could not be categorized in a season`);
        return 'Spring';
    }
}

function cumulativeMovingAverage(tempReading: TemperatureReading, cma: MovingAverage): MovingAverage {
    const reading = toReading(tempReading);

    const n = cma.n + 1;
    const average = (reading.value + cma.n * cma.average) / n;
    return {
        average,
        n,
    };
}

/**
 * Combine two moving averages.
 */
function combineMovingAverages(
    cma1: MovingAverage | undefined,
    cma2: MovingAverage | undefined
): MovingAverage | undefined {
    if (cma1 === undefined) return cma2;
    if (cma2 === undefined) return cma1;

    const total1 = cma1.average * cma1.n;
    const total2 = cma2.average * cma2.n;
    const total = total1 + total2;
    const n = cma1.n + cma2.n;
    return {
        average: total / n,
        n,
    };
}

function valueAverage(readings: TemperatureReading[]): MovingAverage {
    let sum = 0;
    for (const r of readings) {
        sum += r.value;
    }
    return {
        average: sum / readings.length,
        n: readings.length,
    };
}

/**
 * Finds the nearest reading to a given time, useful for finding say mindnight and noon readings
 */
// const MIDNIGHT = dayjs('2001-01-01 00:00-07:00Z');
const MIDNIGHT = dayjs.tz(`2001-01-01 00:00`, TIMEZONE);
// const NOON = dayjs('2001-01-01 12:00-07:00Z');
const NOON = dayjs.tz('2001-01-01 12:00', TIMEZONE);
function findNearestReadingToTime(findDate: dayjsTypes.Dayjs, readings: TemperatureReading[]): TemperatureReading {
    const normalize = (d: dayjsTypes.Dayjs) => d.set('year', 2001).set('month', 1).date(1);
    const desiredTime = normalize(findDate);
    let closest = readings[0];
    for (const r of readings) {
        const curTime = normalize(r.date);
        const closestTime = normalize(closest.date);

        if (Math.abs(curTime.diff(desiredTime, 'ms')) < Math.abs(closestTime.diff(desiredTime, 'ms'))) {
            closest = r;
        }
    }
    return closest;
}
