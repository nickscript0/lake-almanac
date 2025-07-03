import * as dateFns from 'date-fns';
import * as dateFnsTz from 'date-fns-tz';
import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('date-fns comparison tests', () => {
    test('date-fns isAfter equivalent', () => {
        const d1 = '2021-01-02 17:07:54';
        const d2 = '2021-01-02 18:00:00';
        const tz = 'America/Vancouver';

        // date-fns approach
        const date1 = dateFnsTz.fromZonedTime(d1, tz);
        const date2 = dateFnsTz.fromZonedTime(d2, tz);
        const dateFnsResult = dateFns.isAfter(date1, date2);

        // dayjs approach
        const dayjs1 = dayjs.tz(d1, tz);
        const dayjs2 = dayjs.tz(d2, tz);
        const dayjsResult = dayjs1.isAfter(dayjs2);

        // Both should return false (d1 is before d2)
        expect(dateFnsResult).toBe(false);
        expect(dayjsResult).toBe(false);
        expect(dateFnsResult).toBe(dayjsResult);
    });

    test('Dayjs timezone comparison', () => {
        const d1 = '2021-01-02 17:07:54';
        const d2 = '2021-01-02 18:00:00';
        const tz = 'America/Vancouver';

        const dayjs1 = dayjs.tz(d1, tz);
        const dayjs2 = dayjs.tz(d2, tz);

        expect(dayjs1.isBefore(dayjs2)).toBe(true);
        expect(dayjs1.isAfter(dayjs2)).toBe(false);
        expect(dayjs1.isSame(dayjs2)).toBe(false);

        const diffMinutes = dayjs2.diff(dayjs1, 'minute');
        expect(diffMinutes).toBeGreaterThan(0);
        expect(diffMinutes).toBe(52); // Approximately 52 minutes difference
    });
});