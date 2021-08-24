import dayjsTypes from 'https://deno.land/x/dayjs@v1.10.6/types/index.d.ts';

/**
 * Date comparison functions are written from scratch using native date objects
 * due to weird `dayjs.isAfter` bug when using timezones. See README.md for more info.
 * // The following returns true, NOT as expected
 * console.log(dayjs.tz("2021-01-02 17:07:54", 'America/Vancouver').isAfter(dayjs.tz('2021-01-02 18:00:00', 'America/Vancouver')));
 */
export function isAfter(a: dayjsTypes.Dayjs, b: dayjsTypes.Dayjs) {
    return a.toDate().getTime() > b.toDate().getTime();
}

export function isBefore(a: dayjsTypes.Dayjs, b: dayjsTypes.Dayjs) {
    return a.toDate().getTime() < b.toDate().getTime();
}

export function isSame(a: dayjsTypes.Dayjs, b: dayjsTypes.Dayjs) {
    return a.toDate().getTime() === b.toDate().getTime();
}

// Difference in milliseconds
export function diffMs(a: dayjsTypes.Dayjs, b: dayjsTypes.Dayjs) {
    return a.toDate().getTime() - b.toDate().getTime();
}
