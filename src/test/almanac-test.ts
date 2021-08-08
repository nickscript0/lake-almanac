import { assertEquals } from "https://deno.land/std@0.102.0/testing/asserts.ts";

import {Almanac, frToOutdoorReadingDay, updateAlmanac} from '../almanac.ts';
import {DayResponse} from '../thingspeak-sensor-api.ts';

/**
 * Reads a json file from src/test/res/
 */
async function readResJson<T>(filename: string): Promise<T> {
    return JSON.parse(await Deno.readTextFile(`src/test/res/${filename}`));
}

Deno.test('benchmark: updateAlmanac should process 1 day from empty almanac', async () => {
    const response = await readResJson<DayResponse>('response-2021-01-02.json');
    const expectedAlm = await readResJson<Almanac>('almanac-2021-01-02-to-2021-01-3.json');
    const temperatureDay = { readings: frToOutdoorReadingDay(response.json), day: response.day };
    const alm = {};
    updateAlmanac(alm, temperatureDay);

    assertEquals(alm, expectedAlm);
});
