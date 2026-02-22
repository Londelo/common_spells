# Coding Conventions - vf-lib

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `baseUrl`, `metricName`, `serviceName` |
| Functions | camelCase | `hasRequiredActions`, `formatContext`, `makeRequestOperationName` |
| Higher-Order Functions | PascalCase | `TimedAsyncFn`, `TracedRequest`, `BatchFn` |
| Classes | PascalCase | `NodeTracerProvider`, `DynamoDBClient` |
| Files (JS/TS) | camelCase | `index.js`, `putMetric.js`, `TracedRequest.ts` |
| Constants | SCREAMING_SNAKE | `MONITORING_TAG`, `DEFAULT_SOCKET_TIMEOUT`, `MAX_BATCH_SIZE` |
| Enum Values | SCREAMING_SNAKE | `INVITE`, `EDIT`, `PUBLISH`, `SECONDS` |
| Type Definitions | PascalCase | `TracedAsyncFnParams`, `MapFunction`, `DynamoDBParams` |
| Private Keys | camelCase with underscore prefix | N/A - not commonly used |

**Observations:**
- Consistent use of camelCase for variables and standard functions
- PascalCase reserved for factory functions and higher-order functions that return configured instances
- TypeScript types follow PascalCase convention
- Constants are consistently SCREAMING_SNAKE_CASE

## Formatting

| Rule | Setting | Source |
|------|---------|--------|
| Indentation | 2 spaces | ESLint |
| Quotes | Single (JS), Double (JSX) | ESLint |
| Semicolons | Required (always) | ESLint |
| Trailing commas | Never | ESLint |
| Line length | 120 characters | ESLint |
| Max file lines | 200 lines | ESLint |
| Max nesting depth | 2 levels | ESLint |
| Brace style | Stroustrup | ESLint |
| Arrow parens | As needed | ESLint |
| Arrow body style | As needed | ESLint |
| End of line | Always newline | ESLint |
| Padded blocks | Never | ESLint |
| Object curly spacing | Always | ESLint `{ foo }` |

## ESLint Rules (Key Functional Programming Focus)

### Functional Programming Rules (eslint-plugin-fp)

| Rule | Setting | Impact |
|------|---------|--------|
| fp/no-arguments | error | Prohibits `arguments` object |
| fp/no-class | error | **No ES6 classes allowed** |
| fp/no-delete | error | No delete operator |
| fp/no-get-set | error | No getters/setters |
| fp/no-loops | error | **No for/while loops - use map/reduce** |
| fp/no-let | error | **No let - use const only** |
| fp/no-mutating-assign | error | No Object.assign mutations |
| fp/no-mutating-methods | error | No array mutations (except Ramda) |
| fp/no-mutation | error | No object mutation (except ctx/context) |

### Complexity Rules

| Rule | Setting | Impact |
|------|---------|--------|
| complexity | error, max 7 | Cyclomatic complexity ≤ 7 |
| max-depth | error, max 2 | Nesting depth ≤ 2 |
| max-len | error, 120 | Line length ≤ 120 chars |
| max-lines | error, 200 | File length ≤ 200 lines |

### Code Quality Rules

| Rule | Setting |
|------|---------|
| no-unused-vars | error |
| prefer-const | error |
| no-var | error |
| consistent-return | error |
| eqeqeq | error |
| no-console | error |
| no-else-return | error |
| no-nested-ternary | error |
| no-param-reassign | error |
| no-plusplus | error |
| prefer-arrow-callback | error |
| prefer-template | error |
| arrow-callback-return | error |

### Prohibited Syntax

The following are completely banned via `no-restricted-syntax`:
- `DoWhileStatement`
- `ForStatement`
- `ForInStatement`
- `ForOfStatement`
- `SwitchCase`
- `SwitchStatement`
- `WhileStatement`
- `WithStatement`

## Import Organization

Imports follow a consistent pattern:

1. **Third-party dependencies** (Node.js core, npm packages)
2. **Internal package dependencies** (`@verifiedfan/*`)
3. **Relative imports** (local files)
4. **Type imports** (TypeScript only)

**Example from `tracing/src/index.ts`:**
```typescript
// Third-party
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';

// Internal
import * as traceUtils from './utils';
import TracedAsyncFn from './TracedAsyncFn';
import TracedRequest from './TracedRequest';

// Types
import { GlobalTracerParams } from './types';
```

**Example from `normalizers/src/index.js`:**
```javascript
// Third-party
import utf8 from 'utf8';
import removeAccents from 'remove-accents';
import * as R from 'ramda';

// Local
import userAgent from './userAgent';
```

## File Structure

### Typical Module Pattern

