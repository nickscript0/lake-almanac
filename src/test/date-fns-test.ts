import * as dateFns from 'https://cdn.skypack.dev/date-fns@^2.29.3';
import * as dateFnsTz from 'https://cdn.skypack.dev/date-fns-tz@1.3.7';
import { assertEquals } from 'https://deno.land/std@0.102.0/testing/asserts.ts';

import dayjs from 'https://cdn.skypack.dev/dayjs@1.11.6';
import dayjsTypes from 'https://deno.land/x/dayjs@v1.10.6/types/index.d.ts';

import utc from 'https://cdn.skypack.dev/dayjs@1.11.6/plugin/utc';
import timezone from 'https://cdn.skypack.dev/dayjs@1.11.6/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);

Deno.test('date-fns: Minimal ADT bug', () => {
    /**
     * This is the minimal example of the dayjs.tz plugin failing during DST described in the README.
     * This test likely only fails during DST, as it is currently passing on Nov 10, 2022 (Atlantic Standard Time), but will fail
     * when I run it in an Ubuntu VM with the system time set to Sept 10, 2022.
     */
    const d1 = new Date('2021-01-02 17:07:54');
    const d2 = new Date('2021-01-02 18:00:00');

    // Server in AST returns false, UTC returns false
    assertEquals(false, dateFns.isAfter(d1, d2));
    assertEquals(true, dateFns.isAfter(d2, d1));
    // Server in AST returns true, UTC returns false
    assertEquals(
        false,
        dateFns.isAfter(
            dateFnsTz.__moduleExports.utcToZonedTime(d1, 'America/Vancouver'),
            dateFnsTz.__moduleExports.utcToZonedTime(d2, 'America/Vancouver')
        )
    );
    assertEquals(
        true,
        dateFns.isAfter(
            dateFnsTz.__moduleExports.utcToZonedTime(d2, 'America/Vancouver'),
            dateFnsTz.__moduleExports.utcToZonedTime(d1, 'America/Vancouver')
        )
    );

    const formatString = 'yyyy-MM-dd HH:mm:ss xxx';
    console.log(dateFns.format(d1, formatString));
    console.log(dateFns.format(dateFnsTz.__moduleExports.utcToZonedTime(d1, 'America/Vancouver'), formatString));
    console.log(dateFns.format(d2, formatString));
    console.log(dateFns.format(dateFnsTz.__moduleExports.utcToZonedTime(d2, 'America/Vancouver'), formatString));
});

Deno.test('Dayjs: Minimal ADT bug', () => {
    /**
     * This is the minimal example of the dayjs.tz plugin failing during DST described in the README.
     * This test likely only fails during DST, as it is currently passing on Nov 10, 2022 (Atlantic Standard Time), but will fail
     * when I run it in an Ubuntu VM with the system time set to Sept 10, 2022.
     */
    const d1 = '2021-01-02 17:07:54';
    const d2 = '2021-01-02 18:00:00';

    // Server in AST returns false, UTC returns false
    assertEquals(false, dayjs(d1).isAfter(dayjs(d2)));
    assertEquals(true, dayjs(d2).isAfter(dayjs(d1)));
    // Server in AST returns true, UTC returns false
    assertEquals(false, dayjs.tz(d1, 'America/Vancouver').isAfter(dayjs.tz(d2, 'America/Vancouver')));
    assertEquals(true, dayjs.tz(d2, 'America/Vancouver').isAfter(dayjs.tz(d1, 'America/Vancouver')));
    // Server in AST returns false, UTC returns flase
    assertEquals(false, dayjs.utc(d1).tz('America/Vancouver').isAfter(dayjs.utc(d2).tz('America/Vancouver')));
    assertEquals(true, dayjs.utc(d2).tz('America/Vancouver').isAfter(dayjs.utc(d1).tz('America/Vancouver')));

    const formatString = 'YYYY-MM-DD HH:mm:ss Z';
    console.log(dayjs.utc(d1).tz('America/Vancouver').format(formatString));
});
