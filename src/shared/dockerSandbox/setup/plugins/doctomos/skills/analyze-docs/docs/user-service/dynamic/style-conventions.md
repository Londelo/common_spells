# Coding Conventions - user-service

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `userId`, `tmSignature`, `managerCtx` |
| Functions | camelCase | `findByUserId`, `lookupTicketmasterIds`, `authenticateAndUpsertUser` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_TM_IDS_LIMIT`, `ME_TTL`, `CONTACT_TYPES` |
| Files | camelCase or kebab-case (mixed) | `contacts.js`, `user-service` |
| Identifiers (min length) | 2+ chars (enforced) | `id`, `fn`, `db` (exceptions for common short names) |

**Note**: File naming is inconsistent - some files use camelCase (`lookups.js`, `contacts.js`) while others use kebab-case in directories. Generally camelCase for source files.

## Formatting

| Rule | Setting | Source |
|------|---------|--------|
| Indentation | 2 spaces | ESLint: `indent: [error, 2]` |
| Quotes | Single quotes | ESLint: `quotes: [error, 'single']` |
| JSX Quotes | Double quotes | ESLint: `jsx-quotes: [error, 'prefer-double']` |
| Semicolons | Required | ESLint: `semi: [error, 'always']` |
| Trailing commas | Never | ESLint: `comma-dangle: [error, 'never']` |
| Line length | 120 chars | ESLint: `max-len: [error, 120]` |
| Max file length | 200 lines | ESLint: `max-lines: [error, 200]` |
| Object curly spacing | Always | ESLint: `object-curly-spacing: [error, 'always']` |
| Brace style | Stroustrup | ESLint: `brace-style: [error, 'stroustrup']` |
| Arrow parens | As needed | ESLint: `arrow-parens: [error, 'as-needed']` |
| End of file | Always newline | ESLint: `eol-last: [error, 'always']` |
| Padded blocks | Never | ESLint: `padded-blocks: [error, 'never']` |

## ESLint Rules (Key)

### Functional Programming (Enforced)

This codebase strongly enforces **functional programming principles** through the `eslint-plugin-fp`:

| Rule | Setting | Impact |
|------|---------|--------|
| `fp/no-class` | error | **Classes are forbidden** - only functions allowed |
| `fp/no-let` | error | **`let` is forbidden** - use `const` only |
| `fp/no-loops` | error | **All loops forbidden** - must use `map`, `filter`, `reduce`, etc. |
| `fp/no-mutation` | error (with exceptions) | Mutation restricted; allows `this`, `ctx`, `context` |
| `fp/no-mutating-assign` | error | `Object.assign` mutation forbidden |
| `fp/no-mutating-methods` | error | Mutating array methods forbidden (allows Ramda) |
| `fp/no-delete` | error | `delete` operator forbidden |
| `fp/no-get-set` | error | Getters/setters forbidden |
| `fp/no-arguments` | error | `arguments` object forbidden |

**Allowed Exceptions**:
- Mutation of `ctx` and `context` (Koa context objects)
- Ramda (`R`) methods are allowed as they're safe
- `this` mutation allowed (for class-like patterns with functions)

### Code Quality & Complexity

| Rule | Setting | Description |
|------|---------|-------------|
| `complexity` | [error, 7] | **Maximum cyclomatic complexity of 7** |
| `max-depth` | [error, 2] | **Maximum nesting depth of 2** |
| `max-lines` | [error, 200] | Files limited to 200 lines |
| `no-console` | error | Console statements forbidden (use Debug/Log) |
| `no-else-return` | error | No else after return |
| `no-nested-ternary` | error | Nested ternaries forbidden |
| `no-plusplus` | error | `++` and `--` forbidden |
| `prefer-const` | error | Must use `const` when not reassigning |
| `prefer-arrow-callback` | error | Arrow functions required for callbacks |

### ES6+ Features

| Rule | Setting | Description |
|------|---------|-------------|
| `no-var` | error | `var` forbidden, use `const` |
| `prefer-template` | error | Template literals required over concatenation |
| `prefer-rest-params` | error | Rest parameters over `arguments` |
| `prefer-spread` | error | Spread over `.apply()` |
| `object-shorthand` | error | Object method/property shorthand required |
| `arrow-body-style` | [error, 'as-needed'] | Implicit return when possible |

### Syntax Restrictions

| Rule | Setting | Description |
|------|---------|-------------|
| `no-restricted-syntax` | error | **Forbidden**: `for`, `for-in`, `for-of`, `while`, `do-while`, `switch`, `delete` |
| `curly` | error | Braces required for all control statements |
| `eqeqeq` | error | Strict equality (`===`) required |
| `dot-notation` | error | Dot notation required when possible |

### Import Organization

| Rule | Setting |
|------|---------|
| `no-duplicate-imports` | error |
| `plugin:import/errors` | extended |

## Import Organization

Imports typically follow this pattern:

1. **External libraries** (Ramda, Debug, etc.)
2. **Internal monorepo packages** (`@verifiedfan/*`)
3. **Relative imports** (local modules)
4. **Named exports** at end of file (re-exports)

**Example** (from `app/managers/users/index.js`):
```javascript
import * as R from 'ramda';
import Debug from 'debug';
import { error, normalizers } from '@verifiedfan/lib';
import { makeToken } from '../../../lib/Jwt';
import { isUserSupreme } from '../permissions';
import { authenticateAndUpsertUser } from './upsertUsers';
import { saveContact, validateContact } from './contacts';
```

## File Structure

Files typically follow this organization:

1. **Imports** (grouped as above)
2. **Constants** (SCREAMING_SNAKE_CASE)
3. **Helper Functions** (local utilities, not exported)
4. **Main exported functions** (public API)
5. **Named re-exports** (optional, at end)

## Comment Style

- **Debug statements**: `Debug` library used extensively for debugging (e.g., `const debug = Debug('titan:users:managers')`)
- **Logging**: Structured logging via custom `Log` utility
- **JSDoc**: Minimal usage, found mainly on complex functions
- **Inline comments**: Used sparingly, mainly for eslint-disable and clarifications
- **ESLint overrides**: Common (e.g., `// eslint-disable-next-line complexity`, `// eslint-disable-next-line fp/no-let`)

**Examples**:
```javascript
/**
 * delete user and associated user export & entry data
 */
