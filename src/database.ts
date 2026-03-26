import { Pool, PoolClient } from 'pg';
import { FieldResponse, FieldFeed } from './thingspeak-sensor-api';

export interface TemperatureReading {
    date_recorded: Date;
    entry_id: number;
    indoor_temp: number | null;
    outdoor_temp: number | null;
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
            connectionTimeoutMillis: 2000,
        });
    }
    return pool;
}

export function transformFieldResponseToReadings(response: FieldResponse): TemperatureReading[] {
    const { channel, feeds } = response;

    return feeds.map((feed: FieldFeed): TemperatureReading => {
        const indoor_temp = feed.field1 ? parseFloat(feed.field1) : null;
        const outdoor_temp = feed.field2 ? parseFloat(feed.field2) : null;

        return {
            date_recorded: new Date(feed.created_at),
            entry_id: feed.entry_id,
            indoor_temp: indoor_temp && !isNaN(indoor_temp) ? indoor_temp : null,
            outdoor_temp: outdoor_temp && !isNaN(outdoor_temp) ? outdoor_temp : null,
            channel_id: channel.id,
        };
    });
}

const MAX_BATCH_SIZE = 2000;

function buildMultiRowInsertQuery(batchSize: number): string {
    const valuesClauses = [];
    for (let i = 0; i < batchSize; i++) {
        const offset = i * 5;
        valuesClauses.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5})`);
    }

    return `
        INSERT INTO lake_temperature_readings 
        (date_recorded, entry_id, indoor_temp, outdoor_temp, channel_id)
        VALUES ${valuesClauses.join(', ')}
        ON CONFLICT (entry_id, date_recorded) DO UPDATE SET
            date_recorded = EXCLUDED.date_recorded,
            indoor_temp = EXCLUDED.indoor_temp,
            outdoor_temp = EXCLUDED.outdoor_temp
    `;
}

function buildParameterArray(readings: TemperatureReading[]): any[] {
    const parameters = [];
    for (const reading of readings) {
        parameters.push(
            reading.date_recorded,
            reading.entry_id,
            reading.indoor_temp,
            reading.outdoor_temp,
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

        // Process readings in batches of MAX_BATCH_SIZE
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