1. **Imports** (organized as above)
2. **Constants** (if any)
3. **Helper functions** (internal, not exported)
4. **Main functions** (exported)
5. **Default export** (if applicable)
6. **Named exports**

### Example: `delay/src/index.js`
```javascript
const delay = timeoutMillis => new Promise(resolve => setTimeout(resolve, timeoutMillis));

export default delay;
```

### Example: `jwt/src/jwt.js`
```javascript
import jwt from 'jsonwebtoken';

const ops = { issuer: 'titan-lib', algorithm: 'RS256' };

export const Verify = ({ publicKey }) => token => jwt.verify(token, publicKey, ops);

export const SignPayload = ({ privateKey, expiresIn }) =>
  payload => jwt.sign(payload, privateKey, { ...ops, expiresIn });
```

### Example: Complex Module (`tracing/src/TracedAsyncFn.ts`)
```typescript
// 1. Imports
import { trace, context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { TracedAsyncFnParams } from './types';
import { getTracer } from './utils';

// 2. Helper functions
const getParentSpan = () => trace.getSpan(context.active());

// 3. Main export
const TracedAsyncFn = <Params, Result>(...) => async(...params) => { ... };

export default TracedAsyncFn;
```

## Comment Style

### Minimal Comments Philosophy
- Code is largely **self-documenting** through descriptive names
- Comments used sparingly, primarily for:
  - Complex algorithms
  - Business logic explanations
  - ESLint disable directives (with reason)
  - External references (URLs to docs)

### Examples

**ESLint Disable with Reason:**
```javascript
// eslint-disable-line complexity
```

**External Reference:**
```typescript
// https://docs.splunk.com/observability/en/gdi/opentelemetry/components/otlp-receiver.html
```

**Inline Documentation:**
```javascript
// assume everything before first comma is last name
if (fullStr.indexOf(',') > -1) { ... }
```

**TypeScript Comments:**
```typescript
/*
 Experimental Attributes [incubating entry-point]
 (https://github.com/open-telemetry/opentelemetry-js/blob/main/semantic-conventions/README.md)
*/
```

## TypeScript Configuration

### Compiler Options (tsconfig.json)

| Option | Value | Impact |
|--------|-------|--------|
| strict | true | All strict checks enabled |
| target | es5 | ES5 output |
| module | commonjs | CommonJS modules |
| declaration | true | Generate .d.ts files |
| sourceMap | true | Generate source maps |
| forceConsistentCasingInFileNames | true | Case-sensitive imports |
| esModuleInterop | true | Better CommonJS interop |
| noImplicitAny | false | ⚠️ Allows implicit any |

**Note:** `noImplicitAny: false` is inconsistent with `strict: true` - this is likely a legacy setting that should be reviewed.

## Consistency Assessment

### Strong Consistency
- ✅ **Naming conventions** - Very consistent across all packages
- ✅ **Functional programming style** - Heavily enforced via ESLint
- ✅ **Import patterns** - Consistent organization
- ✅ **Arrow functions** - Used universally over function declarations
- ✅ **Const over let/var** - Strictly enforced
- ✅ **Ramda usage** - Consistent functional utilities

### Areas of Inconsistency
- ⚠️ **File size violations** - Some files exceed 200 lines (`aws/dynamodb/index.ts` at 286 lines, `tm-pacman/censoredWords.js` at 2956 lines)
- ⚠️ **Complexity violations** - Some functions have `// eslint-disable-line complexity` comments
- ⚠️ **Mutation allowances** - Selective disabling of fp/no-mutation for specific cases
- ⚠️ **TypeScript noImplicitAny** - Disabled despite strict mode

### ESLint Disable Patterns
Common reasons for disabling rules:
- `complexity` - For unavoidably complex functions (e.g., `phone` normalizer)
- `fp/no-loops` - For intentional serial processing (e.g., `MapAsyncSerial`)
- `fp/no-mutating-methods` - For performance-critical operations
- `max-lines` - For large configuration files (e.g., DynamoDB SDK)
- `no-console` - For metric logging (`putMetric.js`)

## Engineering Principles

### Functional Programming (Strong)

**Evidence:**
- Strict ESLint rules via `eslint-plugin-fp`
- No classes (`fp/no-class: error`)
- No loops (`fp/no-loops: error`)
- No `let` (`fp/no-let: error`)
- No mutations (`fp/no-mutation: error`)
- Heavy use of Ramda (`R.pipe`, `R.compose`, `R.map`, etc.)
- Higher-order functions everywhere
- Point-free style preferred

**Examples:**
- `clean.js` - Pure functional pipeline with `R.cond`, `R.pipe`, `R.map`
- `TracedAsyncFn.ts` - Higher-order function returning configured async function
- `BatchFn` - `R.pipeP` for async composition
- No mutable state except where explicitly allowed (Koa context)