export const deleteUser = async(managerCtx, { jwt, isSupremeUser, userId }) => {
  // implementation
};
```

```javascript
// eslint-disable-next-line complexity
export const updateSelf = async(managerCtx, { userId, token, params }) => {
  // complex logic that exceeds complexity limit
};
```

## Consistency Assessment

### Strong Consistency
- **Functional programming rules**: Strictly enforced and followed
- **Naming conventions**: Very consistent camelCase for functions/variables
- **Import patterns**: Consistent grouping and organization
- **Debug/logging patterns**: Consistent use of Debug library and custom Log
- **Error handling**: Consistent use of custom error utilities

### Areas of Inconsistency
- **File length violations**: Several files exceed 200-line limit (e.g., `lookups.js` - 229 lines, `users.js` - 380 lines) with `/* eslint-disable max-lines */` comments
- **Complexity violations**: Some functions marked with `// eslint-disable-next-line complexity` indicate complexity > 7
- **Mutation allowances**: Code uses `// eslint-disable-next-line fp/no-let` and `// eslint-disable-next-line fp/no-mutation` suggesting adherence is challenging in certain areas
- **File naming**: Mixed camelCase and kebab-case (though kebab-case mainly in tooling)

### ESLint Disable Comments (Indicators of Rule Violations)

Frequently disabled rules:
- `max-lines` - for larger files like datastores and complex managers
- `complexity` - for complex business logic functions
- `fp/no-let` - when reassignment is pragmatically needed
- `fp/no-mutation` - for performance-critical or unavoidable mutations
- `fp/no-mutating-assign` - for object composition scenarios

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **Functional Programming** | **Strong** | Enforced via ESLint fp plugin; no classes, no loops, immutability required |
| DRY | **Strong** | Extensive use of Ramda utilities, shared helpers, minimal duplication |
| KISS | **Moderate** | Functions avg ~61 lines, but complexity limit (7) keeps logic simple |
| Single Responsibility | **Strong** | Each file/function has focused purpose (e.g., `contacts.js`, `wallet.js`, `lookups.js`) |
| Dependency Inversion | **Moderate** | `managerCtx` pattern abstracts dependencies; datastore/service injected |
| Open/Closed | **Weak** | Limited extension points; direct modification common |
| Interface Segregation | **Moderate** | Managers provide focused APIs, but some functions take many params |
| YAGNI | **Strong** | No speculative code; focused on current requirements |
| Composition over Inheritance | **Strong** | No classes; heavy use of function composition via Ramda |
| Immutability | **Strong** | Enforced via `fp/no-let`, `fp/no-mutation` rules |

### Functional Programming (Strong)

This codebase is fundamentally **functional** - enforced through strict ESLint rules:

**Evidence**:
- **No classes**: `fp/no-class` forbids OOP; all code uses functions
- **No mutation**: `fp/no-let`, `fp/no-mutation`, `fp/no-mutating-methods` enforce immutability
- **No loops**: `fp/no-loops` requires functional iteration (`map`, `reduce`, `filter`)
- **Heavy Ramda usage**: Extensive use of `R.pipe`, `R.compose`, `R.path`, `R.prop`, etc.
- **Pure selectors**: Functions like `selectUserTmId`, `selectGlobalUserId` use Ramda paths
- **Function composition**: Complex logic built via composition (e.g., `lookups.js:48-56`)

