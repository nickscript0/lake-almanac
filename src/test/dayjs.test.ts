/**
 * Tests for the dayjs timezone bug described in the README.
 */

import dayjs, { Dayjs } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

describe('dayjs timezone tests', () => {
    test('Github Issue #1 - dayjs.tz().isAfter() returns incorrect result during DST', () => {
        /**
         * This is the minimal example of the dayjs.tz plugin failing during DST described in the README.
         * This test likely only fails during DST, as it is currently passing on Nov 10, 2022 (Atlantic Standard Time), confirmed yes failing on Aug 27, 2023 (ADT).
         */
        const d1 = '2021-01-02 17:07:54';
        const d2 = '2021-01-02 18:00:00';

        // Server in AST returns false, UTC returns false
        expect(dayjs(d1).isAfter(dayjs(d2))).toBe(false);
        // Server in AST returns true, UTC returns false
        expect(dayjs.tz(d1, 'America/Vancouver').isAfter(dayjs.tz(d2, 'America/Vancouver'))).toBe(false);
        // Server in AST returns false, UTC returns false
        expect(dayjs(d1).tz('America/Vancouver').isAfter(dayjs(d2).tz('America/Vancouver'))).toBe(false);
    });

    test('Github Issue #1 - dayjs.tz().isBefore() returns incorrect result during DST', () => {
        const d1 = '2021-01-02 17:07:54';
        const d2 = '2021-01-02 18:00:00';

        // Server in AST returns true, UTC returns true
        expect(dayjs(d1).isBefore(dayjs(d2))).toBe(true);
        // Server in AST returns false, UTC returns true
        expect(dayjs.tz(d1, 'America/Vancouver').isBefore(dayjs.tz(d2, 'America/Vancouver'))).toBe(true);
        // Server in AST returns true, UTC returns true
        expect(dayjs(d1).tz('America/Vancouver').isBefore(dayjs(d2).tz('America/Vancouver'))).toBe(true);
    });

    test('Github Issue #1 - dayjs.tz().isSame() returns incorrect result during DST', () => {
        const d1 = '2021-01-02 17:07:54';
        const d2 = '2021-01-02 17:07:54';

        // Server in AST returns true, UTC returns true
        expect(dayjs(d1).isSame(dayjs(d2))).toBe(true);
        // Server in AST returns true, UTC returns true
        expect(dayjs.tz(d1, 'America/Vancouver').isSame(dayjs.tz(d2, 'America/Vancouver'))).toBe(true);
        // Server in AST returns true, UTC returns true
        expect(dayjs(d1).tz('America/Vancouver').isSame(dayjs(d2).tz('America/Vancouver'))).toBe(true);
    });

    test('Minimal ADT bug', () => {
        /**
         * This is the minimal example of the dayjs.tz plugin failing during DST described in the README.
         * This test likely only fails during DST, as it is currently passing on Nov 10, 2022 (Atlantic Standard Time), confirmed yes failing on Aug 27, 2023 (ADT).
         */
        const d1 = '2021-01-02 17:07:54';
        const d2 = '2021-01-02 18:00:00';

        // Server in AST returns false, UTC returns false
        expect(dayjs(d1).isAfter(dayjs(d2))).toBe(false);
        // Server in AST returns true, UTC returns false
        expect(dayjs.tz(d1, 'America/Vancouver').isAfter(dayjs.tz(d2, 'America/Vancouver'))).toBe(false);
        // Server in AST returns false, UTC returns false
        expect(dayjs(d1).tz('America/Vancouver').isAfter(dayjs(d2).tz('America/Vancouver'))).toBe(false);
    });

    test('Github Issue #1 - dayjs.tz().diff() returns incorrect result during DST', () => {
        const d1 = '2021-01-02 17:07:54';
        const d2 = '2021-01-02 18:00:00';

        const diff1 = dayjs(d2).diff(dayjs(d1), 'minute');
        const diff2 = dayjs.tz(d2, 'America/Vancouver').diff(dayjs.tz(d1, 'America/Vancouver'), 'minute');
        const diff3 = dayjs(d2).tz('America/Vancouver').diff(dayjs(d1).tz('America/Vancouver'), 'minute');

        // All should return the same positive difference
        expect(diff1).toBeGreaterThan(0);
        expect(diff2).toBeGreaterThan(0);
        expect(diff3).toBeGreaterThan(0);
        expect(diff1).toBe(diff2);
        expect(diff1).toBe(diff3);
    });
});