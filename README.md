# lake-almanac

## Usage

```bash
# With date range and response saving
npm run archiver -- --save-responses 2018-10-06 2021-07-31 2>&1 | tee output.log

# Process from local archive (rebuild almanac from stored responses)
npm run archiver -- --use-local-archive 2020-01-01 2020-01-31

# Process yesterday only (this is what the daily Github Action runs)
npm run archiver

# Process only the lake-water sensor
npm run archiver -- --sensor lake-water 2026-05-03 2026-05-09

# How to re-generate both almanac output files if say we added new stats / fields
rm output/lake-almanac.json
rm output/lake-water-almanac.json
npm run archiver -- --use-local-archive 2018-10-06 2026-05-09 # Up to today's date

# Run tests
npm test
```

## Output Files

- `output/lake-almanac.json`: existing outdoor-air almanac from channel `581842`
- `output/lake-water-almanac.json`: grouped lake-water almanacs from channel `3367153`
    - `deepWater` from `field1`
    - `lakeAir` from `field2`
    - `surfaceWater` from `field3`

## Use Cases and Scripts

### Archiver Modes

1. **API Mode (default)**: Fetches data from ThingSpeak API and optionally saves responses

    ```bash
    npm run archiver -- [--save-responses] [--sensor <sensor>] <start-date> <end-date>
    ```

2. **Local Archive Mode**: Uses locally stored response files instead of fetching from API

    ```bash
    npm run archiver -- --use-local-archive [--sensor <sensor>] <start-date> <end-date>
    ```

    - Outdoor-air reads from `output/responses-archive/YYYY/YYYY-MM-DD.zip`
    - Lake-water reads from `output/responses-archive/lake-water/YYYY/YYYY-MM-DD.zip`
    - Useful for rebuilding almanac data from historical responses
    - Requires archive files to exist for the specified date range

3. **Daily Mode**: Processes all configured sensors for the daily window (used by GitHub Actions)
    ```bash
    npm run archiver
    ```

### Retry Missed Days

The system automatically tracks days when data collection fails. Use the retry utility to attempt fetching missed days:

```bash
# Retry all missed days from the almanac
npm run retry-missed-days

# Retry only lake-water missed days
npm run retry-missed-days -- --sensor lake-water

# Retry missed days and save API responses to archive
npm run retry-missed-days -- --save-responses

# Show help for all options
npm run retry-missed-days -- --help
```

The retry utility will:

- Read the current almanac output file(s) to find all missed days
- Attempt to fetch data for each missed day from the ThingSpeak API
- Update the almanac with successful retrievals
- Remove successfully retrieved days from the missed days list
- Optionally save API responses to the archive for future local processing

### Export Data to CSV

Export archived temperature data to CSV format for PostgreSQL database import:

```bash
# Export data for a specific date range
npm run csv-export 2020-01-01 2020-12-31

# Export only lake-water rows
npm run csv-export -- --sensor lake-water 2026-05-03 2026-05-09 lake-water-export.csv

# Export with custom output filename
npm run csv-export 2018-10-06 2025-01-01 full-dataset.csv

# Export recent data
npm run csv-export 2024-01-01 2024-12-31 lake-data-2024.csv
```

The CSV export utility will:

- Read archived data from the sensor-specific archive folders
- Generate a CSV file with columns: `date_recorded`, `entry_id`, `indoor_temp`, `outdoor_temp`, `deep_water_temp`, `lake_air_temp`, `surface_water_temp`, `channel_id`
- Provide a PostgreSQL COPY command for easy database import
- Handle missing days gracefully and show progress for large date ranges

**PostgreSQL Import Example:**

```sql
COPY lake_temperature_readings (date_recorded, entry_id, indoor_temp, outdoor_temp, deep_water_temp, lake_air_temp, surface_water_temp, channel_id)
FROM '/path/to/lake-data-export.csv' WITH (FORMAT CSV, HEADER);
```

### Check Database Gaps

Check for missing dates in the PostgreSQL database temperature readings:

```bash
# Check all gaps from project start to yesterday
npm run check-db-gaps

# Check only lake-water gaps
npm run check-db-gaps -- --sensor lake-water

# Check last 30 days for gaps
npm run check-db-gaps -- --recent 30

# Check specific date range
npm run check-db-gaps -- -s 2024-01-01 -e 2024-12-31

# List all missing dates (not just summary)
npm run check-db-gaps -- --list-missing

# Show help for all options
npm run check-db-gaps -- --help
```

The gap checker will:

- Identify missing dates in the database temperature readings table per sensor/channel
- Show the latest date with data in the database for each sensor checked
- Provide suggestions for backfilling missing data using existing tools
- Support checking recent periods or specific date ranges
- Require `DATABASE_URL` environment variable to be set

### Backfill Database from Archive

Backfill missing database entries using existing archived JSON files (recommended approach for filling database gaps):

