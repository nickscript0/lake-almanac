import { readFile } from 'fs/promises';

import { applyFieldResponseToAlmanac } from '../almanac';
import { FieldResponse } from '../thingspeak-sensor-api';
import { AlmanacWithMetadata, AlmanacYear, LakeWaterAlmanacFile } from '../types';

async function readResJson<T>(filename: string): Promise<T> {
    return JSON.parse(await readFile(`src/test/res/${filename}`, 'utf8'));
}

function createEmptyLakeWaterAlmanacFile(): LakeWaterAlmanacFile {
    return {
        deepWater: {},
        lakeAir: {},
        surfaceWater: {},
    };
}

function getYearAverage(almanac: AlmanacWithMetadata, year: string): number | undefined {
    return (almanac[year] as AlmanacYear | undefined)?.Year.Average?.average;
}

describe('lake-water almanac processing', () => {
    it('should update deep water, lake air, and surface water within one grouped file', async () => {
        const response = await readResJson<FieldResponse>('response-lake-water-2026-05-09.json');
        const lakeWaterAlmanac = createEmptyLakeWaterAlmanacFile();

        const deepWaterResult = applyFieldResponseToAlmanac(
            lakeWaterAlmanac.deepWater,
            response,
            '2026-05-09',
            'field1'
        );
        const lakeAirResult = applyFieldResponseToAlmanac(lakeWaterAlmanac.lakeAir, response, '2026-05-09', 'field2');
        const surfaceWaterResult = applyFieldResponseToAlmanac(
            lakeWaterAlmanac.surfaceWater,
            response,
            '2026-05-09',
            'field3'
        );

        expect(deepWaterResult.status).toBe('updated');
        expect(lakeAirResult.status).toBe('updated');
        expect(surfaceWaterResult.status).toBe('updated');

        expect(lakeWaterAlmanac.deepWater._metadata).toEqual({
            startDate: '2026-05-09',
            endDate: '2026-05-09',
            missedDays: [],
        });
        expect(lakeWaterAlmanac.lakeAir._metadata).toEqual({
            startDate: '2026-05-09',
            endDate: '2026-05-09',
            missedDays: [],
        });
        expect(lakeWaterAlmanac.surfaceWater._metadata).toEqual({
            startDate: '2026-05-09',
            endDate: '2026-05-09',
            missedDays: [],
        });

        expect(getYearAverage(lakeWaterAlmanac.deepWater, '2026')).toBeCloseTo(13.1333333333);
        expect(getYearAverage(lakeWaterAlmanac.lakeAir, '2026')).toBeCloseTo(9.5333333333);
        expect(getYearAverage(lakeWaterAlmanac.surfaceWater, '2026')).toBeCloseTo(13.2);
    });

    it('should mark only the missing field as missed when a fetched day lacks one metric', async () => {
        const response = await readResJson<FieldResponse>('response-lake-water-missing-surface-2026-05-10.json');
        const lakeWaterAlmanac = createEmptyLakeWaterAlmanacFile();

        const deepWaterResult = applyFieldResponseToAlmanac(
            lakeWaterAlmanac.deepWater,
            response,
            '2026-05-10',
            'field1'
        );
        const lakeAirResult = applyFieldResponseToAlmanac(lakeWaterAlmanac.lakeAir, response, '2026-05-10', 'field2');
        const surfaceWaterResult = applyFieldResponseToAlmanac(
            lakeWaterAlmanac.surfaceWater,
            response,
            '2026-05-10',
            'field3'
        );

        expect(deepWaterResult.status).toBe('updated');
        expect(lakeAirResult.status).toBe('updated');
        expect(surfaceWaterResult.status).toBe('missed');

        expect(lakeWaterAlmanac.deepWater._metadata?.missedDays).toEqual([]);
        expect(lakeWaterAlmanac.lakeAir._metadata?.missedDays).toEqual([]);
        expect(lakeWaterAlmanac.surfaceWater._metadata).toEqual({
            missedDays: ['2026-05-10'],
        });
    });
});
