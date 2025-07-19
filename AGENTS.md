# AGENTS.md - Lake Almanac Project

## Build/Test Commands

- **Run all tests**: `npm test`
- **Run single test**: `npm run test:single "test name"`
- **Build**: `npm run build`
- **Development**: `npm run dev`

## Data Export Commands

- **CSV Export**: `npm run csv-export <start-date> <end-date> [output-file]`
    - Exports archived temperature data to CSV for PostgreSQL import
    - Example: `npm run csv-export 2020-01-01 2020-12-31 lake-data-2020.csv`
    - Generates PostgreSQL COPY command for easy database import

## Database Integration

- **PostgreSQL Database**: The archiver automatically saves temperature readings to PostgreSQL
    - Requires `DATABASE_URL` environment variable with connection string
    - Uses table schema defined in `schema/temperature_readings.sql`
    - Inserts data after successful almanac processing
    - Includes upsert logic to handle duplicate entries
    - Database failures are logged as warnings but don't stop archival process

## Format Validation Commands

- **Compare Almanac Formats**: `npm run compare-formats`
    - Compares old almanac format (main branch) with new format (migrate-to-nodejs branch)
    - Validates data integrity during format migration
    - Reports format differences and new features
    - Fetches data directly from GitHub branches for comparison

## Code Style Guidelines

### Runtime & Imports

- Uses **Node.js** runtime with TypeScript
- Import from npm packages (dayjs, jszip, commander, etc.)
- No `.ts` extensions in relative imports
- External imports at top, relative imports after

### TypeScript Configuration

- Target: ES2015, strict mode enabled
- Use explicit types for interfaces and function parameters
- Prefer `interface` over `type` for object shapes

### Naming Conventions

- **Constants**: UPPER_SNAKE_CASE (`TIMEZONE`, `SEQUENCE_SIZE`)
- **Functions**: camelCase (`updateAlmanac`, `getDailyMetrics`)
- **Types/Interfaces**: PascalCase (`AlmanacYear`, `TemperatureReading`)
- **Variables**: camelCase with descriptive names

### Code Organization

- Group related functionality in modules
- Use JSDoc comments for complex functions
- Prefer explicit return types for exported functions
- Use `const` for immutable values, avoid `var`
