import * as fs from 'fs';
import { TemperatureDay, TemperatureReading } from './thingspeak-sensor-api';
import dayjs from 'dayjs';
const ALMANAC_PATH = 'mabel-almanac.json';

/**
 * Almanac Metrics:
 * - Sequences are in descending order with the most as the first index
 *   e.g. ColdesDays[0] is the coldest day
 * - All dates are in sensor time, Pacific Time
 */

// e.g. 2021
type Year = string;
type Almanac = Record<Year, AlmanacYear>;

interface AlmanacYear {
    HottestDays: Sequence<Reading>;
    ColdestDays: Sequence<Reading>;

    HottestNightime: Sequence<Reading>;
    ColdestNighttime: Sequence<Reading>;
    HottestDaytime: Sequence<Reading>;
    ColdestDaytime: Sequence<Reading>;

    FirstFreezes: Sequence<Reading>;

    LargestVariationDays: Sequence<Reading>;
}

const EmptyAlmanacYear: AlmanacYear = {
    HottestDays: [],
    ColdestDays: [],

    HottestNightime: [],
    ColdestNighttime: [],
    HottestDaytime: [],
    ColdestDaytime: [],

    FirstFreezes: [],

    LargestVariationDays: [],
};

type Sequence<T> = T[];

interface Reading {
    name: string;
    value: number;
    // Of form '2021-07-02 14:22:55' in Pacific Time
    date: string;
}

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
}

function getMetrics(temperatureDay: TemperatureDay) {
    const allReadings = temperatureDay.readings;
    allReadings.sort(ascNumericSort);
    const { daytimeReadings, nighttimeReadings } = getDayNightReadings(temperatureDay);

    const last = <T>(arr: T[]) => arr[arr.length - 1];
    const first = <T>(arr: T[]) => arr[0];

    return {
        hottest: last(allReadings),
        coldest: first(allReadings),
        hottestDaytime: last(daytimeReadings),
        coldestDaytime: first(daytimeReadings),
        hottestNighttime: last(nighttimeReadings),
        coldestNighttime: first(nighttimeReadings),
        freeze: firstFreeze(allReadings),
    };
}

function ascNumericSort(a: TemperatureReading, b: TemperatureReading) {
    return a.value - b.value;
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
