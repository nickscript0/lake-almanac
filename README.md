# lake-almanac

## Run Archiver
```bash
time ./scripts/archiver.sh 2018-10-06 2021-07-19
```

## TODOs
- More metrics: seasonal hi/low/averages [winter,spring,summer,fall,year]
- More metrics: largest variation days
- Archive every day's json response in an archive folder (in addition to almanac.json)
   - Keep in mind Github's repo storage limits with https://github.com/github/git-sizer
- Port to Deno so we can run it as an action or look into if anyone has made the flat file action compatible with https://github.com/vercel/ncc
   - See discussion with Github team on running postprocessing stage with Python (and other possibilities) instead of requiring Deno https://github.com/githubocto/flat/issues/12#issuecomment-844300624
## Sample Requests

Rest API: https://www.mathworks.com/help/thingspeak/readdata.html

```bash
# Existing lake outdoor/indoor temp
https://api.thingspeak.com/channels/581842/feed.json?days=3
https://api.thingspeak.com/channels/581842/feed.json?days=7&average=30

# Start and End time, uses date format YYYY-MM-DD%20HH:NN:SS

```
