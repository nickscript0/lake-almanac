import { Dayjs } from 'dayjs';

/**
 * Date comparison functions are written from scratch using native date objects
 * due to weird `dayjs.isAfter` bug when using timezones. See README.md for more info.
 * // The following returns true, NOT as expected
 * console.log(dayjs.tz("2021-01-02 17:07:54", 'America/Vancouver').isAfter(dayjs.tz('2021-01-02 18:00:00', 'America/Vancouver')));
 */
export function isAfter(a: Dayjs, b: Dayjs) {
    return a.toDate().getTime() > b.toDate().getTime();
}

export function isBefore(a: Dayjs, b: Dayjs) {
    return a.toDate().getTime() < b.toDate().getTime();
}

export function isSame(a: Dayjs, b: Dayjs) {
    return a.toDate().getTime() === b.toDate().getTime();
}

// Difference in milliseconds
export function diffMs(a: Dayjs, b: Dayjs) {
    return a.toDate().getTime() - b.toDate().getTime();
}
