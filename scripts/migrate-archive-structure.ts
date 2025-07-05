/**
 * Archive Structure Migration Script
 * 
 * Purpose: Migrates flat archive structure to year-based directory structure.
 * Moves zip files from output/responses-archive/ to output/responses-archive/YYYY/
 * 
 * Usage: npm run ts-node scripts/migrate-archive-structure.ts
 * 
 * This script:
 * - Scans for YYYY-MM-DD.zip files in the flat archive directory
 * - Creates year subdirectories as needed
 * - Moves files to their respective year folders
 * - Provides migration statistics and error handling
 */

import * as fs from 'fs';
import * as path from 'path';

const RESPONSES_ARCHIVE_DIR = path.join(__dirname, '..', 'output', 'responses-archive');

interface MigrationStats {
    migratedCount: number;
    skippedCount: number;
}

function migrateArchiveStructure(): void {
    console.log('Starting migration of archive structure...');

    if (!fs.existsSync(RESPONSES_ARCHIVE_DIR)) {
        console.error(`Archive directory does not exist: ${RESPONSES_ARCHIVE_DIR}`);
        process.exit(1);
    }

    const files: string[] = fs.readdirSync(RESPONSES_ARCHIVE_DIR);

    const zipFiles: string[] = files.filter((file: string) => {
        return file.endsWith('.zip') && /^\d{4}-\d{2}-\d{2}\.zip$/.test(file);
    });

    if (zipFiles.length === 0) {
        console.log('No zip files found in flat structure. Migration may have already been completed.');
        return;
    }

    console.log(`Found ${zipFiles.length} zip files to migrate:`);
    zipFiles.forEach((file: string) => console.log(`  - ${file}`));

    const stats: MigrationStats = {
        migratedCount: 0,
        skippedCount: 0
    };

    zipFiles.forEach((file: string) => {
        const year: string = file.substring(0, 4);
        const yearDir: string = path.join(RESPONSES_ARCHIVE_DIR, year);
        const oldPath: string = path.join(RESPONSES_ARCHIVE_DIR, file);
        const newPath: string = path.join(yearDir, file);

        if (!fs.existsSync(yearDir)) {
            fs.mkdirSync(yearDir, { recursive: true });
            console.log(`Created directory: ${year}/`);
        }

        if (fs.existsSync(newPath)) {
            console.log(`Skipping ${file} - already exists in ${year}/`);
            stats.skippedCount++;
            return;
        }

        try {
            fs.renameSync(oldPath, newPath);
            console.log(`Moved: ${file} -> ${year}/${file}`);
            stats.migratedCount++;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error(`Error moving ${file}:`, errorMessage);
        }
    });

    console.log('\nMigration completed!');
    console.log(`Files migrated: ${stats.migratedCount}`);
    console.log(`Files skipped: ${stats.skippedCount}`);
}

migrateArchiveStructure();