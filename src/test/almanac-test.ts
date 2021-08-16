import { assertEquals } from 'https://deno.land/std@0.102.0/testing/asserts.ts';

import dayjs from 'https://cdn.skypack.dev/dayjs@1.10.6';
import dayjsTypes from 'https://deno.land/x/dayjs@v1.10.6/types/index.d.ts';

import { Almanac, frToOutdoorReadingDay, updateAlmanac, findNearestReadingToTime } from '../almanac.ts';
import { DayResponse, FieldResponse } from '../thingspeak-sensor-api.ts';

/**
 * Reads a json file from src/test/res/
 */
async function readResJson<T>(filename: string): Promise<T> {
    return JSON.parse(await Deno.readTextFile(`src/test/res/${filename}`));
}

async function readDayResponse(day: string): Promise<DayResponse> {
    const json = await readResJson<FieldResponse>(`response-${day}.json`);
    return { json, day };
}

Deno.test('benchmark: updateAlmanac should process 1 day from empty almanac', async () => {
    const response = await readDayResponse('2021-01-02');
    const expectedAlm = await readResJson<Almanac>('almanac-2021-01-02-to-2021-01-3.json');
    const temperatureDay = { readings: frToOutdoorReadingDay(response.json), day: response.day };
    const alm = {};
    updateAlmanac(alm, temperatureDay);
    // await Deno.writeTextFile('src/test/res/almanac-2021-01-02-to-2021-01-3.json', JSON.stringify(alm, undefined, 2));

    assertEquals(alm, expectedAlm);
});

Deno.test('benchmark: updateAlmanac should process days from all seasons', async () => {
    const responses = await Promise.all([
        readDayResponse('2020-05-10'),
        readDayResponse('2020-07-15'),
        readDayResponse('2020-09-30'),
        readDayResponse('2020-12-10'),
        readDayResponse('2021-01-02'),
    ]);

    const temperatureDays = responses.map((response) => {
        return { readings: frToOutdoorReadingDay(response.json), day: response.day };
    });

    const alm = {};
    temperatureDays.forEach((td) => updateAlmanac(alm, td));
    const expectedAlm = await readResJson<Almanac>('almanac-4seasons-2020-1day-2021.json');
    assertEquals(alm, expectedAlm);
});