```bash
# Backfill a specific date range
npm run backfill-database -- -s 2024-01-01 -e 2024-01-31

# Backfill only lake-water rows
npm run backfill-database -- --sensor lake-water -d 2026-05-09

# Backfill specific dates
npm run backfill-database -- -d 2024-01-15,2024-02-20,2024-03-10

# Preview what would be processed (dry run)
npm run backfill-database -- --dry-run -s 2024-01-01 -e 2024-01-07

# Show help for all options
npm run backfill-database -- --help
```

The database backfill utility will:

- Read archived data from the sensor-specific archive folders
- Extract temperature readings and insert into PostgreSQL database
- **Database-only operation**: Does NOT update almanac metadata or store new files
- Use upsert logic to safely handle duplicate entries
- Report success/failure for each date processed
- Handle missing archive files gracefully
- Require `DATABASE_URL` environment variable to be set

**When to use:**

- **Recommended**: Use `npm run backfill-database` when you have archived data and just need to fill database gaps
- **Alternative**: Use `npm run retry-missed-days` when you need to fetch new data from the API and update almanac metadata

## Neon Database (start integrating Jul 11, 2025)

- https://vercel.com/ns0s-projects/~/stores/integration/neon/store_xu5iln4FGQCUuKPA/guides
- https://console.neon.tech/app/org-still-band-62770543/projects -- Login is same as vercel github auth
- Before running the lake-water ingest against an existing database, apply `schema/temperature_readings_add_lake_water.sql`. The full create-table definition lives in `schema/temperature_readings.sql`.

### SQL Manual loads

Using the conn string from https://console.neon.tech/app/projects/dry-thunder-38275234/branches/br-nameless-morning-adsy4myo?branchId=br-nameless-morning-adsy4myo&database=neondb

```shell
npm run csv-export 2018-10-06 2025-07-20 export-to-2025-07-19.csv

psql 'postgresql://neondb_owner:redacted@ep-polished-bird-ad1ybvh5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -c "\COPY lake_temperature_readings (date_recorded, entry_id, indoor_temp, outdoor_temp, deep_water_temp, lake_air_temp, surface_water_temp, channel_id)
FROM 'export-to-2025-07-19.csv' WITH (FORMAT CSV, HEADER);"
```

## Status Updates

### Latest Status - May 12, 2026

We added support for a new `lake-water` sensor on ThingSpeak channel `3367153`, which now produces a grouped `output/lake-water-almanac.json` with `deepWater`, `lakeAir`, and `surfaceWater` alongside separate archived responses for that channel. We also extended database storage for those three lake-water readings, so the steps below cover the required one-time migration and historical catch-up before the normal daily archiver run takes over.

Lake-water sensor go-live checklist:

1. Apply the database migration before any live lake-water ingest:
   `schema/temperature_readings_add_lake_water.sql`
2. Merge and push the lake-water sensor changes to `main`.
3. Confirm GitHub Actions is already sufficient for daily ingest:
   `.github/workflows/fetch-yesterday.yml` already runs `npm run archiver`, so no workflow change is needed.
4. Confirm the `DATABASE_URL` secret points at the migrated database before the next scheduled run.
5. Run the one-time lake-water catch-up from ThingSpeak with response archiving enabled:
   `npm run archiver -- --save-responses --sensor lake-water 2026-05-03 2026-05-12`
6. Treat that command as a safe backfill of completed lake days `2026-05-03` through `2026-05-11`.
   The repo's date-range processing is end-exclusive, so this intentionally avoids ingesting the in-progress `2026-05-12` lake day.
7. After cutover, let the scheduled job pick up the next completed lake-water day automatically.

Verification:

- Confirm `output/lake-water-almanac.json` was created.
- Confirm lake-water archives now exist under `output/responses-archive/lake-water/2026/YYYY-MM-DD.zip`.
- Run `npm run check-db-gaps -- --sensor lake-water -s 2026-05-03 -e 2026-05-11`.

Recovery / fallback:

- If ThingSpeak fetch/archive missed days, run:
  `npm run retry-missed-days -- --sensor lake-water --save-responses`
- If archives exist but database rows are still missing, run:
  `npm run backfill-database -- --sensor lake-water -s 2026-05-03 -e 2026-05-11`

### Latest Status - Mar 26, 2026

Completed migration to nodejs, it is now on main (we are no longer running both simultaneously). Also the weather-list-nextjs app is updated to only use the current new version.

Moved scripts/migrate-archive-structure.sh and DENO_TO_NODE_MIGRATION.md to archived-docs as they were only relevant for the migration process.

### Latest Status - Jul 3, 2025

I migrated to nodejs, some of those dayjs tests still fail, they are currently commented out with xtest.

Future project migrate to luxon as I need in weather-list app as it is modern and maintained and should resolve all the tz bugs issues.

### Latest Status - Sept 24, 2023

- Fixed 2 of 3 failing tests
    - Upgraded from dayjs@1.10.6 to dayjs@1.11.10 resolved the Minimal ADT bug failure
    - Fixed 'Timezone conversion is broken when not using DST Time test' as far as I can tell it was expecting the wrong value I have now fixed it with confirmations using https://www.timeanddate.com/worldclock/converter.html?iso=20211130T224200&p1=286&p2=1440&p3=195
