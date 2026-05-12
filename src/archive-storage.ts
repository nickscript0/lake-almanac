import { readFile } from 'fs/promises';
import JSZip from 'jszip';

import { DayResponse, FieldResponse } from './thingspeak-sensor-api';
import { SensorConfig, getSensorArchiveFolder } from './sensor-config';
import { writeZippedStringToFile } from './writer';

export async function saveArchivedDay(sensor: SensorConfig, response: DayResponse): Promise<void> {
    await writeZippedStringToFile(
        getSensorArchiveFolder(sensor, response.day),
        response.day,
        JSON.stringify(response.json)
    );
}

export async function loadArchivedDay(sensor: SensorConfig, day: string): Promise<DayResponse> {
    const archivePath = `${getSensorArchiveFolder(sensor, day)}/${day}.zip`;

    try {
        const zipBuffer = await readFile(archivePath);
        const zip = await JSZip.loadAsync(zipBuffer);
        const jsonFile = zip.file(`${day}.json`);

        if (!jsonFile) {
            throw new Error(`JSON file not found in archive: ${day}.json`);
        }

        const jsonContent = await jsonFile.async('text');
        const json: FieldResponse = JSON.parse(jsonContent);

        if (!json.feeds || json.feeds.length === 0) {
            throw new Error(`No data feeds in archived file for day ${day}`);
        }

        return { json, day };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to load archived day ${day} for sensor ${sensor.key}: ${errorMessage}`);
    }
}
