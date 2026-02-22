# Coding Conventions - appsync

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Variables | camelCase | `globalUserId`, `armScore`, `eventInfo` |
| Functions | camelCase | `applyScoreModelBoost`, `getGlobalUserId`, `isLoggedIn` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_PHONE_LENGTH`, `SCORE_MODEL_BOOST_ENABLED`, `HIGH_RISK_ARM_THRESHOLD` |
| Types/Interfaces | PascalCase | `FanIdentity`, `UserInfo`, `Context` |
| Files | camelCase | `phonescore.ts`, `activateLnaa.ts`, `getBotOrNot.ts` |
| Test Files | camelCase + `.spec.ts` | `phonescore.spec.ts`, `getBotOrNot.spec.ts` |

## Formatting

| Rule | Setting |
|------|---------|
| Indentation | 2 spaces |
| Quotes | Single quotes (JS/TS), double quotes (JSX) |
| Semicolons | Required (always) |
| Trailing commas | Never |
| Line length | 120 characters |
| Max file length | 200 lines |
| Max nesting depth | 2 levels |
| Object curly spacing | Required (e.g., `{ foo }` not `{foo}`) |
| Brace style | Stroustrup (else/catch on new line) |
| Arrow parens | As needed |
| Arrow body style | As needed (implicit return when possible) |
| Multiple empty lines | Max 1 |

## ESLint Rules (Key Enforcements)

| Rule | Setting | Rationale |
|------|---------|-----------|
| `no-var` | error | Enforce `const` and `let` only |
| `prefer-const` | error | Prefer immutable variables |
| `no-console` | error | No console.log in production code |
| `complexity` | error (max 7) | Limit cyclomatic complexity |
| `max-depth` | error (max 2) | Prevent deeply nested logic |
| `max-lines` | error (max 200) | Keep files focused and readable |
| `no-plusplus` | error | Avoid `i++` (use `i += 1` instead) |
| `prefer-template` | error | Use template literals over string concatenation |
| `prefer-arrow-callback` | error | Use arrow functions for callbacks |
| `no-nested-ternary` | error | Avoid nested ternaries for readability |
| `no-else-return` | error | Remove unnecessary else blocks |
| `arrow-body-style` | error | Use implicit returns when possible |
| `no-restricted-syntax` | error | Disallow: for/while loops, switch statements, do-while |

**Note on Loops**: The codebase prohibits traditional loop constructs (`for`, `while`, `do-while`, `switch`) in favor of functional approaches (`.map()`, `.filter()`, `.reduce()`, etc.).

## TypeScript Rules

| Rule | Setting |
|------|---------|
| `noImplicitAny` | false (lenient) |
| `esModuleInterop` | true |
| Target | esnext |
| Module | esnext |

## Import Organization

Imports are organized in the following order:
1. External library imports from `@aws-appsync/utils` (Context, util, runtime)
2. Local type imports from `./types`
3. Local utility imports from `./shared` or `./utils`

Example:
```typescript
import { Context, util, runtime } from '@aws-appsync/utils';
import { FanIdentity } from '../types';
import { throwIfNotLoggedIn } from '../shared';
```

## File Structure

### Resolver/Function Files

All resolvers and functions follow this pattern:

```typescript
import { Context, util } from '@aws-appsync/utils';

// Constants at top
const SOME_CONSTANT = 'value';

// Helper functions (if any)
const helperFunction = (param) => {
  // logic
};

// Required exports
export function request(ctx: Context) {
  // Request logic
  return {};
}

export function response(ctx: Context) {
  // Response logic
  return ctx.result;
}
```

### Test Files

Test files use Jest with this pattern:

```typescript
import { evaluateCode } from '../../../spec/support';

describe('functionName', () => {
  it('describes expected behavior', async() => {
    const context = {
      arguments: { /* args */ }
    };

    const { result, error } = await evaluateCode({
      context,
      functionName: 'functionName'
    });

    expect(result).toEqual(/* expected */);
  });
});
```

## Comment Style

- **JSDoc Comments**: Used sparingly, mainly for exported utility functions
- **Inline Comments**: Used to explain "why" not "what"
- **File Header Comments**: Not commonly used; code is self-documenting

Example of good comment usage:
```typescript
/**
 * Fetches bot status for the user and returns isBot in the result.
 * Score adjustment is handled by calcAccountScore.
 */
