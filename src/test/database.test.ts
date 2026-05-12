import { buildMultiRowInsertQuery, transformFieldResponseToReadings } from '../database';
import { FieldResponse } from '../thingspeak-sensor-api';

function buildOutdoorSensorResponse(feeds: FieldResponse['feeds']): FieldResponse {
    return {
        channel: {
            id: 581842,
            name: 'Upstairs Small Window Indoor / Outdoor Sensor',
            latitude: '49.123',
            longitude: '-123.456',
            field1: 'Indoor Temperature',
            field2: 'Outdoor Temperature',
            created_at: '2018-10-06T00:00:00Z',
            updated_at: '2025-07-19T00:00:00Z',
            last_entry_id: feeds.length,
        },
        feeds,
    };
}

function buildLakeWaterResponse(feeds: FieldResponse['feeds']): FieldResponse {
    return {
        channel: {
            id: 3367153,
            name: 'Lake Water Sensor',
            latitude: '0.0',
            longitude: '0.0',
            field1: 'Temp_Black',
            field2: 'Temp_White',
            field3: 'Temp_Red',
            created_at: '2026-05-03T20:22:43Z',
            updated_at: '2026-05-09T11:28:39Z',
            last_entry_id: feeds.length,
        },
        feeds,
    };
}

describe('Database Integration', () => {
    describe('transformFieldResponseToReadings', () => {
        it('should transform the outdoor sensor response into database rows', () => {
            const readings = transformFieldResponseToReadings(
                buildOutdoorSensorResponse([
                    {
                        created_at: '2025-07-19T12:00:00Z',
                        entry_id: 1001,
                        field1: '22.5',
                        field2: '18.3',
                    },
                    {
                        created_at: '2025-07-19T13:00:00Z',
                        entry_id: 1002,
                        field1: '23.1',
                        field2: null,
                    },
                    {
                        created_at: '2025-07-19T14:00:00Z',
                        entry_id: 1003,
                        field1: 'invalid',
                        field2: '19.7',
                    },
                ])
            );

            expect(readings).toHaveLength(3);

            expect(readings[0]).toEqual({
                date_recorded: new Date('2025-07-19T12:00:00Z'),
                entry_id: 1001,
                indoor_temp: 22.5,
                outdoor_temp: 18.3,
                deep_water_temp: null,
                lake_air_temp: null,
                surface_water_temp: null,
                channel_id: 581842,
            });

            expect(readings[1]).toEqual({
                date_recorded: new Date('2025-07-19T13:00:00Z'),
                entry_id: 1002,
                indoor_temp: 23.1,
                outdoor_temp: null,
                deep_water_temp: null,
                lake_air_temp: null,
                surface_water_temp: null,
                channel_id: 581842,
            });

            expect(readings[2]).toEqual({
                date_recorded: new Date('2025-07-19T14:00:00Z'),
                entry_id: 1003,
                indoor_temp: null,
                outdoor_temp: 19.7,
                deep_water_temp: null,
                lake_air_temp: null,
                surface_water_temp: null,
                channel_id: 581842,
            });
        });

        it('should transform the lake-water sensor response into database rows', () => {
            const readings = transformFieldResponseToReadings(
                buildLakeWaterResponse([
                    {
                        created_at: '2026-05-09T10:48:39Z',
                        entry_id: 350,
                        field1: '13',
                        field2: '9.7',
                        field3: '13',
                    },
                    {
                        created_at: '2026-05-09T11:08:39Z',
                        entry_id: 351,
                        field1: '13.2',
                        field2: '9.5',
                        field3: '13.3',
                    },
                ])
            );

            expect(readings).toEqual([
                {
                    date_recorded: new Date('2026-05-09T10:48:39Z'),
                    entry_id: 350,
                    indoor_temp: null,
                    outdoor_temp: null,
                    deep_water_temp: 13,
                    lake_air_temp: 9.7,
                    surface_water_temp: 13,
                    channel_id: 3367153,
                },
                {
                    date_recorded: new Date('2026-05-09T11:08:39Z'),
                    entry_id: 351,
                    indoor_temp: null,
                    outdoor_temp: null,
                    deep_water_temp: 13.2,
                    lake_air_temp: 9.5,
                    surface_water_temp: 13.3,
                    channel_id: 3367153,
                },
            ]);
        });

        it('should preserve zero values instead of converting them to null', () => {
            const outdoorReadings = transformFieldResponseToReadings(
                buildOutdoorSensorResponse([
                    {
                        created_at: '2025-07-19T12:00:00Z',
                        entry_id: 1001,
                        field1: '0',
                        field2: '0',
                    },
                ])
            );
            const lakeWaterReadings = transformFieldResponseToReadings(
                buildLakeWaterResponse([
                    {
                        created_at: '2026-05-09T10:48:39Z',
                        entry_id: 350,
                        field1: '0',
                        field2: '0',
                        field3: '0',
                    },
                ])
            );

            expect(outdoorReadings[0].indoor_temp).toBe(0);
            expect(outdoorReadings[0].outdoor_temp).toBe(0);
            expect(lakeWaterReadings[0].deep_water_temp).toBe(0);
            expect(lakeWaterReadings[0].lake_air_temp).toBe(0);
            expect(lakeWaterReadings[0].surface_water_temp).toBe(0);
        });

        it('should handle empty feeds arrays', () => {
            const readings = transformFieldResponseToReadings(buildOutdoorSensorResponse([]));
            expect(readings).toHaveLength(0);
        });

        it('should handle large batches (>2000 readings)', () => {
            const feeds: FieldResponse['feeds'] = [];
            for (let i = 0; i < 2500; i++) {
                const timestamp = new Date(Date.UTC(2025, 6, 19, 0, i, 0)).toISOString();
                feeds.push({
                    created_at: timestamp,
                    entry_id: i + 1,
                    field1: (20 + (i % 10)).toFixed(1),
                    field2: (15 + (i % 5)).toFixed(1),
                });
            }

            const readings = transformFieldResponseToReadings(buildOutdoorSensorResponse(feeds));
            expect(readings).toHaveLength(2500);
            expect(readings[0].entry_id).toBe(1);
            expect(readings[2499].entry_id).toBe(2500);
        });
    });

    it('should generate an upsert query keyed by channel id, entry id, and timestamp', () => {
        const query = buildMultiRowInsertQuery(1);

        expect(query).toContain(
            '(date_recorded, entry_id, indoor_temp, outdoor_temp, deep_water_temp, lake_air_temp, surface_water_temp, channel_id)'
        );
        expect(query).toContain('ON CONFLICT (channel_id, entry_id, date_recorded)');
    });
});
