#!/bin/bash

# Runs a deno environment set to UTC timezone, useful for finding tz bugs
# Usage: 
# src/test/run-env-utc.sh
# scripts/test

docker build -t now scripts/
docker run --rm -it -v $(pwd):/workdir now /bin/bash