### DRY (Strong)

**Evidence:**
- Shared utility packages (`@verifiedfan/date`, `@verifiedfan/string-utils`, `@verifiedfan/object-utils`)
- Reusable higher-order functions (`TimedAsyncFn`, `TracedAsyncFn`, `BatchFn`)
- Common configurations abstracted (`createNodeHttpHandler`)
- Minimal duplication across packages

**Examples:**
- `map-utils/src/index.ts` - `MapAsyncSerial`, `MapAsyncParallel` used across multiple packages
- `tracing/` - Reusable tracing wrappers for any async function
- `cloudwatch-stdout/` - Generic metric logging pattern
- `normalizers/` - Shared data normalization utilities

### KISS (Moderate to Strong)

**Evidence:**
- Most functions are 10-30 lines
- Single responsibility functions
- Clear, focused utility modules
- Simple abstractions

**Exceptions:**
- `aws/dynamodb/index.ts` (286 lines) - Complex SDK wrapper
- `normalizers/src/index.js` (138 lines) - Many small functions in one file
- Some complex regex patterns in normalizers

**Examples:**
- `delay/src/index.js` (3 lines) - Simplest possible implementation
- `crypto/src/index.ts` (30 lines) - Thin wrapper, no unnecessary complexity
- `permissions/index.js` (7 lines) - Single purpose utility

### YAGNI (Strong)

**Evidence:**
- No speculative features
- Functions do exactly what they need to
- No unused exports
- Minimal configuration options

**Examples:**
- `simpleUniqueId` - Generates IDs, nothing more
- `delay` - Just wraps setTimeout in a Promise
- Each utility package has focused scope

### Single Responsibility (Strong)

**Evidence:**
- Each package has single clear purpose
- Functions are focused on one task
- Clear separation of concerns

**Examples:**
- `jwt/` - JWT operations only
- `crypto/` - Crypto utilities only
- `delay/` - Just delays
- `normalizers/` - Data normalization only
- `tracing/` - Distributed tracing only

### Composition Over Inheritance (Strong)

**Evidence:**
- No classes allowed (`fp/no-class: error`)
- Higher-order functions used for behavior composition
- Functional composition via Ramda

**Examples:**
- `TimedAsyncFn` - Wraps any async function with timing
- `TracedAsyncFn` - Wraps any async function with tracing
- `BatchFn` - Wraps any function with batching
- `R.pipe`, `R.compose` used extensively

### Immutability (Strong)

**Evidence:**
- `fp/no-mutation: error`
- `fp/no-let: error`
- `prefer-const: error`
- Ramda for data transformations (immutable by default)

**Exceptions:**
- Allowed mutations: `ctx` (Koa context), `context`, Ramda objects
- Performance-critical operations with explicit disables

**Examples:**
- `flatten.js` - Uses spread operator, no mutations
- `clean.js` - Pure transformations with `R.map`, `R.pickBy`
- All normalizers return new values

### Open/Closed (Not Observed)

**Evidence:**
- Few extension points
- Most modules are final implementations
- No plugin architecture
- Direct implementation preferred

### Interface Segregation (Moderate)

**Evidence:**
- Small, focused exports from each module
- TypeScript types are specific to use case

**Counter-evidence:**
- Some modules export many functions (`normalizers/src/index.js`)
- `aws/dynamodb/index.ts` returns large API object

### Dependency Inversion (Weak)

**Evidence:**
- Direct dependencies on concrete implementations
- No dependency injection patterns
- Configuration via parameters, not abstractions

**Counter-evidence:**
- Some higher-order functions accept dependencies (`TimedAsyncFn({ asyncFn })`)
- Request functions accept configuration objects

### Code Readability

**Overall Rating:** Good to Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| Intention-Revealing Names | Excellent | `hasRequiredActions`, `formatContext`, `makeRequestOperationName` |
| Narrative Flow | Good | Most files read top-to-bottom logically |
| Abstraction Consistency | Good | Functions stay at one level mostly |
| Self-Documentation | Excellent | Code explains itself, minimal comments needed |

### Highly Readable Examples

**1. `delay/src/index.js` - Perfect simplicity**
```javascript
const delay = timeoutMillis => new Promise(resolve => setTimeout(resolve, timeoutMillis));
export default delay;
```
- Function name reveals complete intent
- Implementation matches expectation exactly
- No comments needed

**2. `jwt/src/jwt.js` - Clear configuration abstraction**
```javascript
const ops = { issuer: 'titan-lib', algorithm: 'RS256' };

export const Verify = ({ publicKey }) => token => jwt.verify(token, publicKey, ops);
export const SignPayload = ({ privateKey, expiresIn }) =>
  payload => jwt.sign(payload, privateKey, { ...ops, expiresIn });
```
- Function names tell complete story
- Configuration extracted to constant
- Curried interface makes usage clear