export function request(ctx: Context) {
  // ...
}
```

## Code Organization Patterns

### Early Returns
Heavy use of `runtime.earlyReturn()` for short-circuiting:
```typescript
if (!ctx.source.isLoggedIn) {
  runtime.earlyReturn();
}
```

### Error Handling
Use AppSync's `util.error()` for GraphQL errors:
```typescript
if (!apiKey) {
  return throwInternalServerError();
}
```

### Context Sharing
Use `ctx.stash` to pass data between pipeline functions:
```typescript
ctx.stash.eventId = ctx.args.options.eventId;
```

## Consistency Assessment

**Overall Consistency: Good**

The codebase demonstrates strong adherence to its configured ESLint rules:

✅ **Highly Consistent:**
- Naming conventions (camelCase for functions/variables, SCREAMING_SNAKE_CASE for constants)
- File naming (camelCase.ts pattern)
- Import organization
- Use of `const` over `let`
- Single quotes for strings
- Semicolon usage
- Arrow functions for callbacks
- Early returns instead of nested conditionals

⚠️ **Minor Inconsistencies:**
- TypeScript strictness is lenient (`noImplicitAny: false`)
- Some use of `any` type (with eslint-disable comments)
- Mix of explicit and implicit function return types

## Engineering Principles

| Principle | Adherence | Evidence |
|-----------|-----------|----------|
| **DRY** | Strong | Extensive use of shared utilities (`shared.ts`, `utils/index.ts`), reusable pipeline functions, helper functions abstracted across files |
| **KISS** | Strong | Functions average 20-40 lines, clear single-purpose logic, minimal abstractions, straightforward control flow |
| **YAGNI** | Strong | No speculative features, focused on current requirements, no unused code patterns |
| **Single Responsibility** | Strong | Each resolver/function handles one specific step, clear separation of concerns (e.g., `getBotOrNot` only fetches bot data) |
| **Open/Closed** | Moderate | Pipeline architecture allows extension via new functions, but individual functions often need modification for changes |
| **Liskov Substitution** | Not Applicable | Minimal use of inheritance/classes (functional approach) |
| **Interface Segregation** | Moderate | TypeScript types are focused but some types are unions of multiple concerns |
| **Dependency Inversion** | Weak | Direct dependencies on AppSync utils and DynamoDB, no abstraction layer for data sources |
| **Functional Programming** | Strong | Pure functions, immutability (prefer-const), no loops (use map/filter/reduce), minimal side effects |
| **WET** | Weak | Minimal duplication; shared utilities prevent repetition |
| **AHA** | Moderate | Some abstractions delayed until patterns emerge, but early abstraction in utility functions |

### Detailed Evidence

#### DRY (Strong)
- `shared.ts:20-23` - `demandRecordKeys()` centralizes key generation logic, used across 3+ files
- `shared.ts:45-78` - `lambdaRequest()`/`lambdaResponse()` templates reused for all Lambda data sources
- `utils/index.ts:39-52` - `applyArmAdjustment()` shared across multiple score calculation flows
- Type definitions in `types/` folder prevent duplication of interface definitions

#### KISS (Strong)
- `resolvers/identity.ts:1-24` - Only 24 lines, clear single purpose: extract identity info
- `resolvers/checkLiveness.ts:1-10` - Minimal passthrough resolver, no complex logic
- `functions/getBotOrNot.ts:1-33` - 33 lines, simple DynamoDB GetItem with early return pattern
- Average function length: ~30 lines, max complexity score of 7 enforced by ESLint

#### Single Responsibility (Strong)
- `functions/getAccountFanscoreMemberId.ts` - Only responsible for fetching fanscore by memberId
- `functions/getBotOrNotCursor.ts` - Only responsible for determining bot cursor refresh date
- `functions/calcAccountScore.ts` - Only responsible for score calculation pipeline
- Clear separation: data fetching functions vs data transformation functions

#### Functional Programming (Strong)
- No use of classes or inheritance
- All functions are pure or have explicit side effects (DynamoDB operations)
- ESLint rules prohibit loops in favor of `.map()`, `.filter()`, `.reduce()`
- Example: `demandRecordQuery.ts:86-89` uses `.map()` to transform records
- Heavy use of `const` (enforced by `prefer-const` rule)

#### Open/Closed (Moderate)
- ✅ Pipeline architecture allows adding new functions without modifying existing ones
- ⚠️ Individual functions often need modification for feature changes
- Example: Adding new score adjustment requires modifying `calcAccountScore.ts`

#### Dependency Inversion (Weak)
- Direct imports from `@aws-appsync/utils` throughout codebase
- No abstraction layer for DynamoDB operations
- Data source logic tightly coupled to AppSync runtime
- **Justification**: This is appropriate for AppSync resolvers which are inherently coupled to AWS infrastructure

## Code Readability

**Overall Rating:** Excellent

| Aspect | Rating | Notes |
|--------|--------|-------|
| **Intention-Revealing Names** | Excellent | Function and variable names clearly express purpose and intent |
| **Narrative Flow** | Excellent | Code reads top-to-bottom with logical progression |
| **Abstraction Consistency** | Excellent | Functions stay at consistent abstraction levels |
| **Self-Documentation** | Excellent | Code structure and naming eliminate need for most comments |

### Highly Readable Examples

#### 1. **`functions/getBotOrNot.ts:8-24`** - Perfect narrative flow
```typescript
export function request(ctx: Context) {
  const { globalUserId } = ctx.args;
  const refreshDate = ctx.stash.botCursor?.refreshDate;

  if (!(globalUserId && refreshDate)) {
    runtime.earlyReturn(ctx.prev.result);
  }

  return {
    version: '2017-02-28',
    operation: 'GetItem',
    key: {
      PK: util.dynamodb.toDynamoDB(`g:${globalUserId}`),
      SK: util.dynamodb.toDynamoDB(`botornot:${refreshDate}`)
    }
  };
}
```
**Why readable:**
- Clear preconditions checked first
- Early return for edge cases
- Return value clearly shows DynamoDB operation structure
- Variable names explain what data is being fetched

#### 2. **`utils/applyScoreModelBoost.ts:24-39`** - Intention-revealing names
```typescript
export const applyScoreModelBoost = (
  ctx: Context,
  score: number,
  selectedValue: number = Math.random()
): { score: number; tag?: string } => {
  if (!lookupBooleanFromEnv(ctx.env, SCORE_MODEL_BOOST_ENABLED)) {
    return { score };
  }
  if (score < ELIGIBILITY_LOWER_LIMIT || score > ELIGIBILITY_UPPER_LIMIT) {
    return { score };
  }
  if (selectedValue < BOOST_PROBABILITY) {
    return { score: getBoostedScore(), tag: SCORE_PIPELINE_TAGS.SCORE_MODEL_BOOST };
  }
  return { score };
};
```
**Why readable:**
- Function name `applyScoreModelBoost` tells complete story
- Constants like `ELIGIBILITY_LOWER_LIMIT` explain themselves
- Logic guards read like requirements documentation
- No comments needed to understand flow

#### 3. **`functions/calcAccountScore.ts:38-74`** - Abstraction consistency
```typescript
export function request(ctx: Context) {
  const { score: baseScore, armScore, hasDemandRecord, isBot } = ctx.prev.result || {};

  if (baseScore === null || baseScore === undefined) {
    handleMissingScore(ctx);
  }

  let score = baseScore;
  const tags: string[] = [];

  // 1. ARM adjustment (if enabled)
  score = applyArmAdjustment(ctx, score, armScore);

  // 2. Randomization
  score = applyRandomization(score);

  // 3. Event boost
  if (hasDemandRecord) {
    score = applyEventBoost(score);
  }

  // 4. Bot zeroing
  score = applyBotZeroing(score, isBot);

  // 5. Score model boost
  const boostResult = applyScoreModelBoost(ctx, score);
  score = boostResult.score;
  if (boostResult.tag) {
    tags.push(boostResult.tag);
  }

  return { payload: {
    ...ctx.prev.result,
    score: clampScore(score),
    tags
  } };
}
```
**Why readable:**
- Pipeline steps numbered and commented
- Each transformation is a separate function call
- Functions like `applyEventBoost()` tell complete story without reading implementation
- High-level orchestration logic, details hidden in helper functions

### Areas of Excellence

**1. Function Naming**
- `throwIfNotLoggedIn()` - Action is clear from name
- `selectAccountFanscoreResult()` - Purpose is obvious
- `makeEntryKey()` - Construction function, clear intent
- `hasNonDigitCharacter()` - Boolean function with clear predicate

**2. Constant Naming**
- `MAX_HIGH_RISK_ACCOUNT_SCORE` - Self-explanatory, no magic numbers
- `LNAA_SOURCE = 'tm_artist_presale'` - Named constant explains business context
- `DEFAULT_LOW_RISK_SCORE` - Clear purpose, exported for testing

**3. Code Structure**
- Early returns eliminate nested if-else blocks
- Guard clauses make happy path obvious
- Pipeline pattern creates clear data flow narrative

**4. Type Clarity**
- `FanIdentity`, `UserInfo`, `Context` types make data structures explicit
- Return types like `{ score: number; tag?: string }` document function contracts

### Minor Areas for Improvement

#### 1. **Some cryptic variable extraction** - `functions/saveEntryRecord.ts:97-100`
```typescript
...savedEntry && {
  '#updated': 'updated',
  '#fanModified': 'fanModified'
}
```
**Suggestion:** Extract to named variable like `updateFieldNames` for clarity

#### 2. **Complex ternary in template** - `functions/saveEntryRecord.ts:76`
```typescript
`${savedEntry ? '#date.#updated = :updated, #date.#fanModified = :fanModified' : '#date = :date'}, `
```
**Suggestion:** Extract to `getDateExpression(savedEntry)` helper function

These are minor issues in an otherwise highly readable codebase. The consistent application of naming conventions, functional programming principles, and architectural patterns creates a codebase that reads almost like documentation.
