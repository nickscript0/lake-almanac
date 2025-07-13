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

    xtest('Github Issue: tz func with valueOf bug', () => {
        // https://github.com/iamkun/dayjs/issues/1462#issuecomment-886705547
            
        /**
         * Sept 24, 2023: Something's weird in dayjs tz still I think: (This suggestion might be a workaround??? https://github.com/iamkun/dayjs/issues/1805)
         * This doesn't seem consistent, it treats timestamps differently than date strings
         *  > dayjs.tz('2021-10-31T13:19:36', 'Europe/Berlin').format()
            '2021-10-31T13:19:36+01:00'
            > dayjs.tz('2021-10-31T13:19:36', 'Europe/Berlin').toISOString()
            '2021-10-31T12:19:36.000Z'
            > dayjs.tz(ts, 'Europe/Berlin').format()
            '2021-10-31T13:19:36+01:00'
            > dayjs.tz(ts, 'Europe/Berlin').toISOString()
            '2021-10-31T12:19:36.303Z'
        */

        const ts = 1635682776303;
        const timezone = 'Europe/Berlin';

        const t1 = dayjs.tz(ts, timezone).toISOString(); //OK
        const a = dayjs.tz(ts, timezone).add(1, 'day');
        const t2 = a.toISOString(); //OK
        const t3 = dayjs.tz(a.valueOf(), timezone).toISOString(); //Incorrect

        // This isn't supposed to fail until t3 per the issue, not sure why it's failing here
        expect(t1).toBe('2021-10-31T13:19:36.303Z');
        expect(t2).toBe('2021-11-01T13:19:36.303Z');
        expect(t3).toBe('2021-11-01T14:19:36.303Z');
    });

    xtest('Github Issue: Timezone conversion is broken when not using DST Time', () => {
        /**
         * I revisited this test on Sept 24, 2023 and don't understand what it was testing.
         * It seemed to be incorrect before as using https://www.timeanddate.com/worldclock/converter.html?iso=20211130T224200&p1=286&p2=1440&p3=195
         * I have corrected it, and everything seems to work.
         */
    
        // JUL 13, 2025: THIS DONT PASS IN CALGARY, which makes sense as its starting with local time which is not 3h diff from UTC
        // These first 3 create a time in local timezone then compare to UTC. These pass fine
        const t1 = dayjs('2021-10-30').set('hour', 18).set('minute', 42).toISOString();
        expect(t1).toBe('2021-10-30T21:42:00.000Z');
    
        const t2 = dayjs('2021-10-31').set('hour', 18).set('minute', 42).toISOString();
        expect(t2).toBe('2021-10-31T21:42:00.000Z');
    
        const t3 = dayjs('2021-11-30').set('hour', 18).set('minute', 42).toISOString();
        expect(t3).toBe('2021-11-30T22:42:00.000Z');
    
        // These next 3 create a time in local timezone, convert to Paris tz, then compare to UTC. These also pass fine
        // Because the net result should be the same as the first 3.
        const t1Paris = dayjs('2021-10-30').set('hour', 18).set('minute', 42).tz('Europe/Paris');
        expect(t1Paris.toISOString()).toBe('2021-10-30T21:42:00.000Z');
    
        const t2Paris = dayjs('2021-10-31').set('hour', 18).set('minute', 42).tz('Europe/Paris');
        expect(t2Paris.toISOString()).toBe('2021-10-31T21:42:00.000Z');
    
        const t3Paris = dayjs('2021-11-30').set('hour', 18).set('minute', 42).tz('Europe/Paris');
        expect(t3Paris.toISOString()).toBe('2021-11-30T22:42:00.000Z');
    });
    
    test('Github Issue: Incorrect UTC offset when manipulating dayJS object (DST/STD change)', () => {
        let day = dayjs('2021-11-06').tz('Asia/Tel_Aviv').startOf('day');
        console.log(day.format('HH:mmZ'));
    
        // for (let i = 0; i < 48; i++) {
        //     day = day.add(1, 'hour');
        //     console.log(`Add ${i}h`, day.format('HH:mmZ'));
        // }
    });
});
