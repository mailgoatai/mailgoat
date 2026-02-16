# CI Error Fix Checklist

## TypeScript Errors to Fix

### 1. fs/promises Issues ✅ FIXED
- [x] src/commands/health.ts - Changed to `import * as fs from 'fs'`
- [x] src/lib/template-manager.ts - Changed to `import * as fs from 'fs'`

### 2. Test Mock Incomplete Properties
Files with missing required properties in test mocks:

#### src/lib/__tests__/formatter.test.ts
Need to add these properties to message mocks:
- `direction: 'incoming' | 'outgoing'`
- `bounce: boolean`
- `received_with_ssl: boolean`

Need to add to inspection mocks:
- `inspected: boolean`

Need to add to attachment mocks:
- `data: string`
- `hash: string`

#### src/lib/__tests__/config.test.ts
- [x] Line 73: Changed `manager.load()` to `await manager.load()`

### 3. Postal Client Test Errors
#### src/lib/__tests__/postal-client.test.ts
Methods that don't exist (need to be removed or implemented):
- `send()` - appears to be removed/renamed
- `getMessages()` - should be `getMessage()`
- `searchMessages()` - needs implementation check

### 4. Template Manager Tests
#### src/lib/__tests__/template-manager.test.ts
- `save()` method doesn't exist - need to check if it was renamed or removed
- Line 356: Missing `amount` variable in shorthand property

### 5. Validation Service Tests
#### src/lib/__tests__/validation-service.test.ts
- Lines 224, 229: Wrong argument type (100 instead of string)
- Line 237: Missing required argument

### 6. Cache Manager
#### src/lib/cache-manager.ts
- Multiple instances of wrong argument type for debug logger
- `"cache"` should match `DebugNamespace` type

### 7. ESLint Errors ⚠️ PARTIALLY FIXED

#### Unused Variables/Imports
- [x] src/commands/delete.ts:18 - `parseDuration` → renamed to `_parseDuration`
- [x] src/commands/search.ts:8,10,76 - Removed unused `Table`, `PostalClient`, and `config`
- [ ] src/lib/__tests__/config-service.test.ts:68 - `defaultConfig` unused
- [ ] src/lib/__tests__/postal-client.test.ts:450 - `clientWithPool` unused
- [ ] src/lib/config-service.ts:194 - `metadata` unused
- [ ] src/services/email-service.ts:8 - `SendMessageResponse` unused

#### Empty Interfaces
- [ ] src/providers/postal/postal-provider.ts:25,34 - Empty interfaces

#### Unused Parameters
- [ ] src/providers/postal/postal-provider.ts:104,120 - Prefix with `_`

#### Type Issues
- [ ] prefer-const in config-service.ts:141

## Priority Order

### HIGH (Blocking Build)
1. Fix fs/promises imports ✅
2. Fix test mocks with missing properties
3. Fix postal-client test method calls
4. Fix template-manager test method calls

### MEDIUM (Blocking Lint)
1. Remove/prefix unused variables
2. Fix empty interfaces
3. Prefix unused parameters

### LOW (Warnings)
1. Fix @typescript-eslint/no-explicit-any warnings (75 total)

## Commands to Test Fixes

```bash
# Type check
npm run typecheck

# Lint check
npm run lint

# Build
npm run build

# Unit tests
npm run test:unit

# All checks
npm run lint && npm run typecheck && npm run build && npm run test:unit
```
