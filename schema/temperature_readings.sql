-- Temperature readings table schema for Lake Almanac data
-- Compatible with CSV export from scripts/csv-exporter.ts

CREATE TABLE lake_temperature_readings (
    date_recorded TIMESTAMP WITH TIME ZONE NOT NULL,
    entry_id INTEGER NOT NULL,
    indoor_temp NUMERIC(5,2),
    outdoor_temp NUMERIC(5,2),
    channel_id INTEGER NOT NULL
);

-- Create indexes for common query patterns
CREATE INDEX idx_temperature_readings_date ON temperature_readings (date_recorded);

SELECT create_hypertable('lake_temperature_readings', 'date_recorded');
