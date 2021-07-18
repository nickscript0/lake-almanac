const FILENAME = 'mabel-almanac.json';

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

type Sequence<T> = [T, T, T, T, T];

interface Reading {
    name: string;
    value: number;
    // Of form '2021-07-02 14:22:55' in Pacific Time
    date: string;
}

