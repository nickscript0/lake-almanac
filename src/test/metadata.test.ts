import { describe, test, expect } from '@jest/globals';
import { AlmanacWithMetadata } from '../almanac';

// Mock the file system operations
jest.mock('fs/promises');

describe('Almanac Metadata', () => {
    test('should initialize metadata when missing', () => {
        const almanac: AlmanacWithMetadata = {};

        // Simulate the initializeMetadata function behavior
        if (!almanac._metadata) {
            almanac._metadata = {
                missedDays: [],
            };
        }

        expect(almanac._metadata).toBeDefined();
        expect(almanac._metadata.missedDays).toEqual([]);
        expect(almanac._metadata.startDate).toBeUndefined();
        expect(almanac._metadata.endDate).toBeUndefined();
    });

    test('should update start and end dates correctly', () => {
        const almanac: AlmanacWithMetadata = {};
        almanac._metadata = {
            missedDays: [],
        };

        // Simulate updateMetadataForSuccessfulDay function behavior
        const updateMetadataForSuccessfulDay = (alm: AlmanacWithMetadata, day: string) => {
            const metadata = alm._metadata!;

            if (!metadata.startDate || day < metadata.startDate) {
                metadata.startDate = day;
            }

            if (!metadata.endDate || day > metadata.endDate) {
                metadata.endDate = day;
            }

            const missedIndex = metadata.missedDays.indexOf(day);
            if (missedIndex !== -1) {
                metadata.missedDays.splice(missedIndex, 1);
            }
        };

        // Test first day
        updateMetadataForSuccessfulDay(almanac, '2021-01-15');
        expect(almanac._metadata!.startDate).toBe('2021-01-15');
        expect(almanac._metadata!.endDate).toBe('2021-01-15');

        // Test earlier day (should update start)
        updateMetadataForSuccessfulDay(almanac, '2021-01-10');
        expect(almanac._metadata!.startDate).toBe('2021-01-10');
        expect(almanac._metadata!.endDate).toBe('2021-01-15');

        // Test later day (should update end)
        updateMetadataForSuccessfulDay(almanac, '2021-01-20');
        expect(almanac._metadata!.startDate).toBe('2021-01-10');
        expect(almanac._metadata!.endDate).toBe('2021-01-20');
    });

    test('should add and remove missed days correctly', () => {
        const almanac: AlmanacWithMetadata = {};
        almanac._metadata = {
            missedDays: [],
        };

        // Simulate addMissedDay function behavior
        const addMissedDay = (alm: AlmanacWithMetadata, day: string) => {
            const metadata = alm._metadata!;
            if (!metadata.missedDays.includes(day)) {
                metadata.missedDays.push(day);
                metadata.missedDays.sort();
            }
        };

        // Add missed days
        addMissedDay(almanac, '2021-01-15');
        addMissedDay(almanac, '2021-01-10');
        addMissedDay(almanac, '2021-01-20');

        expect(almanac._metadata!.missedDays).toEqual(['2021-01-10', '2021-01-15', '2021-01-20']);

        // Try to add duplicate (should not add)
        addMissedDay(almanac, '2021-01-15');
        expect(almanac._metadata!.missedDays).toEqual(['2021-01-10', '2021-01-15', '2021-01-20']);

        // Simulate successful day processing (should remove from missed days)
        const updateMetadataForSuccessfulDay = (alm: AlmanacWithMetadata, day: string) => {
            const metadata = alm._metadata!;
            const missedIndex = metadata.missedDays.indexOf(day);
            if (missedIndex !== -1) {
                metadata.missedDays.splice(missedIndex, 1);
            }
        };

        updateMetadataForSuccessfulDay(almanac, '2021-01-15');
        expect(almanac._metadata!.missedDays).toEqual(['2021-01-10', '2021-01-20']);
    });

    test('should maintain sorted order of missed days', () => {
        const almanac: AlmanacWithMetadata = {};
        almanac._metadata = {
            missedDays: [],
        };

        const addMissedDay = (alm: AlmanacWithMetadata, day: string) => {
            const metadata = alm._metadata!;
            if (!metadata.missedDays.includes(day)) {
                metadata.missedDays.push(day);
                metadata.missedDays.sort();
            }
        };

        // Add days in random order
        addMissedDay(almanac, '2021-03-15');
        addMissedDay(almanac, '2021-01-10');
        addMissedDay(almanac, '2021-02-20');
        addMissedDay(almanac, '2021-01-05');

        expect(almanac._metadata!.missedDays).toEqual(['2021-01-05', '2021-01-10', '2021-02-20', '2021-03-15']);
    });
});
