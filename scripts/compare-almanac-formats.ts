#!/usr/bin/env npx tsx

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import { Reading } from '../src/types';

dayjs.extend(utc);
dayjs.extend(timezone);

// Old format types (from main branch)
interface OriginalAlmanacYear {
    HottestDays: Reading[];
    ColdestDays: Reading[];
    HottestNightime: Reading[];
    ColdestNighttime: Reading[];
    HottestDaytime: Reading[];
    ColdestDaytime: Reading[];
    FirstFreezesBeforeSummer: Reading[];
    FirstFreezesAfterSummer: Reading[];
}
type OriginalAlmanac = Record<string, OriginalAlmanacYear>;

// New format types (from migrate-to-nodejs branch)
interface NewAlmanacYear {
    Year: {
        HottestDays: Reading[];
        ColdestDays: Reading[];
        HottestNightime: Reading[];
        ColdestNighttime: Reading[];
        HottestDaytime: Reading[];
        ColdestDaytime: Reading[];
        Average?: { average: number; n: number };
        AverageNighttime?: { average: number; n: number };
        AverageDaytime?: { average: number; n: number };
        AverageNoon?: { average: number; n: number };
        AverageMidnight?: { average: number; n: number };
    };
    Spring: any;
    Summer: any;
    Fall: any;
    Winter: any;
    FirstFreezesBeforeSummer: Reading[];
    FirstFreezesAfterSummer: Reading[];
    LastFreezesBeforeSummer: Reading[];
}
interface NewAlmanacWithMetadata {
    _metadata?: {
        startDate?: string;
        endDate?: string;
        missedDays: string[];
    };
    [year: string]: NewAlmanacYear | any;
}

// Normalize dates to UTC for comparison (from existing test)
function normalizeReadings(readings: Reading[]): Reading[] {
    return readings.map((reading) => {
        let cleanDate = reading.date;

        // Remove trailing Z if there's already a timezone offset (old format)
        if (cleanDate.includes('-') && cleanDate.endsWith('Z') && cleanDate.match(/-\d{2}:\d{2}Z$/)) {
            cleanDate = cleanDate.slice(0, -1);
        }

        const utcDate = dayjs(cleanDate).utc().format();
        return {
            ...reading,
            date: utcDate,
        };
    });
}

