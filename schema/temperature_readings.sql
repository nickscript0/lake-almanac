-- Temperature readings table schema for Lake Almanac data
-- Compatible with CSV export from scripts/csv-exporter.ts

CREATE TABLE lake_temperature_readings (
    date_recorded TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_id      INTEGER      NOT NULL,
    indoor_temp   NUMERIC(6,3),
    outdoor_temp  NUMERIC(6,3),
    deep_water_temp NUMERIC(6,3),
    lake_air_temp NUMERIC(6,3),
    surface_water_temp NUMERIC(6,3),
    channel_id    INTEGER      NOT NULL,
    PRIMARY KEY   (channel_id, entry_id, date_recorded)
);

-- optional: keep a helper index aligned to the main sensor-scoped read
-- patterns used by gap checks and recent-history lookups.
CREATE INDEX lake_temperature_readings_channel_date_idx
          ON lake_temperature_readings (channel_id, date_recorded DESC);

-- turn it into a hypertable
SELECT create_hypertable('lake_temperature_readings', 'date_recorded');
