# lake-almanac

## Run Archiver
```bash
time ./scripts/archiver.sh 2018-10-06 2021-07-19

# Process yesterday only
./scripts/archiver.sh
```

## History
- Nov 8, 2022: I discovered the actions started failing on Sep 12, then hanging for 6h on Oct 4, 2022. This second hanging issue was due to the archiver.ts not exiting when complete. The fix was to simply call Deno.exit(0) at the bottom of main. My guess is something changed in the Deno version that requires this...
  - I also switched to my own fork of `flat` due to the original giving deprecation warnings for Node12

## TODOs
- More metrics: seasonal hi/low/averages [winter,spring,summer,fall,year]
- More metrics: largest variation days
- Archive every day's json response in an archive folder (in addition to almanac.json)
   - Keep in mind Github's repo storage limits with https://github.com/github/git-sizer
- Port to Deno so we can run it as an action or look into if anyone has made the flat file action compatible with https://github.com/vercel/ncc
   - See discussion with Github team on running postprocessing stage with Python (and other possibilities) instead of requiring Deno https://github.com/githubocto/flat/issues/12#issuecomment-844300624

## Github Actions Links
- https://github.com/marketplace/actions/flat-data
   - https://github.com/githubocto/flat-postprocessing
- https://github.com/actions/setup-node

## Sample Requests

Rest API: https://www.mathworks.com/help/thingspeak/readdata.html

```bash
# Existing lake outdoor/indoor temp
https://api.thingspeak.com/channels/581842/feed.json?days=3
https://api.thingspeak.com/channels/581842/feed.json?days=7&average=30

# Start and End time, uses date format YYYY-MM-DD%20HH:NN:SS

```
