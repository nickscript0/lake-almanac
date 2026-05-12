import { Pool, PoolClient } from 'pg';

import { FieldFeed, FieldResponse } from './thingspeak-sensor-api';
import { getSensorConfigByChannelId } from './sensor-config';
import { ThingSpeakFieldKey } from './types';

export interface TemperatureReading {
    date_recorded: Date;
    entry_id: number;
    indoor_temp: number | null;
    outdoor_temp: number | null;
    deep_water_temp: number | null;
    lake_air_temp: number | null;
    surface_water_temp: number | null;
    channel_id: number;
}

let pool: Pool | null = null;

function getPool(): Pool {
    if (!pool) {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) {
            throw new Error('DATABASE_URL environment variable is required');
        }
        pool = new Pool({
            connectionString,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
        });
    }
    return pool;
}

function parseTemperatureValue(value: string | null | undefined): number | null {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    const parsedValue = parseFloat(value);
    return Number.isNaN(parsedValue) ? null : parsedValue;
}

export function transformFieldResponseToReadings(response: FieldResponse): TemperatureReading[] {
    const { channel, feeds } = response;
    const sensor = getSensorConfigByChannelId(channel.id);

    if (!sensor) {
        throw new Error(`Unsupported sensor channel id ${channel.id}`);
    }

    return feeds.map((feed: FieldFeed): TemperatureReading => {
        const reading: TemperatureReading = {
            date_recorded: new Date(feed.created_at),
            entry_id: feed.entry_id,
            indoor_temp: null,
            outdoor_temp: null,
            deep_water_temp: null,
            lake_air_temp: null,
            surface_water_temp: null,
            channel_id: channel.id,
        };

        const databaseFieldEntries = Object.entries(sensor.databaseFieldMap) as Array<
            [
                keyof Omit<TemperatureReading, 'date_recorded' | 'entry_id' | 'channel_id'>,
                ThingSpeakFieldKey | undefined,
            ]
        >;

        for (const [columnName, fieldName] of databaseFieldEntries) {
            if (!fieldName) {
                continue;
            }

            reading[columnName] = parseTemperatureValue(feed[fieldName]);
        }

        return reading;
    });
}

const MAX_BATCH_SIZE = 2000;

export function buildMultiRowInsertQuery(batchSize: number): string {
    const valuesClauses = [];
    for (let i = 0; i < batchSize; i++) {
        const offset = i * 8;
        valuesClauses.push(
            `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8})`
        );
    }

    return `
        INSERT INTO lake_temperature_readings 
        (date_recorded, entry_id, indoor_temp, outdoor_temp, deep_water_temp, lake_air_temp, surface_water_temp, channel_id)
        VALUES ${valuesClauses.join(', ')}
        ON CONFLICT (channel_id, entry_id, date_recorded) DO UPDATE SET
            date_recorded = EXCLUDED.date_recorded,
            indoor_temp = EXCLUDED.indoor_temp,
            outdoor_temp = EXCLUDED.outdoor_temp,
            deep_water_temp = EXCLUDED.deep_water_temp,
            lake_air_temp = EXCLUDED.lake_air_temp,
            surface_water_temp = EXCLUDED.surface_water_temp
    `;
}

function buildParameterArray(readings: TemperatureReading[]): unknown[] {
    const parameters: unknown[] = [];
    for (const reading of readings) {
        parameters.push(
            reading.date_recorded,
            reading.entry_id,
            reading.indoor_temp,
            reading.outdoor_temp,
            reading.deep_water_temp,
            reading.lake_air_temp,
            reading.surface_water_temp,
            reading.channel_id
        );
    }
    return parameters;
}

async function insertBatch(client: PoolClient, batch: TemperatureReading[]): Promise<void> {
    const insertQuery = buildMultiRowInsertQuery(batch.length);
    const parameters = buildParameterArray(batch);
    await client.query(insertQuery, parameters);
}

export async function insertTemperatureReadings(readings: TemperatureReading[]): Promise<void> {
    if (readings.length === 0) {
        console.log('No temperature readings to insert');
        return;
    }

    const pool = getPool();
    const client: PoolClient = await pool.connect();

    try {
        await client.query('BEGIN');

        for (let i = 0; i < readings.length; i += MAX_BATCH_SIZE) {
            const batch = readings.slice(i, i + MAX_BATCH_SIZE);
            await insertBatch(client, batch);
        }

        await client.query('COMMIT');
        const batchCount = Math.ceil(readings.length / MAX_BATCH_SIZE);
        console.log(
            `Successfully inserted ${readings.length} temperature readings into database using ${batchCount} batch(es)`
        );
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

export async function saveDayToDatabase(response: FieldResponse): Promise<void> {
    try {
        const readings = transformFieldResponseToReadings(response);
        await insertTemperatureReadings(readings);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Failed to save temperature readings to database:', errorMessage);
        throw error;
    }
}

export async function closeDatabase(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}
