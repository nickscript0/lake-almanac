import { LakeWaterAlmanacMetricKey, ThingSpeakFieldKey } from './types';

export type SensorKey = 'outdoor-air' | 'lake-water';

export interface SensorMetricConfig<MetricKey extends string = string> {
    key: MetricKey;
    field: ThingSpeakFieldKey;
    label: string;
}

interface SensorDatabaseFieldMap {
    indoor_temp?: ThingSpeakFieldKey;
    outdoor_temp?: ThingSpeakFieldKey;
    deep_water_temp?: ThingSpeakFieldKey;
    lake_air_temp?: ThingSpeakFieldKey;
    surface_water_temp?: ThingSpeakFieldKey;
}

interface BaseSensorConfig<Key extends SensorKey = SensorKey, MetricKey extends string = string> {
    key: Key;
    kind: 'single' | 'grouped';
    channelId: string;
    earliestRecord: string;
    archiveRoot: string;
    outputPath: string;
    metrics: SensorMetricConfig<MetricKey>[];
    databaseFieldMap: SensorDatabaseFieldMap;
}

export interface OutdoorAirSensorConfig extends BaseSensorConfig<'outdoor-air', 'outdoorTemperature'> {
    kind: 'single';
}

export interface LakeWaterSensorConfig extends BaseSensorConfig<'lake-water', LakeWaterAlmanacMetricKey> {
    kind: 'grouped';
}

export type SensorConfig = OutdoorAirSensorConfig | LakeWaterSensorConfig;

export const SENSOR_KEYS: SensorKey[] = ['outdoor-air', 'lake-water'];

const SENSOR_CONFIGS: Record<SensorKey, SensorConfig> = {
    'outdoor-air': {
        key: 'outdoor-air',
        kind: 'single',
        channelId: '581842',
        earliestRecord: '2018-10-06',
        archiveRoot: 'output/responses-archive',
        outputPath: 'output/lake-almanac.json',
        metrics: [{ key: 'outdoorTemperature', field: 'field2', label: 'Outdoor Temperature' }],
        databaseFieldMap: {
            indoor_temp: 'field1',
            outdoor_temp: 'field2',
        },
    },
    'lake-water': {
        key: 'lake-water',
        kind: 'grouped',
        channelId: '3367153',
        earliestRecord: '2026-05-03',
        archiveRoot: 'output/responses-archive/lake-water',
        outputPath: 'output/lake-water-almanac.json',
        metrics: [
            { key: 'deepWater', field: 'field1', label: 'Deep Water Temperature' },
            { key: 'lakeAir', field: 'field2', label: 'Lake Air Temperature' },
            { key: 'surfaceWater', field: 'field3', label: 'Surface Water Temperature' },
        ],
        databaseFieldMap: {
            deep_water_temp: 'field1',
            lake_air_temp: 'field2',
            surface_water_temp: 'field3',
        },
    },
};

export function getSensorConfig(sensorKey: SensorKey): SensorConfig {
    return SENSOR_CONFIGS[sensorKey];
}

export function getSensorConfigByChannelId(channelId: number): SensorConfig | undefined {
    return SENSOR_KEYS.map((sensorKey) => getSensorConfig(sensorKey)).find(
        (sensor) => Number(sensor.channelId) === channelId
    );
}

export function resolveSensorConfigs(sensorKey?: string): SensorConfig[] {
    if (!sensorKey) {
        return SENSOR_KEYS.map((key) => getSensorConfig(key));
    }

    if (!SENSOR_KEYS.includes(sensorKey as SensorKey)) {
        throw new Error(`Invalid sensor "${sensorKey}". Valid sensors: ${SENSOR_KEYS.join(', ')}`);
    }

    return [getSensorConfig(sensorKey as SensorKey)];
}

export function getSensorArchiveFolder(sensor: SensorConfig, day: string): string {
    const year = day.split('-')[0];
    return `${sensor.archiveRoot}/${year}`;
}

export function supportsSensorDay(sensor: SensorConfig, day: string): boolean {
    return day >= sensor.earliestRecord;
}
