# lake-almanac

## Run Archiver

```bash
# With date range and response saving
npm run archiver -- --save-responses 2018-10-06 2021-07-31 2>&1 | tee output.log

# Process from local archive (rebuild almanac from stored responses)
npm run archiver -- --use-local-archive 2020-01-01 2020-01-31

# Process yesterday only (this is what the daily Github Action runs)
npm run archiver

# How to re-generate lake-almanac.json if say we added new stats / fields
rm output/lake-almanac.json
npm run archiver -- --use-local-archive 2018-10-06 <today's date>
```

### Archiver Modes

1. **API Mode (default)**: Fetches data from ThingSpeak API and optionally saves responses

    ```bash
    npm run archiver -- [--save-responses] <start-date> <end-date>
    ```

2. **Local Archive Mode**: Uses locally stored response files instead of fetching from API

    ```bash
    npm run archiver -- --use-local-archive <start-date> <end-date>
    ```

    - Reads from `output/responses-archive/YYYY/YYYY-MM-DD.zip` files
    - Useful for rebuilding almanac data from historical responses
    - Requires archive files to exist for the specified date range

3. **Daily Mode**: Processes yesterday's data (used by GitHub Actions)
    ```bash
    npm run archiver
    ```

## Retry Missed Days

The system automatically tracks days when data collection fails. Use the retry utility to attempt fetching missed days:

```bash
# Retry all missed days from the almanac
npm run retry-missed-days

# Retry missed days and save API responses to archive
npm run retry-missed-days -- --save-responses

# Show help for all options
npm run retry-missed-days -- --help
```

The retry utility will:

- Read the current almanac to find all missed days
- Attempt to fetch data for each missed day from the ThingSpeak API
- Update the almanac with successful retrievals
- Remove successfully retrieved days from the missed days list
- Optionally save API responses to the archive for future local processing

## Export Data to CSV

Export archived temperature data to CSV format for PostgreSQL database import:

```bash
# Export data for a specific date range
npm run csv-export 2020-01-01 2020-12-31

# Export with custom output filename
npm run csv-export 2018-10-06 2025-01-01 full-dataset.csv

# Export recent data
npm run csv-export 2024-01-01 2024-12-31 lake-data-2024.csv
```

The CSV export utility will:

- Read archived data from `output/responses-archive/YYYY/YYYY-MM-DD.zip` files
- Generate a CSV file with columns: `date_recorded`, `entry_id`, `indoor_temp`, `outdoor_temp`, `channel_id`, `day_date`
- Provide a PostgreSQL COPY command for easy database import
- Handle missing days gracefully and show progress for large date ranges

**PostgreSQL Import Example:**

```sql
COPY temperature_readings (date_recorded, entry_id, indoor_temp, outdoor_temp, channel_id, day_date)
FROM '/path/to/lake-data-export.csv' WITH (FORMAT CSV, HEADER);
```

## Check Database Gaps

Check for missing dates in the PostgreSQL database temperature readings:

```bash
# Check all gaps from project start to yesterday
npm run check-db-gaps

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

- Identify missing dates in the database temperature readings table
- Show the latest date with data in the database
- Provide suggestions for backfilling missing data using existing tools
- Support checking recent periods or specific date ranges
- Require `DATABASE_URL` environment variable to be set

## Backfill Database from Archive

Backfill missing database entries using existing archived JSON files (recommended approach for filling database gaps):

```bash
# Backfill a specific date range
npm run backfill-database -- -s 2024-01-01 -e 2024-01-31

# Backfill specific dates
npm run backfill-database -- -d 2024-01-15,2024-02-20,2024-03-10

# Preview what would be processed (dry run)
npm run backfill-database -- --dry-run -s 2024-01-01 -e 2024-01-07

