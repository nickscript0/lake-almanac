import { getSensorArchiveFolder, getSensorConfig, resolveSensorConfigs, supportsSensorDay } from '../sensor-config';

describe('sensor config', () => {
    it('should resolve all sensors by default', () => {
        expect(resolveSensorConfigs().map((sensor) => sensor.key)).toEqual(['outdoor-air', 'lake-water']);
    });

    it('should resolve the lake-water sensor explicitly', () => {
        const sensor = resolveSensorConfigs('lake-water')[0];

        expect(sensor.key).toBe('lake-water');
        expect(sensor.outputPath).toBe('output/lake-water-almanac.json');
        expect(sensor.metrics.map((metric) => metric.key)).toEqual(['deepWater', 'lakeAir', 'surfaceWater']);
    });

    it('should calculate the lake-water archive path under its own namespace', () => {
        const sensor = getSensorConfig('lake-water');
        expect(getSensorArchiveFolder(sensor, '2026-05-09')).toBe('output/responses-archive/lake-water/2026');
    });

    it('should skip dates before the lake-water sensor start date', () => {
        const sensor = getSensorConfig('lake-water');

        expect(supportsSensorDay(sensor, '2026-05-02')).toBe(false);
        expect(supportsSensorDay(sensor, '2026-05-03')).toBe(true);
    });
});