**Examples**:

1. **Function composition** (`lookups.js:48-56`):
```javascript
const splitStrVals = R.ifElse(
  R.is(String),
  R.pipe(
    R.split(','),
    R.reject(R.isEmpty),
    R.map(R.trim)
  ),
  R.always([])
);
```

2. **Immutable selectors** (`lookups.js:30-46`):
```javascript
const selectUserTmId = R.path(['integrations', 'ticketmaster', 'id']);
const selectGlobalUserId = R.path(['integrations', 'ticketmaster', 'globalUserId']);
const SelectFirstAccount = type => R.pathOr(null, [type, 'list', '0', 'account']);
```

3. **No loops, functional iteration** (`lookups.js:108-122`):
```javascript
return users.reduce((groups, user) => {
  const userEmails = selectUserEmailList(user);
  return groups.concat(
    userEmails
      .filter(({ account }) => emailSet.has(account))
      .map(({ account }) => ({ email: account, userId, tmId }))
  );
}, []);
```

### DRY (Strong)

**Evidence**:
- Shared utilities across files (e.g., `contacts.js` exports validators used everywhere)
- Ramda utilities eliminate duplication (path selectors, transformations)
- Manager pattern (`managerCtx`) provides consistent access to datastores/services
- Custom error utilities (`lib/error/`) centralize error handling
- Reusable middlewares (`lib/middlewares/`)

**Examples**:
- `lookups.js:30-56` - Selector functions reused across multiple lookup functions
- `contacts.js:15-18` - `validatorsByContactType` map eliminates conditional logic duplication
- Error objects (`lib/error/index.js`) - Centralized error definitions

### KISS (Moderate)

**Evidence**:
- **Complexity limit**: Max cyclomatic complexity of 7 enforced via ESLint
- **Max nesting**: 2 levels max enforced
- **Average function length**: ~61 lines (reasonable)
- **Guard clauses**: Early returns used to reduce nesting

**Areas of concern**:
- Some functions marked `// eslint-disable-next-line complexity` indicate complex business logic
- Example: `updateSelf` (`users/index.js:92`) handles many integration types
- Wallet formatting (`wallet.js:22-74`) has deep destructuring

**Examples of simplicity**:
- `ValidatorMiddleware.js`: 18 lines, single responsibility, clear logic
- `responseFormatter.js`: 8 lines, simple delegation
- `throwIfInvalidUserId.js`: Focused validation logic

### Single Responsibility (Strong)

**Evidence**:
- Each manager file handles one domain: `users/`, `permissions/`, `contacts.js`, `wallet.js`, `integrations.js`
- Each function has focused purpose (e.g., `lookupTicketmasterIds`, `validateContact`, `maskPhoneNumber`)
- Middleware files are single-purpose: `jwt.js`, `correlation.js`, `responseFormatter.js`

**Examples**:
- `contacts.js`: All contact-related logic (validation, saving, formatting)
- `wallet.js`: Wallet operations only (fetch, format, upsert)
- `permissions/index.js`: Permission CRUD operations only

### Dependency Inversion (Moderate)

**Evidence**:
- **`managerCtx` pattern**: Dependencies (datastore, services) injected via context object
- **Middleware composition**: Koa middleware stack allows flexible composition
- Functions accept abstractions (`managerCtx`) rather than concrete implementations

**Example** (`users/index.js:44`):
```javascript
export const authenticate = async(managerCtx, { tm_token, tmuo }) => {
  const user = await authenticateAndUpsertUser(managerCtx, { tm_token, tmuo });
  // Uses managerCtx.datastore and managerCtx.service without knowing concrete types
};
```

**However**: No formal interfaces/protocols; relies on object shape conventions.

### Composition over Inheritance (Strong)

**Evidence**:
- No classes (enforced by `fp/no-class`)
- Heavy use of higher-order functions (e.g., `InstrumentedAsyncOperation.js`, `ValidatorMiddleware.js`)
- Ramda composition utilities (`R.pipe`, `R.compose`, `R.applySpec`)

**Examples**:
1. **HOF for middleware** (`ValidatorMiddleware.js:9-15`):
```javascript
const ValidatorMiddleware = ({ predicate, errorFn }) => R.ifElse(
  predicate,
  (ctx, next) => next(),
  ctx => { throw errorFn(ctx); }
);
```