- This workaround https://github.com/iamkun/dayjs/issues/1805#issuecomment-1464953487 may be a fix for the final failing 'Github Issue: tz func with valueOf bug' test, TODO investigate further also see my updated comment in said test

#### Before

````bash
```bash
Github Issue: tz func with valueOf bug ... FAILED (6ms)
Minimal ADT bug ... FAILED (4ms)
Github Issue: Timezone conversion is broken when not using DST Time ... FAILED (3ms)
````

#### After

```bash
Github Issue: tz func with valueOf bug ... FAILED (6ms)
Minimal ADT bug ... ok (5ms)
Github Issue: Timezone conversion is broken when not using DST Time ... ok (4ms)
```

- I'm guessing it was this fix https://github.com/iamkun/dayjs/pull/2420

### Latest Status - Nov 12, 2022

- Continue to work on the new-metrics-avgs branch but the main branch is working fine as is so no rush
- Currently in Atlantic Standard Time the almanac-test.ts passes, but it will fail again when we are in Daylight time (yes confirmed 'Minimal ADT bug' fails on Aug 27, 2023).
- There are several Dayjs TZ bugs as documented in the TODOs, and people in this thread even recommend switching to Luxon or another lib due to them https://github.com/iamkun/dayjs/issues/1805
- I have created dayjs-test.ts to attempt to test the bugs found in the issue tracker. One is failing.
- I have created date-fns-test.ts to attempt to tell if date-fns can handle the problematic tz issues, thereby I could switch out to using it.
- Conclusion: Currently waiting on day.js to fix bugs, or switch to date-fns (seems to not have any issues due to using the builtin TZ functionality, but still need to confirm it has all the functionality we need) / Luxon (though no TS support and nodejs??)

### LatestStatus - Nov 8, 2022

- Nov 8, 2022: Actions started failing on Sep 12 and then hanging for ~6h on Oct 4, 2022. A fix was added by explicitly exiting the archiver process at completion.
- Nov 9, 2022: After the Nov 8 fix, a data gap was backfilled from a dev box by running:

```bash
./scripts/archiver.sh --save-responses 2022-09-04 2022-11-08
git add output/responses-archive/
git push
```

## TODOs

- Aug 24, 2021: Fix tz bug repro'd by `scripts/test 'findNearestReadingToTime works with DST dataset'`
    - Option 1: I think the ideal solution is work entirely in UTC. 1. Request data in UTC, 2. almanac logic in UTC, 3. Then convert to Lake time just before writing output json
    - Option 2: Could try fixing just the findNearestReadingToTime and Noon/Midnight functions as nothing else seems broken now
    - Option 3: Log a bug with Dayjs tz plugin (see dayjs-tz-bug.js). I was going to log this in dayjs github issues but it may not be worth my time as there are no responses to these other tz bugs since April for one of them https://github.com/iamkun/dayjs/issues/1462 and https://github.com/iamkun/dayjs/issues/1606.
    - **Nov 10, 2022 Update:** Tests are now passing as we are now in Standard time and this bug probably only occurs in Daylight Savings time.
- **Nov 11, 2022 Update:** This is a great dayjs repo issue referencing all the other Timezone DST issues https://github.com/iamkun/dayjs/issues/1805
- [Done pending TZ bug] More metrics: seasonal hi/low/averages [winter,spring,summer,fall,year]
- [Done pending TZ bug] More metrics: largest variation days
- Relative metrics: Coldest/Hottest temp last week and last month, Coldest/Hottest day/night last week/month

### Dayjs Bug

Repro'd here in repl.it https://replit.com/@nocl123/Dayjs-tz-bug#index.js

Note: This only seems reproduceable when the server is in a AST (possibly other tzs) as my devbox is and not in repl.it (which is in UTC).

```bash
deno

import dayjs from 'https://cdn.skypack.dev/dayjs@1.10.6';
import utc from 'https://cdn.skypack.dev/dayjs@1.10.6/plugin/utc';
import timezone from 'https://cdn.skypack.dev/dayjs@1.10.6/plugin/timezone';
dayjs.extend(utc);
dayjs.extend(timezone);
// false as expected
console.log(dayjs("2021-01-02 17:07:54-08:00Z").isAfter(dayjs('2021-01-02 18:00:00-08:00Z')));
// true NOT as expected
console.log(dayjs.tz("2021-01-02 17:07:54", 'America/Vancouver').isAfter(dayjs.tz('2021-01-02 18:00:00', 'America/Vancouver')));
```

## Notes

### Github Repo Storage limits

I will be well below them for the forseeable future, but can check with this handy tool https://github.com/github/git-sizer

### Github Actions Links

- https://github.com/marketplace/actions/flat-data
    - https://github.com/githubocto/flat-postprocessing
- https://github.com/actions/setup-node

### Sample Requests

Rest API: https://www.mathworks.com/help/thingspeak/readdata.html

```bash
# Existing lake outdoor/indoor temp
https://api.thingspeak.com/channels/581842/feed.json?days=3
https://api.thingspeak.com/channels/581842/feed.json?days=7&average=30

# Start and End time, uses date format YYYY-MM-DD%20HH:NN:SS

```
