import { assertEquals } from 'https://deno.land/std@0.102.0/testing/asserts.ts';

import { Almanac, frToOutdoorReadingDay, updateAlmanac } from '../almanac.ts';
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