# Show help for all options
npm run backfill-database -- --help
```

The database backfill utility will:

- Read archived data from `output/responses-archive/YYYY/YYYY-MM-DD.zip` files
- Extract temperature readings and insert into PostgreSQL database
- **Database-only operation**: Does NOT update almanac metadata or store new files
- Use upsert logic to safely handle duplicate entries
- Report success/failure for each date processed
- Handle missing archive files gracefully
- Require `DATABASE_URL` environment variable to be set

**When to use:**

- **Recommended**: Use `npm run backfill-database` when you have archived data and just need to fill database gaps
- **Alternative**: Use `npm run retry-missed-days` when you need to fetch new data from the API and update almanac metadata

## Run Tests

```bash
scripts/test
```

## Neon Database (start integrating Jul 11, 2025)

- https://vercel.com/ns0s-projects/~/stores/integration/neon/store_xu5iln4FGQCUuKPA/guides
- https://console.neon.tech/app/org-still-band-62770543/projects -- Login is same as vercel github auth

### SQL Manual loads

Using the conn string from https://console.neon.tech/app/projects/dry-thunder-38275234/branches/br-nameless-morning-adsy4myo?branchId=br-nameless-morning-adsy4myo&database=neondb

```shell
npm run csv-export 2018-10-06 2025-07-10 export-to-2025-07-09.csv

psql 'postgresql://neondb_owner:readacted@ep-polished-bird-ad1ybvh5-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' -c "\COPY lake_temperature_readings FROM export-to-2025-07-09.csv CSV HEADER"
```

## Latest Status - Jul 3, 2025

I migrated to nodejs, some of those dayjs tests still fail, they are currently commented out with xtest.

Future project migrate to luxon as I need in weather-list app as it is modern and maintained and should resolve all the tz bugs issues.

## Latest Status - Sept 24, 2023

- Fixed 2 of 3 failing tests
    - Upgraded from dayjs@1.10.6 to dayjs@1.11.10 resolved the Minimal ADT bug failure
    - Fixed 'Timezone conversion is broken when not using DST Time test' as far as I can tell it was expecting the wrong value I have now fixed it with confirmations using https://www.timeanddate.com/worldclock/converter.html?iso=20211130T224200&p1=286&p2=1440&p3=195
- This workaround https://github.com/iamkun/dayjs/issues/1805#issuecomment-1464953487 may be a fix for the final failing 'Github Issue: tz func with valueOf bug' test, TODO investigate further also see my updated comment in said test

### Before

````bash
```bash
Github Issue: tz func with valueOf bug ... FAILED (6ms)
Minimal ADT bug ... FAILED (4ms)
Github Issue: Timezone conversion is broken when not using DST Time ... FAILED (3ms)
````

### After

```bash
Github Issue: tz func with valueOf bug ... FAILED (6ms)
Minimal ADT bug ... ok (5ms)
Github Issue: Timezone conversion is broken when not using DST Time ... ok (4ms)
```

- I'm guessing it was this fix https://github.com/iamkun/dayjs/pull/2420

## Latest Status - Nov 12, 2022

- Continue to work on the new-metrics-avgs branch but the main branch is working fine as is so no rush
- Currently in Atlantic Standard Time the almanac-test.ts passes, but it will fail again when we are in Daylight time (yes confirmed 'Minimal ADT bug' fails on Aug 27, 2023).
- There are several Dayjs TZ bugs as documented in the TODOs, and people in this thread even recommend switching to Luxon or another lib due to them https://github.com/iamkun/dayjs/issues/1805
- I have created dayjs-test.ts to attempt to test the bugs found in the issue tracker. One is failing.
- I have created date-fns-test.ts to attempt to tell if date-fns can handle the problematic tz issues, thereby I could switch out to using it.
- Conclusion: Currently waiting on day.js to fix bugs, or switch to date-fns (seems to not have any issues due to using the builtin TZ functionality, but still need to confirm it has all the functionality we need) / Luxon (though no TS support and nodejs??)

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

### Deno

- The current version of the dayjs package does not export modules using the ESM standard deno expects (as seen if you go to `https://cdn.skypack.dev/dayjs@1.10.6`). The new version of [Dayjs 2.0 plans to support in their roadmap here](https://github.com/iamkun/dayjs/issues/1281). Here is my current workaround:
    ```typescript
    import dayjs from 'https://cdn.skypack.dev/dayjs@1.10.6';
    import dayjsTypes from 'https://deno.land/x/dayjs@v1.10.6/types/index.d.ts';
    ```
- Deno seems to work well but there are other options:
    - Use nodejs via https://github.com/vercel/ncc
    - See discussion with Github team on running postprocessing stage with Python (and other possibilities) instead of requiring Deno https://github.com/githubocto/flat/issues/12#issuecomment-844300624

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
