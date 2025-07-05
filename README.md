# lake-almanac

## Run Archiver

```bash
# With date range and response saving
npm run archiver -- --save-responses 2018-10-06 2021-07-31 2>&1 | tee output.log

# Process from local archive (rebuild almanac from stored responses)
npm run archiver -- --use-local-archive 2020-01-01 2020-01-31

# Process yesterday only (this is what the daily Github Action runs)
npm run archiver
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

## Run Tests

```bash
scripts/test
```

## Latest Status - Jul 3, 2025

scripts/test results in 1 failing test:

```shell
 ERRORS

Github Issue: tz func with valueOf bug => ./src/test/dayjs-test.ts:35:6
error: AssertionError: Values are not equal:


    [Diff] Actual / Expected


-   2021-10-31T12:19:36.303Z
+   2021-10-31T13:19:36.303Z


  throw new AssertionError(message);
        ^
    at assertEquals (https://deno.land/std@0.102.0/testing/asserts.ts:259:9)
    at file:///home/parallels/projects/lake-almanac/src/test/dayjs-test.ts:60:5

 FAILURES

Github Issue: tz func with valueOf bug => ./src/test/dayjs-test.ts:35:6

FAILED | 11 passed | 1 failed (306ms)

error: Test failed
```

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
