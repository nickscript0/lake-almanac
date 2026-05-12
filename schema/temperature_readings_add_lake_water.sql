-- Migration for existing lake_temperature_readings tables.
-- Adds the lake-water columns and updates the primary key so multiple
-- ThingSpeak channels can coexist safely in the same table.

ALTER TABLE lake_temperature_readings
    ADD COLUMN IF NOT EXISTS deep_water_temp NUMERIC(6,3),
    ADD COLUMN IF NOT EXISTS lake_air_temp NUMERIC(6,3),
    ADD COLUMN IF NOT EXISTS surface_water_temp NUMERIC(6,3);

ALTER TABLE lake_temperature_readings
    DROP CONSTRAINT IF EXISTS lake_temperature_readings_pkey;

ALTER TABLE lake_temperature_readings
    ADD CONSTRAINT lake_temperature_readings_pkey
    PRIMARY KEY (channel_id, entry_id, date_recorded);
