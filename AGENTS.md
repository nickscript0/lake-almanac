# AGENTS.md - Lake Almanac Project

## Build/Test Commands

- **Run all tests**: `npm test`
- **Run single test**: `npm run test:single "test name"`
- **Build**: `npm run build`
- **Development**: `npm run dev`

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
