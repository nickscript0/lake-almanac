#!/usr/bin/env npx tsx

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Reading } from '../src/types';

dayjs.extend(utc);

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

function compareReadings(oldReadings: Reading[], newReadings: Reading[], fieldName: string, year: string): boolean {
    const normalizedOld = normalizeReadings(oldReadings).sort((a, b) => a.date.localeCompare(b.date));
    const normalizedNew = normalizeReadings(newReadings).sort((a, b) => a.date.localeCompare(b.date));

    if (normalizedOld.length !== normalizedNew.length) {
        console.log(
            `❌ ${year} ${fieldName}: Length mismatch (old: ${normalizedOld.length}, new: ${normalizedNew.length})`
        );
        return false;
    }

    for (let i = 0; i < normalizedOld.length; i++) {
        const oldReading = normalizedOld[i];
        const newReading = normalizedNew[i];

        if (oldReading.date !== newReading.date || oldReading.value !== newReading.value) {
            console.log(`❌ ${year} ${fieldName}[${i}]: Mismatch`);
            console.log(`   Old: ${oldReading.date} = ${oldReading.value}`);
            console.log(`   New: ${newReading.date} = ${newReading.value}`);
            return false;
        }
    }

    console.log(`✅ ${year} ${fieldName}: Match (${normalizedOld.length} readings)`);
    return true;
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
            const success = compareReadings(oldYearData[field] || [], newYearData.Year[field] || [], field, year);
            if (success) successfulComparisons++;
        }

        // Compare freeze data (moved to year level in new format)
        totalComparisons++;
        const freezeBeforeSuccess = compareReadings(
            oldYearData.FirstFreezesBeforeSummer || [],
            newYearData.FirstFreezesBeforeSummer || [],
            'FirstFreezesBeforeSummer',
            year
        );
        if (freezeBeforeSuccess) successfulComparisons++;

        totalComparisons++;
        const freezeAfterSuccess = compareReadings(
            oldYearData.FirstFreezesAfterSummer || [],
            newYearData.FirstFreezesAfterSummer || [],
            'FirstFreezesAfterSummer',
            year
        );
        if (freezeAfterSuccess) successfulComparisons++;

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
