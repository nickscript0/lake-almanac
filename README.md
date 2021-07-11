# mabel-almanac

## Run Archiver
```bash
scripts/archiver.sh
```
## Sample Requests

Rest API: https://www.mathworks.com/help/thingspeak/readdata.html

```bash
# Existing cabin outdoor/indoor temp
https://api.thingspeak.com/channels/581842/feed.json?days=3
https://api.thingspeak.com/channels/581842/feed.json?days=7&average=30

# Start and End time, uses date format YYYY-MM-DD%20HH:NN:SS

```
