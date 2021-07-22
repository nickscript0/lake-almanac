#!/bin/bash

deno run -q --allow-read --allow-write --allow-run --allow-net --allow-env --unstable src/archiver.ts "$@"