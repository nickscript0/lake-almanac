import { transformFieldResponseToReadings } from '../database';
import { FieldResponse } from '../thingspeak-sensor-api';

describe('Database Integration', () => {
    describe('transformFieldResponseToReadings', () => {
        it('should transform FieldResponse to TemperatureReading array', () => {
            const mockResponse: FieldResponse = {
                channel: {
                    id: 581842,
                    name: 'Lake Temperature Sensor',
                    latitude: '49.123',
                    longitude: '-123.456',
                    field1: 'Indoor Temperature',
                    field2: 'Outdoor Temperature',
                    created_at: '2018-10-06T00:00:00Z',
                    updated_at: '2025-07-19T00:00:00Z',
                    last_entry_id: 12345,
                },
                feeds: [
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
                ],
            };

            const readings = transformFieldResponseToReadings(mockResponse);

            expect(readings).toHaveLength(3);

            expect(readings[0]).toEqual({
                date_recorded: new Date('2025-07-19T12:00:00Z'),
                entry_id: 1001,
                indoor_temp: 22.5,
                outdoor_temp: 18.3,
                channel_id: 581842,
            });

            expect(readings[1]).toEqual({
                date_recorded: new Date('2025-07-19T13:00:00Z'),
                entry_id: 1002,
                indoor_temp: 23.1,
                outdoor_temp: null,
                channel_id: 581842,
            });

            expect(readings[2]).toEqual({
                date_recorded: new Date('2025-07-19T14:00:00Z'),
                entry_id: 1003,
                indoor_temp: null,
                outdoor_temp: 19.7,
                channel_id: 581842,
            });
        });

        it('should handle empty feeds array', () => {
            const mockResponse: FieldResponse = {
                channel: {
                    id: 581842,
                    name: 'Lake Temperature Sensor',
                    latitude: '49.123',
                    longitude: '-123.456',
                    field1: 'Indoor Temperature',
                    field2: 'Outdoor Temperature',
                    created_at: '2018-10-06T00:00:00Z',
                    updated_at: '2025-07-19T00:00:00Z',
                    last_entry_id: 12345,
                },
                feeds: [],
            };

            const readings = transformFieldResponseToReadings(mockResponse);
            expect(readings).toHaveLength(0);
        });

        it('should handle null temperature values', () => {
            const mockResponse: FieldResponse = {
                channel: {
                    id: 581842,
                    name: 'Lake Temperature Sensor',
                    latitude: '49.123',
                    longitude: '-123.456',
                    field1: 'Indoor Temperature',
                    field2: 'Outdoor Temperature',
                    created_at: '2018-10-06T00:00:00Z',
                    updated_at: '2025-07-19T00:00:00Z',
                    last_entry_id: 12345,
                },
                feeds: [
                    {
                        created_at: '2025-07-19T12:00:00Z',
                        entry_id: 1001,
                        field1: '',
                        field2: null,
                    },
                ],
            };

            const readings = transformFieldResponseToReadings(mockResponse);
            expect(readings[0].indoor_temp).toBeNull();
            expect(readings[0].outdoor_temp).toBeNull();
        });

        it('should handle large batches (>2000 readings)', () => {
            const feeds: any[] = [];
            for (let i = 1; i <= 2500; i++) {
                feeds.push({
                    created_at: `2025-07-19T${String(Math.floor(i / 100)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00Z`,
                    entry_id: i,
                    field1: (20 + Math.random() * 10).toFixed(1),
                    field2: (15 + Math.random() * 10).toFixed(1),
                });
            }

            const mockResponse: FieldResponse = {
                channel: {
                    id: 581842,
                    name: 'Lake Temperature Sensor',
                    latitude: '49.123',
                    longitude: '-123.456',
                    field1: 'Indoor Temperature',
                    field2: 'Outdoor Temperature',
                    created_at: '2018-10-06T00:00:00Z',
                    updated_at: '2025-07-19T00:00:00Z',
                    last_entry_id: 2500,
                },
                feeds,
            };

            const readings = transformFieldResponseToReadings(mockResponse);
            expect(readings).toHaveLength(2500);
            expect(readings[0].entry_id).toBe(1);
            expect(readings[2499].entry_id).toBe(2500);
        });
    });
});