2. **Function factory** (`users/index.js:63-72`):
```javascript
const FindByUserId = doLookupFromPrimary => {
  const lookupFn = doLookupFromPrimary ? 'findByIdFromPrimary' : 'findById';
  return async(managerCtx, { userId }) => {
    const user = await managerCtx.datastore.users[lookupFn]({ userId });
    return normalizers.stringifyObjectId(user);
  };
};
```

### Immutability (Strong)

**Evidence**:
- `fp/no-let` enforces `const` only
- `fp/no-mutation` forbids property mutation (except `ctx`, `context`)
- `fp/no-mutating-methods` forbids `.push()`, `.splice()`, etc.
- Uses immutable operations: `.concat()`, `.map()`, `.filter()`, spread operator

**Examples**:
```javascript
// Immutable array operations (lookups.js:120)
return groups.concat(
  userEmails
    .filter(({ account }) => emailSet.has(account))
    .map(({ account }) => ({ email: account, userId, tmId }))
);

// Immutable object updates via Ramda (users/index.js:23)
const setAuthToken = ({ user, token }) => R.set(R.lensPath(['auth', 'token']), token, user);

// Spread operator (wallet.js:55-68)
return {
  payment_instrument_token,
  funding_source,
  ...additional_instrument_token && { additional_instrument_token },
  ...issuer && { issuer }
};
```

**Pragmatic exceptions**: Some files use `// eslint-disable-next-line fp/no-let` when reassignment is necessary (e.g., refetching data).

## Code Readability

**Overall Rating:** Good

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | **Excellent** | Function names clearly express intent (`lookupTicketmasterIds`, `validateContact`, `maskPhoneNumber`) |
| Narrative Flow | **Good** | Most files read top-to-bottom; selectors defined before use; exports often at top |
| Abstraction Consistency | **Good** | Functions stay at consistent abstraction levels; Ramda helpers separate concerns |
| Self-Documentation | **Good** | Code is mostly self-explanatory; heavy Ramda usage requires FP familiarity |

### Highly Readable Examples

1. **`contacts.js:45-60` - Clear intent, simple flow**
   - Function name `saveContact` is self-explanatory
   - Logic: check if contact exists → update or add
   - Error handling is explicit

2. **`permissions/index.js:30-39` - Intention-revealing validation**
   - Function `throwIfInvalidActions` clearly states purpose
   - Logic is straightforward: check if array → filter invalids → throw if found

3. **`lookups.js:83-98` - Ramda composition with clear selectors**
   - Selectors (`selectUserId`, `selectUserTmId`) are self-documenting
   - `formatTMUserIdPairs` uses `R.applySpec` for clear data shaping

4. **`ValidatorMiddleware.js` - Minimal, focused, clear**
   - 18 lines, single responsibility
   - Uses `R.ifElse` for clean conditional logic

### Needs Improvement

1. **⚠️ `wallet.js:22-74` - Deep destructuring obscures intent**
   - `formatWallet` has 4-level destructuring with defaults
   - Difficult to understand data shape at a glance
   - **Suggestion**: Break into smaller helper functions or add type comments

2. **⚠️ `users/index.js:92-142` - Mixed abstraction levels**
   - `updateSelf` handles validation, integration saving, contacts, names all in one function
   - 50+ lines with multiple concerns
   - **Suggestion**: Extract sub-operations into named functions

3. **⚠️ Heavy Ramda usage assumes FP expertise**
   - Code like `R.pipe(R.split('.'), R.last)` is concise but opaque to FP beginners
   - `R.applySpec`, `R.lensPath`, `R.pathOr` require Ramda knowledge
   - **Mitigation**: Team likely has FP experience; Debug statements help

4. **⚠️ `lookups.js` - Large file (229 lines) with many functions**
   - Good: Each function is focused
   - Bad: File exceeds 200-line limit (requires `/* eslint-disable max-lines */`)
   - **Suggestion**: Split into smaller modules by concern (e.g., `tmIdLookups.js`, `emailLookups.js`)

### Ramda Patterns (Impact on Readability)

The codebase uses **Ramda extensively**, which impacts readability:

**Positive**:
- Eliminates imperative code (no loops, mutations)
- Composition creates reusable logic
- Selectors (`R.path`, `R.prop`) are self-documenting

**Challenges**:
- Requires functional programming knowledge
- Point-free style can obscure intent (e.g., `R.pipe(R.split('.'), R.last)`)
- Learning curve for developers unfamiliar with Ramda

**Example** (good use of Ramda - `lookups.js:100-106`):
```javascript
const formatContacts = ({ users }) => users.map(R.applySpec({
  userId: selectUserId,
  firstName: selectFirstName,
  lastName: selectLastName,
  email: selectFirstEmailAccount,
  phone: selectFirstPhoneAccount
}));
```

This is **highly readable** because:
- `R.applySpec` clearly shows output shape
- Selectors have descriptive names
- Declarative intent (what, not how)
