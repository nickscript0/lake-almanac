-- Temperature readings table schema for Lake Almanac data
-- Compatible with CSV export from scripts/csv-exporter.ts

CREATE TABLE lake_temperature_readings (
    date_recorded TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_id      INTEGER      NOT NULL,
    indoor_temp   NUMERIC(6,3),
    outdoor_temp  NUMERIC(6,3),
    channel_id    INTEGER      NOT NULL,
    PRIMARY KEY   (entry_id, date_recorded)   -- optimal PK
);

-- optional: keep a helper index purely on the time column for very long
-- range scans.  If you create the PK as above you may drop this, the
-- benefit is marginal.
CREATE INDEX lake_temperature_readings_date_idx
          ON lake_temperature_readings (date_recorded DESC);

-- turn it into a hypertable
SELECT create_hypertable('lake_temperature_readings', 'date_recorded');
