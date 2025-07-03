# Deno to Node.js Migration Plan

## Phase 1: Setup Node.js Environment

### 1.1 Initialize Node.js Project
```bash
npm init -y
npm install --save-dev typescript @types/node ts-node nodemon
npm install --save-dev @types/jest jest ts-jest
```

### 1.2 Create package.json scripts
```json
{
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "test:watch": "jest --watch",
    "dev": "nodemon --exec ts-node src/index.ts"
  }
}
```

### 1.3 Update tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

## Phase 2: Dependency Migration

### 2.1 Replace CDN imports with npm packages
| Current Deno Import | Node.js Equivalent |
|-------------------|-------------------|
| `dayjs` from skypack | `npm install dayjs` |
| `@types/dayjs` from deno.land | `npm install --save-dev @types/dayjs` |
| `std/testing/asserts` | `npm install --save-dev jest @types/jest` |
| `std/fs/mod` | Node.js `fs/promises` |
| `std/path/mod` | Node.js `path` |
| `jszip` from deno.land | `npm install jszip @types/jszip` |
| `std/flags` | `npm install commander` |

### 2.2 Install dependencies
```bash
npm install dayjs jszip commander
npm install --save-dev @types/dayjs @types/jszip @types/commander
```

## Phase 3: Code Migration

### 3.1 Update import statements
**Before (Deno):**
```typescript
import dayjs from 'https://cdn.skypack.dev/dayjs@1.11.10';
import { exists } from 'https://deno.land/std@0.102.0/fs/mod.ts';
```

**After (Node.js):**
```typescript
import dayjs from 'dayjs';
import { access } from 'fs/promises';
```

### 3.2 Replace Deno APIs with Node.js equivalents

#### File Operations
**Before:**
```typescript
await Deno.writeTextFile(path, content);
await Deno.readTextFile(path);
await Deno.writeFile(path, data);
```

**After:**
```typescript
import { writeFile, readFile } from 'fs/promises';
await writeFile(path, content, 'utf8');
await readFile(path, 'utf8');
await writeFile(path, data);
```

#### File Existence Check
**Before:**
```typescript
import { exists } from 'https://deno.land/std@0.102.0/fs/mod.ts';
if (await exists(path)) { ... }
```

**After:**
```typescript
import { access } from 'fs/promises';
try {
  await access(path);
  // file exists
} catch {
  // file doesn't exist
}
```

#### Command Line Arguments
**Before:**
```typescript
import { parse } from 'https://deno.land/std@0.102.0/flags/mod.ts';
const args = parse(Deno.args);
```

**After:**
```typescript
import { Command } from 'commander';
const program = new Command();
program.parse();
```

#### Process Exit
**Before:**
```typescript
Deno.exit(1);
```

**After:**
```typescript
process.exit(1);
```

### 3.3 Update test framework
**Before (Deno):**
```typescript
import { assertEquals } from 'https://deno.land/std@0.102.0/testing/asserts.ts';
Deno.test('test name', () => {
  assertEquals(actual, expected);
});
```

**After (Jest):**
```typescript
describe('test suite', () => {
  test('test name', () => {
    expect(actual).toEqual(expected);
  });
});
```

### 3.4 Update path operations
**Before:**
```typescript
import { join } from 'https://deno.land/std@0.102.0/path/mod.ts';
```

**After:**
```typescript
import { join } from 'path';
```

### 3.5 Update directory creation
**Before:**
```typescript
import { ensureDir } from 'https://deno.land/std@0.102.0/fs/mod.ts';
await ensureDir(folderPath);
```

**After:**
```typescript
import { mkdir } from 'fs/promises';
await mkdir(folderPath, { recursive: true });
```

## Phase 4: File Structure Updates

### 4.1 Remove .ts extensions from relative imports
**Before:**
```typescript
import { isBefore } from './util.ts';
```

**After:**
```typescript
import { isBefore } from './util';
```

### 4.2 Create jest.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/test/**'
  ]
};
```

### 4.3 Update test script
**Before (scripts/test):**
```bash
deno test --allow-read --allow-write --unstable src/test/**
```

**After (package.json):**
```json
{
  "scripts": {
    "test": "jest",
    "test:single": "jest --testNamePattern"
  }
}
```

## Phase 5: Migration Steps

1. **Setup Node.js environment** (Phase 1)
2. **Install dependencies** (Phase 2)
3. **Update imports systematically** - Start with utility files
4. **Replace Deno APIs** - File operations, CLI args, etc.
5. **Convert tests** - Update test framework and assertions
6. **Update build scripts** - Replace Deno commands with npm scripts
7. **Test thoroughly** - Ensure all functionality works
8. **Update documentation** - README, AGENTS.md

## Phase 6: Validation

### 6.1 Test migration success
- All tests pass with Jest
- Build completes without errors
- Application functionality unchanged
- Performance comparable to Deno version

### 6.2 Update AGENTS.md
```markdown
## Build/Test Commands
- **Run all tests**: `npm test`
- **Run single test**: `npm run test:single "test name"`
- **Build**: `npm run build`
- **Development**: `npm run dev`
```

## Specific Files to Update

### Core Application Files
- `src/almanac.ts` - Update dayjs imports, file operations
- `src/archiver.ts` - Update CLI argument parsing, file operations
- `src/writer.ts` - Update path operations, file operations
- `src/util.ts` - Update dayjs type imports
- `src/thingspeak-sensor-api.ts` - Update dayjs imports

### Test Files
- `src/test/almanac-test.ts` - Convert to Jest syntax
- `src/test/dayjs-test.ts` - Convert to Jest syntax
- `src/test/date-fns-test.ts` - Convert to Jest syntax

### Configuration Files
- Remove `scripts/test` bash script
- Update `tsconfig.json` for Node.js
- Create `package.json` with proper scripts
- Create `jest.config.js`

**Estimated migration time:** 4-6 hours for a codebase of this size.

## Risk Assessment

### Low Risk
- Dayjs library works identically in Node.js
- Core business logic remains unchanged
- TypeScript configuration is straightforward

### Medium Risk
- Test framework conversion requires careful attention
- File operations need thorough testing
- CLI argument parsing changes significantly

### Mitigation Strategies
- Migrate one file at a time
- Run tests after each file migration
- Keep Deno version as backup until Node.js version is fully validated
- Test all file operations with actual data