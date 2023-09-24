/**
 * deno test --allow-read --allow-write --unstable src/test/dayjs-test.ts
 */

import { assertEquals } from 'https://deno.land/std@0.102.0/testing/asserts.ts';

import dayjs from 'https://cdn.skypack.dev/dayjs@1.11.10';
import dayjsTypes from 'https://deno.land/x/dayjs@v1.10.6/types/index.d.ts';

import utc from 'https://cdn.skypack.dev/dayjs@1.11.10/plugin/utc';
import timezone from 'https://cdn.skypack.dev/dayjs@1.11.10/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

Deno.test('Github Issue: tz func should preserve offset in January', () => {
    // https://github.com/iamkun/dayjs/issues/1462#issue-860806969
    const t1 = dayjs.tz('2021-01-01', 'Europe/Madrid').format();
    // "2021-01-01T00:00:00+01:00" - OK

    const t2 = dayjs.tz('2021-01-01', 'Europe/Madrid').tz('Europe/Madrid').format();

    assertEquals(t1, t2);
});

Deno.test('Github Issue: tz func should preserve offset in June', () => {
    // https://github.com/iamkun/dayjs/issues/1462#issue-860806969
    const t1 = dayjs.tz('2021-06-01', 'Europe/Madrid').format();
    // "2021-06-01T00:00:00+02:00" - OK

    const t2 = dayjs.tz('2021-06-01', 'Europe/Madrid').tz('Europe/Madrid').format();
    // "2021-06-01T00:00:00+02:00" - OK
    assertEquals(t1, t2);
});

Deno.test('Github Issue: tz func with valueOf bug', () => {
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
    assertEquals(t1, '2021-10-31T13:19:36.303Z');
    assertEquals(t2, '2021-11-01T13:19:36.303Z');
    assertEquals(t3, '2021-11-01T14:19:36.303Z');
});

Deno.test('Minimal ADT bug', () => {
    /**
     * This is the minimal example of the dayjs.tz plugin failing during DST described in the README.
     * This test likely only fails during DST, as it is currently passing on Nov 10, 2022 (Atlantic Standard Time), but will fail
     * when I run it in an Ubuntu VM with the system time set to Sept 10, 2022.
     */
    const d1 = '2021-01-02 17:07:54';
    const d2 = '2021-01-02 18:00:00';

    // Server in AST returns false, UTC returns false
    assertEquals(false, dayjs(d1).isAfter(dayjs(d2)));
    // Server in AST returns true, UTC returns false
    assertEquals(false, dayjs.tz(d1, 'America/Vancouver').isAfter(dayjs.tz(d2, 'America/Vancouver')));
    // Server in AST returns false, UTC returns flase
    assertEquals(false, dayjs(d1).tz('America/Vancouver').isAfter(dayjs(d2).tz('America/Vancouver')));
});

Deno.test('Github Issue: Timezone conversion is broken when not using DST Time', () => {
    /**
     * I revisited this test on Sept 24, 2023 and don't understand what it was testing.
     * It seemed to be incorrect before as using https://www.timeanddate.com/worldclock/converter.html?iso=20211130T224200&p1=286&p2=1440&p3=195
     * I have corrected it, and everything seems to work.
     */

    // These first 3 create a time in local timezone then compare to UTC. These pass fine
    const t1 = dayjs('2021-10-30').set('hour', 18).set('minute', 42).toISOString();
    assertEquals('2021-10-30T21:42:00.000Z', t1);

    const t2 = dayjs('2021-10-31').set('hour', 18).set('minute', 42).toISOString();
    assertEquals('2021-10-31T21:42:00.000Z', t2);

    const t3 = dayjs('2021-11-30').set('hour', 18).set('minute', 42).toISOString();
    assertEquals('2021-11-30T22:42:00.000Z', t3);

    // These next 3 create a time in local timezone, convert to Paris tz, then compare to UTC. These also pass fine
    // Because the net result should be the same as the first 3.
    const t1Paris = dayjs('2021-10-30').set('hour', 18).set('minute', 42).tz('Europe/Paris');
    assertEquals('2021-10-30T21:42:00.000Z', t1Paris.toISOString());

    const t2Paris = dayjs('2021-10-31').set('hour', 18).set('minute', 42).tz('Europe/Paris');
    assertEquals('2021-10-31T21:42:00.000Z', t2Paris.toISOString());

    const t3Paris = dayjs('2021-11-30').set('hour', 18).set('minute', 42).tz('Europe/Paris');
    assertEquals('2021-11-30T22:42:00.000Z', t3Paris.toISOString());
});

Deno.test('Github Issue: Incorrect UTC offset when manipulating dayJS object (DST/STD change)', () => {
    let day = dayjs('2021-11-06').tz('Asia/Tel_Aviv').startOf('day');
    console.log(day.format('HH:mmZ'));

    // for (let i = 0; i < 48; i++) {
    //     day = day.add(1, 'hour');
    //     console.log(`Add ${i}h`, day.format('HH:mmZ'));
    // }
});
