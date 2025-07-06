import { Dayjs } from 'dayjs';
import { NumericValue } from './thingspeak-sensor-api';

export type Year = string;
export const ALL = 'All';
export const seasons = ['Spring', 'Summer', 'Fall', 'Winter'] as const;
export type Season = (typeof seasons)[number];

export interface AlmanacMetadata {
    startDate?: string; // First day with data (YYYY-MM-DD)
    endDate?: string; // Last day with data (YYYY-MM-DD)
    missedDays: string[]; // Array of missed days (YYYY-MM-DD)
}

export type Almanac = Record<Year, AlmanacYear>;

export interface AlmanacWithMetadata {
    _metadata?: AlmanacMetadata;
    [year: string]: AlmanacYear | AlmanacMetadata | undefined;
}

export interface AlmanacYear {
    Year: AlmanacSeason;
    Spring: AlmanacSeason;
    Summer: AlmanacSeason;
    Fall: AlmanacSeason;
    Winter: AlmanacSeason;

    FirstFreezesBeforeSummer: Sequence<Reading>;
    FirstFreezesAfterSummer: Sequence<Reading>;
    LastFreezesBeforeSummer: Sequence<Reading>;
}

export interface AlmanacHiLows {
    HottestDays: Sequence<Reading>;
    ColdestDays: Sequence<Reading>;

    HottestNightime: Sequence<Reading>;
    ColdestNighttime: Sequence<Reading>;

    HottestDaytime: Sequence<Reading>;
    ColdestDaytime: Sequence<Reading>;
}

export interface AlmanacAverages {
    Average: MovingAverage | undefined;
    AverageNighttime: MovingAverage | undefined;
    AverageDaytime: MovingAverage | undefined;

    AverageNoon: MovingAverage | undefined;
    AverageMidnight: MovingAverage | undefined;
}

export type AlmanacSeason = AlmanacHiLows & AlmanacAverages;

export type TemperatureReading = {
    date: Dayjs;
} & NumericValue;

export interface TemperatureDay {
    readings: TemperatureReading[];
    day: string;
}

export type Sequence<T> = T[];

export interface MovingAverage {
    average: number;
    n: number;
}

export type Reading = {
    date: string;
} & NumericValue;

export type ReadingType = 'high' | 'low' | 'avg';

export interface DailyMetrics {
    hiLows: Record<keyof AlmanacHiLows, TemperatureReading | undefined>;
    averages: Record<keyof AlmanacAverages, MovingAverage | undefined>;
}