const testDay = [
    { date: '2021-01-02 00:09:32-08:00Z', value: 0.0625 },
    { date: '2021-01-02 00:19:09-08:00Z', value: 0.125 },
    { date: '2021-01-02 00:28:44-08:00Z', value: 0.125 },
    { date: '2021-01-02 00:38:22-08:00Z', value: 0.125 },
    { date: '2021-01-02 00:47:59-08:00Z', value: 0.125 },
    { date: '2021-01-02 00:57:35-08:00Z', value: 0.0625 },
    { date: '2021-01-02 01:07:13-08:00Z', value: 0.125 },
    { date: '2021-01-02 01:16:50-08:00Z', value: 0.125 },
    { date: '2021-01-02 01:26:26-08:00Z', value: 0.3125 },
    { date: '2021-01-02 01:36:02-08:00Z', value: 0.125 },
    { date: '2021-01-02 01:45:40-08:00Z', value: 0.0625 },
    { date: '2021-01-02 01:55:17-08:00Z', value: 0.125 },
    { date: '2021-01-02 02:04:53-08:00Z', value: 0.0625 },
    { date: '2021-01-02 02:14:31-08:00Z', value: 0.125 },
    { date: '2021-01-02 02:24:08-08:00Z', value: 0.125 },
    { date: '2021-01-02 02:33:45-08:00Z', value: 0.125 },
    { date: '2021-01-02 02:43:20-08:00Z', value: 0.125 },
    { date: '2021-01-02 02:52:58-08:00Z', value: 0.1875 },
    { date: '2021-01-02 03:02:36-08:00Z', value: 0.125 },
    { date: '2021-01-02 03:12:12-08:00Z', value: 0.125 },
    { date: '2021-01-02 03:21:49-08:00Z', value: 0.125 },
    { date: '2021-01-02 03:31:25-08:00Z', value: 0.125 },
    { date: '2021-01-02 03:41:01-08:00Z', value: 0.125 },
    { date: '2021-01-02 03:50:39-08:00Z', value: 0.125 },
    { date: '2021-01-02 04:00:16-08:00Z', value: 0.125 },
    { date: '2021-01-02 04:09:53-08:00Z', value: 0.125 },
    { date: '2021-01-02 04:19:30-08:00Z', value: 0.125 },
    { date: '2021-01-02 04:29:07-08:00Z', value: 0.125 },
    { date: '2021-01-02 04:38:44-08:00Z', value: 0.125 },
    { date: '2021-01-02 04:48:20-08:00Z', value: 0.125 },
    { date: '2021-01-02 04:57:58-08:00Z', value: 0.1875 },
    { date: '2021-01-02 05:07:34-08:00Z', value: 0.1875 },
    { date: '2021-01-02 05:17:12-08:00Z', value: 0.1875 },
    { date: '2021-01-02 05:26:49-08:00Z', value: 0.1875 },
    { date: '2021-01-02 05:36:26-08:00Z', value: 0.1875 },
    { date: '2021-01-02 05:46:01-08:00Z', value: 0.125 },
    { date: '2021-01-02 05:55:39-08:00Z', value: 0.1875 },
    { date: '2021-01-02 06:05:16-08:00Z', value: 0.1875 },
    { date: '2021-01-02 06:14:53-08:00Z', value: 0.1875 },
    { date: '2021-01-02 06:24:30-08:00Z', value: 0.1875 },
    { date: '2021-01-02 06:34:05-08:00Z', value: 0.25 },
    { date: '2021-01-02 06:43:43-08:00Z', value: 0.1875 },
    { date: '2021-01-02 06:53:19-08:00Z', value: 0.25 },
    { date: '2021-01-02 07:02:57-08:00Z', value: 0.25 },
    { date: '2021-01-02 07:12:34-08:00Z', value: 0.25 },
    { date: '2021-01-02 07:22:09-08:00Z', value: 0.25 },
    { date: '2021-01-02 07:31:47-08:00Z', value: 0.25 },
    { date: '2021-01-02 07:41:25-08:00Z', value: 0.1875 },
    { date: '2021-01-02 07:51:00-08:00Z', value: 0.25 },
    { date: '2021-01-02 08:00:38-08:00Z', value: 0.25 },
    { date: '2021-01-02 08:10:14-08:00Z', value: 0.1875 },
    { date: '2021-01-02 08:19:51-08:00Z', value: 0.25 },
    { date: '2021-01-02 08:29:28-08:00Z', value: 0.25 },
    { date: '2021-01-02 08:39:05-08:00Z', value: 0.25 },
    { date: '2021-01-02 08:48:42-08:00Z', value: 0.25 },
    { date: '2021-01-02 08:58:18-08:00Z', value: 0.25 },
    { date: '2021-01-02 09:07:54-08:00Z', value: 0.3125 },
    { date: '2021-01-02 09:17:30-08:00Z', value: 0.375 },
    { date: '2021-01-02 09:27:08-08:00Z', value: 0.375 },
    { date: '2021-01-02 09:36:46-08:00Z', value: 0.375 },
    { date: '2021-01-02 09:46:23-08:00Z', value: 0.4375 },
    { date: '2021-01-02 09:56:01-08:00Z', value: 0.5625 },
    { date: '2021-01-02 10:05:36-08:00Z', value: 0.5 },
    { date: '2021-01-02 10:15:15-08:00Z', value: 0.5625 },
    { date: '2021-01-02 10:24:50-08:00Z', value: 0.625 },
    { date: '2021-01-02 10:34:28-08:00Z', value: 0.8125 },
    { date: '2021-01-02 10:44:05-08:00Z', value: 0.6875 },
    { date: '2021-01-02 10:53:42-08:00Z', value: 0.6875 },
    { date: '2021-01-02 11:03:19-08:00Z', value: 0.875 },
    { date: '2021-01-02 11:12:56-08:00Z', value: 0.6875 },
    { date: '2021-01-02 11:22:33-08:00Z', value: 0.75 },
    { date: '2021-01-02 11:32:08-08:00Z', value: 0.75 },
    { date: '2021-01-02 11:41:45-08:00Z', value: 0.9375 },
    { date: '2021-01-02 11:51:21-08:00Z', value: 0.9375 },
    { date: '2021-01-02 12:00:59-08:00Z', value: 1 },
    { date: '2021-01-02 12:10:36-08:00Z', value: 0.9375 },
    { date: '2021-01-02 12:20:13-08:00Z', value: 1.0625 },
    { date: '2021-01-02 12:29:50-08:00Z', value: 1 },
    { date: '2021-01-02 12:39:27-08:00Z', value: 0.875 },
    { date: '2021-01-02 12:49:04-08:00Z', value: 0.9375 },
    { date: '2021-01-02 12:58:42-08:00Z', value: 0.875 },
    { date: '2021-01-02 13:08:19-08:00Z', value: 0.8125 },
    { date: '2021-01-02 13:17:54-08:00Z', value: 0.8125 },
    { date: '2021-01-02 13:27:31-08:00Z', value: 0.75 },
    { date: '2021-01-02 13:37:09-08:00Z', value: 0.75 },
    { date: '2021-01-02 13:46:44-08:00Z', value: 0.75 },
    { date: '2021-01-02 13:56:21-08:00Z', value: 0.75 },
    { date: '2021-01-02 14:05:59-08:00Z', value: 0.8125 },
    { date: '2021-01-02 14:15:34-08:00Z', value: 0.875 },
    { date: '2021-01-02 14:25:14-08:00Z', value: 0.75 },
    { date: '2021-01-02 14:34:50-08:00Z', value: 0.8125 },
    { date: '2021-01-02 14:44:27-08:00Z', value: 1 },
    { date: '2021-01-02 14:54:04-08:00Z', value: 0.6875 },
    { date: '2021-01-02 15:03:41-08:00Z', value: 0.8125 },
    { date: '2021-01-02 15:13:16-08:00Z', value: 0.875 },
    { date: '2021-01-02 15:22:54-08:00Z', value: 0.8125 },
    { date: '2021-01-02 15:32:32-08:00Z', value: 0.8125 },
    { date: '2021-01-02 15:42:07-08:00Z', value: 0.75 },
    { date: '2021-01-02 15:51:45-08:00Z', value: 0.8125 },
    { date: '2021-01-02 16:01:20-08:00Z', value: 0.8125 },
    { date: '2021-01-02 16:10:58-08:00Z', value: 0.625 },
    { date: '2021-01-02 16:20:34-08:00Z', value: 0.75 },
    { date: '2021-01-02 16:30:11-08:00Z', value: 0.6875 },
    { date: '2021-01-02 16:39:49-08:00Z', value: 0.6875 },
    { date: '2021-01-02 16:49:24-08:00Z', value: 0.6875 },
    { date: '2021-01-02 16:59:02-08:00Z', value: 0.6875 },
    { date: '2021-01-02 17:08:39-08:00Z', value: 0.75 },
    { date: '2021-01-02 17:18:16-08:00Z', value: 0.6875 },
    { date: '2021-01-02 17:27:53-08:00Z', value: 0.6875 },
    { date: '2021-01-02 17:37:30-08:00Z', value: 0.8125 },
    { date: '2021-01-02 17:47:06-08:00Z', value: 0.875 },
    { date: '2021-01-02 17:56:43-08:00Z', value: 0.8125 },
    { date: '2021-01-02 18:06:19-08:00Z', value: 0.8125 },
    { date: '2021-01-02 18:15:55-08:00Z', value: 0.75 },
    { date: '2021-01-02 18:25:33-08:00Z', value: 0.6875 },
    { date: '2021-01-02 18:35:10-08:00Z', value: 0.75 },
    { date: '2021-01-02 18:44:47-08:00Z', value: 0.6875 },
    { date: '2021-01-02 18:54:27-08:00Z', value: 0.8125 },
    { date: '2021-01-02 19:04:04-08:00Z', value: 0.875 },
    { date: '2021-01-02 19:13:43-08:00Z', value: 0.875 },
    { date: '2021-01-02 19:23:22-08:00Z', value: 0.8125 },
    { date: '2021-01-02 19:33:00-08:00Z', value: 0.9375 },
    { date: '2021-01-02 19:42:39-08:00Z', value: 0.875 },
    { date: '2021-01-02 19:52:15-08:00Z', value: 0.9375 },
    { date: '2021-01-02 20:01:54-08:00Z', value: 0.9375 },
    { date: '2021-01-02 20:11:31-08:00Z', value: 0.875 },
    { date: '2021-01-02 20:21:10-08:00Z', value: 0.8125 },
    { date: '2021-01-02 20:30:49-08:00Z', value: 0.9375 },
    { date: '2021-01-02 20:40:27-08:00Z', value: 0.875 },
    { date: '2021-01-02 20:50:03-08:00Z', value: 0.875 },
    { date: '2021-01-02 20:59:41-08:00Z', value: 0.8125 },
    { date: '2021-01-02 21:09:18-08:00Z', value: 0.875 },
    { date: '2021-01-02 21:18:55-08:00Z', value: 0.8125 },
    { date: '2021-01-02 21:28:34-08:00Z', value: 0.875 },
    { date: '2021-01-02 21:38:11-08:00Z', value: 1.0625 },
    { date: '2021-01-02 21:47:50-08:00Z', value: 0.875 },
    { date: '2021-01-02 21:57:28-08:00Z', value: 0.8125 },
    { date: '2021-01-02 22:07:06-08:00Z', value: 0.875 },
    { date: '2021-01-02 22:16:44-08:00Z', value: 0.8125 },
    { date: '2021-01-02 22:26:22-08:00Z', value: 0.8125 },
    { date: '2021-01-02 22:36:00-08:00Z', value: 0.9375 },
    { date: '2021-01-02 22:45:39-08:00Z', value: 1 },
    { date: '2021-01-02 22:55:18-08:00Z', value: 0.9375 },
    { date: '2021-01-02 23:04:56-08:00Z', value: 0.9375 },
    { date: '2021-01-02 23:14:34-08:00Z', value: 0.9375 },
    { date: '2021-01-02 23:24:12-08:00Z', value: 1 },
    { date: '2021-01-02 23:33:50-08:00Z', value: 1.0625 },
    { date: '2021-01-02 23:43:28-08:00Z', value: 1.3125 },
    { date: '2021-01-02 23:53:06-08:00Z', value: 1.5625 },
];

function toDjs(d: { date: string; value: number }) {
    return { date: dayjs(d.date), value: d.value };
}

Deno.test('findNearestReadingToTime works with DST dataset', () => {
    const noon = dayjs('2001-01-01 12:00:00-08:00Z');
    const nearestNoon = findNearestReadingToTime(noon, testDay.map(toDjs));
    assertEquals(nearestNoon.date.toISOString(), '2021-01-02T12:00:59.000Z');

    const midnight = dayjs('2001-01-01 00:00:00-08:00Z');
    const nearestMidnight = findNearestReadingToTime(midnight, testDay.map(toDjs));
    assertEquals(nearestMidnight.date.toISOString(), '2021-01-02T23:53:06.000Z');

});