async function fetchAlmanacData(url: string): Promise<any> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch data from ${url}:`, error);
        throw error;
    }
}

interface CompareResult {
    success: boolean;
    toleratedMismatches: number;
}

function parseReadingDate(date: string) {
    let cleanDate = date;
    if (cleanDate.includes('-') && cleanDate.endsWith('Z') && cleanDate.match(/-\d{2}:\d{2}Z$/)) {
        cleanDate = cleanDate.slice(0, -1);
    }
    return dayjs(cleanDate);
}

function getDayPart(date: string): 'daytime' | 'nighttime' {
    const local = parseReadingDate(date).tz('America/Vancouver');
    const minutes = local.hour() * 60 + local.minute();
    return minutes >= 6 * 60 && minutes <= 18 * 60 ? 'daytime' : 'nighttime';
}

function expectedDayPartForField(fieldName: string): 'daytime' | 'nighttime' | undefined {
    if (fieldName === 'HottestNightime' || fieldName === 'ColdestNighttime') return 'nighttime';
    if (fieldName === 'HottestDaytime' || fieldName === 'ColdestDaytime') return 'daytime';
    return undefined;
}

function isToleratedDayPartMismatch(oldReading: Reading, newReading: Reading, fieldName: string): boolean {
    const expected = expectedDayPartForField(fieldName);
    if (!expected) return false;

    const oldPart = getDayPart(oldReading.date);
    const newPart = getDayPart(newReading.date);
    return oldPart !== expected && newPart === expected;
}

function compareReadings(oldReadings: Reading[], newReadings: Reading[], fieldName: string, year: string): CompareResult {
    const normalizedOld = normalizeReadings(oldReadings).sort((a, b) => a.date.localeCompare(b.date));
    const normalizedNew = normalizeReadings(newReadings).sort((a, b) => a.date.localeCompare(b.date));

    if (normalizedOld.length !== normalizedNew.length) {
        console.log(
            `❌ ${year} ${fieldName}: Length mismatch (old: ${normalizedOld.length}, new: ${normalizedNew.length})`
        );
        return { success: false, toleratedMismatches: 0 };
    }

    let toleratedMismatches = 0;

    for (let i = 0; i < normalizedOld.length; i++) {
        const oldReading = normalizedOld[i];
        const newReading = normalizedNew[i];

        if (oldReading.date !== newReading.date || oldReading.value !== newReading.value) {
            if (isToleratedDayPartMismatch(oldReading, newReading, fieldName)) {
                toleratedMismatches++;
                console.log(`⚠️  ${year} ${fieldName}[${i}]: Tolerated daypart/tz mismatch`);
                console.log(`   Old: ${oldReading.date} = ${oldReading.value} (${getDayPart(oldReading.date)})`);
                console.log(`   New: ${newReading.date} = ${newReading.value} (${getDayPart(newReading.date)})`);
                continue;
            }

            console.log(`❌ ${year} ${fieldName}[${i}]: Mismatch`);
            console.log(`   Old: ${oldReading.date} = ${oldReading.value}`);
            console.log(`   New: ${newReading.date} = ${newReading.value}`);
            return { success: false, toleratedMismatches };
        }
    }

    const suffix =
        toleratedMismatches > 0 ? ` with ${toleratedMismatches} tolerated daypart/tz mismatch(es)` : '';
    console.log(`✅ ${year} ${fieldName}: Match (${normalizedOld.length} readings${suffix})`);
    return { success: true, toleratedMismatches };
}

async function compareAlmanacFormats() {
    console.log('🔍 Fetching almanac data from both branches...\n');

    const oldAlmanacUrl = 'https://raw.githubusercontent.com/nickscript0/lake-almanac/main/output/lake-almanac.json';
    const newAlmanacUrl =
        'https://raw.githubusercontent.com/nickscript0/lake-almanac/migrate-to-nodejs/output/lake-almanac.json';

    const [oldAlmanac, newAlmanac]: [OriginalAlmanac, NewAlmanacWithMetadata] = await Promise.all([
        fetchAlmanacData(oldAlmanacUrl),
        fetchAlmanacData(newAlmanacUrl),
    ]);

    console.log('📊 Comparing almanac formats...\n');

    // Get years present in both formats
    const oldYears = Object.keys(oldAlmanac).filter((key) => key !== '_metadata');
    const newYears = Object.keys(newAlmanac).filter((key) => key !== '_metadata');
    const commonYears = oldYears.filter((year) => newYears.includes(year));

    console.log(`Years in old format: ${oldYears.length}`);
    console.log(`Years in new format: ${newYears.length}`);
    console.log(`Common years: ${commonYears.length}\n`);

    let totalComparisons = 0;
    let successfulComparisons = 0;
    let totalToleratedMismatches = 0;

    // Compare each common year
    for (const year of commonYears) {
        console.log(`\n📅 Comparing year: ${year}`);
        console.log('─'.repeat(50));

        const oldYearData = oldAlmanac[year];
        const newYearData = newAlmanac[year] as NewAlmanacYear;

        if (!newYearData.Year) {
            console.log(`❌ ${year}: Missing 'Year' data in new format`);
            continue;
        }

        // Compare temperature readings (the core data that should match)
        const fieldsToCompare = [
            'HottestDays',
            'ColdestDays',
            'HottestNightime',
            'ColdestNighttime',
            'HottestDaytime',
            'ColdestDaytime',
        ];

        for (const field of fieldsToCompare) {
            totalComparisons++;
            const result = compareReadings(oldYearData[field] || [], newYearData.Year[field] || [], field, year);
            if (result.success) successfulComparisons++;
            totalToleratedMismatches += result.toleratedMismatches;
        }

        // Compare freeze data (moved to year level in new format)
        totalComparisons++;
        const freezeBeforeResult = compareReadings(
            oldYearData.FirstFreezesBeforeSummer || [],
            newYearData.FirstFreezesBeforeSummer || [],
            'FirstFreezesBeforeSummer',
            year
        );
        if (freezeBeforeResult.success) successfulComparisons++;
        totalToleratedMismatches += freezeBeforeResult.toleratedMismatches;

        totalComparisons++;
        const freezeAfterResult = compareReadings(
            oldYearData.FirstFreezesAfterSummer || [],
            newYearData.FirstFreezesAfterSummer || [],
            'FirstFreezesAfterSummer',
            year
        );
        if (freezeAfterResult.success) successfulComparisons++;
        totalToleratedMismatches += freezeAfterResult.toleratedMismatches;

        // Report new features in new format
        if (newYearData.Year.Average) {
            console.log(
                `ℹ️  ${year}: New format includes averages (avg: ${newYearData.Year.Average.average.toFixed(2)}, n: ${newYearData.Year.Average.n})`
            );
        }

        if (newYearData.LastFreezesBeforeSummer && newYearData.LastFreezesBeforeSummer.length > 0) {
            console.log(
                `ℹ️  ${year}: New format includes LastFreezesBeforeSummer (${newYearData.LastFreezesBeforeSummer.length} readings)`
            );
        }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 COMPARISON SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total comparisons: ${totalComparisons}`);
    console.log(`Successful matches: ${successfulComparisons}`);
    console.log(`Failed matches: ${totalComparisons - successfulComparisons}`);
    console.log(`Tolerated daypart/tz mismatches: ${totalToleratedMismatches}`);
    console.log(`Success rate: ${((successfulComparisons / totalComparisons) * 100).toFixed(1)}%`);

    // Report format differences
    console.log('\n🔄 FORMAT DIFFERENCES:');
    console.log('• Old format: Flat structure with years containing direct temperature data');
    console.log('• New format: Hierarchical structure with seasonal breakdowns');
    console.log('• New format adds: Seasonal data, averages, LastFreezesBeforeSummer');
    console.log('• New format includes: Metadata with missed days and date ranges');

    if (newAlmanac._metadata) {
        console.log(`\n📊 METADATA (new format only):`);
        console.log(`• Start date: ${newAlmanac._metadata.startDate}`);
        console.log(`• End date: ${newAlmanac._metadata.endDate}`);
        console.log(`• Missed days: ${newAlmanac._metadata.missedDays.length}`);
    }

    const allMatched = successfulComparisons === totalComparisons;
    console.log(
        `\n${allMatched ? '✅' : '❌'} Overall result: ${allMatched ? 'All core data matches!' : 'Some mismatches found'}`
    );

    return allMatched;
}

// Run the comparison
if (require.main === module) {
    compareAlmanacFormats()
        .then((success) => {
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Comparison failed:', error);
            process.exit(1);
        });
}

export { compareAlmanacFormats };