**3. `object-utils/src/clean.js` - Functional pipeline readability**
```javascript
const isNonArrayObject = R.both(isObject, R.complement(isArray));
const removeEmptyProperties = R.pickBy(R.both(R.complement(R.isNil), R.complement(R.isEmpty)));

const clean = R.cond([
  [R.isNil, emptyObject],
  [isString, R.trim],
  [isNonArrayObject, R.pipe(
    R.defaultTo({}),
    R.map(val => clean(val)),
    removeEmptyProperties
  )],
  [R.T, R.identity]
]);
```
- Composed predicates have descriptive names
- Pipeline reads like prose
- Conditional logic expressed declaratively

**4. `tracing/src/TracedRequest.ts` - Clear operation naming**
```typescript
const makeRequestOperationName = ({ serviceName, method = 'GET', accessPath = '/' }) =>
  `${serviceName}[${method}]: ${accessPath}`;

const selectStatusCode: AttributesSelector<unknown[], { statusCode: AttributeValue }> =
  R.pipe(
    R.ifElse(
      R.has('error'),
      R.path(['error', 'statusCode']),
      R.path(['result', 'statusCode'])
    ),
    statusCode => ({ statusCode: statusCode as AttributeValue })
  );
```
- Helper function names are self-explanatory
- Type annotations enhance readability
- Logic flow is clear

### Needs Improvement

**1. ⚠️ `normalizers/src/index.js:20-35` - Complex phone normalization**
```javascript
export const phone = input => { // eslint-disable-line complexity
  const str = input && input.toString && input.toString();
  if (!str) {
    return null;
  }
  const normalized = normalizePhone(str);
  const normalizedIntl = normalizePhone(`+${str}`);
  const normalizedPlusOne = normalizePhone(`+1${str}`);
  const numbersOnly = str.replace(NON_DIGITS_REGEX, '');

  return normalized && normalized.length && normalized[0]
    || normalizedIntl && normalizedIntl.length && normalizedIntl[0]
    || normalizedPlusOne && normalizedPlusOne.length && normalizedPlusOne[0]
    || (numbersOnly.length >= MIN_PHONE_LENGTH) && `+${numbersOnly}`
    || null;
};
```
**Issues:**
- Complex boolean chain hard to follow
- Multiple fallback strategies not clearly separated
- Disabled complexity rule indicates problem
- Name `phone` doesn't indicate it returns first valid normalization

**Suggestion:** Extract each normalization strategy into named functions

**2. ⚠️ `normalizers/src/index.js:84-93` - Mixed abstraction levels**
```javascript
export const nameObj = (first, last = null, includeLowerCase = false) => {
  const userName = [first, last].map(str => (namePart(str) || '').trim());
  const obj = { full: userName.join(' ').trim(), first: userName[0], last: userName[1] };

  if (includeLowerCase) {
    // eslint-disable-next-line fp/no-mutation
    obj.lowercase = { first: lowerCase(obj.first), last: lowerCase(obj.last) };
  }
  return obj;
};
```
**Issues:**
- Mixes object construction with conditional mutation
- `includeLowerCase` flag creates branching behavior
- Mutation disable indicates fighting against style

**Suggestion:** Use functional approach with conditional spread

**3. ⚠️ `log/src/index.js:27-32` - Clever but unclear**
```javascript
const formatContext = context => {
  let ix = 0; // eslint-disable-line fp/no-let
  return context
    .split('/')
    .reduceRight((acum, str) => [(ix += 1) > 2 ? str.charAt(0) : str, ...acum], [])
    .join('/');
};
```
**Issues:**
- Side-effecting reducer with counter
- Ternary logic not immediately clear
- Name doesn't explain truncation behavior
- Multiple rule disables suggest problematic approach

**Suggestion:** `formatContextAbbreviated` with clearer implementation

## Summary

This codebase demonstrates a **strong commitment to functional programming principles** enforced through comprehensive ESLint rules. The code is generally **highly readable** with excellent naming conventions and consistent structure.

**Strengths:**
- Functional purity strongly enforced
- Excellent naming conventions
- DRY via shared utility packages
- Strong single responsibility
- Composition over inheritance
- Immutability by default

**Areas for Improvement:**
- Some files exceed 200-line limit
- Complexity violations in edge cases
- Mutation allowances could be reduced
- TypeScript `noImplicitAny` should be enabled
- Some complex functions need refactoring

The codebase follows Ramda-style functional programming very consistently and maintains high code quality through strict linting rules.
