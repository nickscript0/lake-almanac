# lake-almanac

## Run Archiver
```bash
scripts/archiver.sh --save-responses 2018-10-06 2021-07-31 2>&1 | tee output.log

# Process yesterday only (this is what the daily Github Action runs)
./scripts/archiver.sh
```

## Run Tests
```bash
scripts/test.sh
```

## TODOs
- More metrics: seasonal hi/low/averages [winter,spring,summer,fall,year]
- More metrics: largest variation days

## Notes
### Deno
- The current version of the dayjs package does not export modules using the ESM standard deno expects (as seen if you go to `https://cdn.skypack.dev/dayjs@1.10.6`). The new version of [Dayjs 2.0 plans to support  in their roadmap here](https://github.com/iamkun/dayjs/issues/1281). Here is my current workaround:
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
