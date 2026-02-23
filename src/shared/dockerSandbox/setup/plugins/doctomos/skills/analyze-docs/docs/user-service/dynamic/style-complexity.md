# Code Complexity - user-service

## Metrics

| Metric | Value | Source |
|--------|-------|--------|
| **Avg function length** | ~61 lines | Calculated from app/ directory |
| **Max nesting depth** | 2 | ESLint: `max-depth: [error, 2]` |
| **Max cyclomatic complexity** | 7 | ESLint: `complexity: [error, 7]` |
| **Max file size** | 200 lines (enforced) | ESLint: `max-lines: [error, 200]` |
| **Avg file size** | ~61 lines | Based on app/ directory |
| **Largest file** | 380 lines | `app/datastore/users.js` |
| **Total source files** | ~120 files | Estimated from app/, lib/, features/ |

## Complexity Observations

### Simple Areas

These files/modules demonstrate excellent simplicity and clarity:

#### 1. **Middlewares** (`lib/middlewares/`)
- **`responseFormatter.js`**: 8 lines - simple delegation to library
- **`jwt.js`**: 18 lines - configuration and export
- **`correlation.js`**: 9 lines - clean middleware setup
- **Rating**: Excellent (minimal, focused, no complexity)

#### 2. **Validators** (`lib/middlewares/validators/`)
- **`ValidatorMiddleware.js`**: 18 lines
- Single purpose: validate or throw
- Uses `R.ifElse` for clean conditional logic
- **Rating**: Excellent (textbook single responsibility)

#### 3. **Utility Functions** (various files)
Examples of simple, well-designed functions:

- **`maskPhoneNumber`** (`contacts.js:40-43`): 4 lines, uses `R.pipe` for clarity
- **`selectUserTmId`** (`lookups.js:30`): 1 line, clear path selector
- **`hasContact`** (`contacts.js:32-38`): 7 lines, clear boolean check with functional composition

**Why these are simple**:
- Single responsibility
- Pure functions (no side effects)
- Functional composition eliminates branching
- Descriptive names remove need for comments

#### 4. **Error Definitions** (`lib/error/index.js`)
- Plain object exports
- No logic, just data
- Easy to understand and maintain
- **Rating**: Excellent (declarative configuration)

### Complex Areas

These areas have elevated complexity requiring careful maintenance:

#### 1. **`app/datastore/users.js`** (380 lines)
- **Issue**: Largest file in codebase (90% over limit)
- **Complexity**: Contains ~15+ MongoDB operations
- **Impact**: High - core data access layer
- **Why complex**:
  - Single file handles all user database operations
  - Mixes queries, updates, upserts, deletes
  - MongoDB query builders with multiple conditionals
- **Recommendation**: Split into smaller modules by operation type:
  - `users.queries.js` - read operations
  - `users.mutations.js` - write operations
  - `users.integrations.js` - integration-specific queries

#### 2. **`app/managers/users/lookups.js`** (229 lines)
- **Issue**: 15% over file size limit (requires `/* eslint-disable max-lines */`)
- **Complexity**: Contains 10+ lookup functions with overlapping logic
- **Why complex**:
  - Multiple lookup strategies (by email, tmId, userId, globalUserId, etc.)
  - Each lookup has validation → query → format pipeline
  - Shared selectors and formatters
- **Recommendation**: Split by lookup type:
  - `lookups.ids.js` - ID-based lookups
  - `lookups.contacts.js` - email/phone lookups
  - `lookups.integrations.js` - wallet/integration lookups

#### 3. **`app/managers/users/index.js`** (179 lines)
- **Issue**: Close to file size limit
- **Complexity**: Several functions exceed complexity limit
- **Examples**:
  - `updateSelf` (line 92): Marked `// eslint-disable-next-line complexity`
    - Handles 8+ optional parameters
    - Multiple integration types
    - Conditional contact saving
    - Name validation
  - `findSelf` (line 74): Token signature validation + caching logic
- **Why complex**:
  - User update encompasses many concerns (name, contacts, integrations)
  - Authentication logic mixes token handling, permissions, caching
- **Recommendation**: Extract sub-operations:
  - `updateIntegrations(managerCtx, { user, params })`
  - `updateContacts(managerCtx, { user, params })`
  - `updateName(managerCtx, { user, firstName, lastName })`

#### 4. **`app/managers/users/contacts.js`** (144 lines)
- **Issue**: Near file size limit
- **Complexity**: Handles email and phone validation + parsing + saving
- **Why complex**:
  - Phone number parsing (international formats via `libphonenumber-js`)
  - Multiple contact types with different validation rules
  - Upsert logic (has contact? update : add)
- **Current state**: Acceptable - well-organized despite size
- **Watch**: Could grow if more contact types added

#### 5. **Functional Programming Violations** (scattered)
Files with frequent ESLint disables indicate pragmatic complexity:

- **`updateSelf`** (`users/index.js:110,138`):
  - `// eslint-disable-next-line fp/no-let` (line 110)
  - `// eslint-disable-next-line fp/no-mutation` (line 138)
  - **Reason**: Refetching user after async operations requires reassignment

- **`permissions/index.js:65-68`**:
  - `// eslint-disable-next-line fp/no-mutation` (line 65)
  - **Reason**: Building map by mutating accumulator in reduce
  - **Alternative**: Could use `R.fromPairs` + `R.map`, but current approach is clearer

- **`integrations.js:92-93`**:
  - `// eslint-disable-next-line fp/no-mutating-assign` (line 92)
  - **Reason**: `Object.assign` to add token to account object
  - **Alternative**: Spread operator (`{ ...account, token }`)

**Recommendation**: Refactor pragmatic violations where possible to avoid accumulating FP debt.

#### 6. **Deep Destructuring** (`wallet.js:22-74`)
- **Issue**: 4-level nested destructuring with many optional defaults
- **Impact**: Difficult to understand input data shape
- **Example**:
```javascript
const formatWallet = ({
  payment_instrument_token,
  funding_source,
  funding_source_details: {
    additional_instrument_token,
    instrument_token,
    funding_method,
    // ... 10+ more fields
    customer_details: {
      billing_address: {
        name_on_card,
        address_line1,
        // ... 8+ more fields
      } = {}
    } = {}
  }
}) => { /* ... */ };
```
- **Recommendation**:
  - Add type comments or JSDoc
  - Break into smaller formatters: `formatBillingAddress`, `formatFundingSource`

### Cyclomatic Complexity Hot Spots

Functions that exceed the complexity limit (7) and require `// eslint-disable-next-line complexity`:

1. **`updateSelf`** (`users/index.js:92`) - **8+ branches**
   - 8 optional integration parameters
   - Multiple conditional blocks

2. **`formatWallet`** (`wallet.js:22`) - **20+ conditional spreads**
   - Each `...field && { field }` adds complexity

3. **`removeIntegration`** (`integrations.js:55`) - **4+ conditional checks**
   - Validates removal type
   - Checks for conflicting parameters
   - Verifies integration exists

4. **`onUserIntegrationChanged`** (`integrations.js:102`) - **Currently commented out**
   - Would have high complexity (nested loops, filters)

### Nesting Depth Issues

The max nesting depth limit (2) is generally followed, but some areas approach the limit:

- **Query builders** in `datastore/users.js` - MongoDB query objects can nest deeply
- **Conditional formatting** in `wallet.js` - Ternary expressions and object spreads
- **Error handling** in `lookups.js` - Try-catch blocks add one level of nesting

## Complexity by Module

| Module | Avg Lines/File | Complexity | Assessment |
|--------|---------------|------------|------------|
| `lib/middlewares/` | ~15 lines | Low | **Excellent** - simple delegators |
| `lib/error/` | ~75 lines | Low | **Good** - declarative error objects |
| `app/managers/permissions/` | ~160 lines | Medium | **Acceptable** - focused domain |
| `app/managers/users/` | ~80 lines | Medium-High | **Watch** - some large files |
| `app/datastore/` | ~380 lines | High | **Refactor** - `users.js` too large |
| `features/step_definitions/` | ~150 lines | Medium | **Acceptable** - test code |

## Recommendations

### High Priority

1. **Refactor `app/datastore/users.js` (380 lines)**
   - **Impact**: High - core data layer
   - **Action**: Split into 3-4 smaller modules by operation type
   - **Benefit**: Easier testing, maintenance, code review

2. **Simplify `formatWallet` destructuring**
   - **Impact**: Medium - affects readability
   - **Action**: Add type comments or break into smaller formatters
   - **Benefit**: Clearer data contracts

3. **Extract sub-functions from `updateSelf`**
   - **Impact**: Medium - high-traffic function
   - **Action**: Create helper functions for integrations, contacts, names
   - **Benefit**: Reduces complexity score, improves testability

### Medium Priority

4. **Split `lookups.js` (229 lines)**
   - **Impact**: Medium - many functions but well-organized
   - **Action**: Group lookups by type (IDs, contacts, integrations)
   - **Benefit**: Smaller, more focused modules

5. **Replace pragmatic ESLint disables**
   - **Impact**: Low-Medium - code quality
   - **Action**: Refactor `Object.assign` → spread, avoid `let` where possible
   - **Benefit**: Better FP adherence, less technical debt

### Low Priority (Monitor)

6. **Watch file sizes approaching limit**
   - Files at 150+ lines: `contacts.js` (144), `permissions/index.js` (158)
   - **Action**: Monitor for growth, split if necessary

7. **Document Ramda patterns**
   - **Impact**: Low - affects onboarding
   - **Action**: Add README explaining common Ramda patterns used
   - **Benefit**: Easier for new developers

## Positive Patterns to Maintain

1. **Functional composition** - Keeps complexity low by eliminating branching
2. **Selector functions** - Clear, reusable data accessors
3. **Small middleware files** - Single-purpose, easy to understand
4. **Early returns** - Guard clauses reduce nesting
5. **Pure functions** - Easier to test and reason about
6. **Ramda utilities** - Eliminate manual loops and mutations

## Technical Debt Indicators

| Indicator | Count | Severity | Notes |
|-----------|-------|----------|-------|
| `/* eslint-disable max-lines */` | ~3 files | Medium | Indicates oversized files |
| `// eslint-disable-next-line complexity` | ~4 functions | Medium | Functions exceeding complexity limit |
| `// eslint-disable-next-line fp/no-let` | ~3 instances | Low | Pragmatic FP violations |
| `// eslint-disable-next-line fp/no-mutation` | ~4 instances | Low | Necessary mutations |
| Files > 200 lines | 3+ files | Medium | Exceeds enforced limit |
| Functions > 50 lines | ~10 functions | Low-Medium | Approaching complexity threshold |

**Overall Assessment**: Technical debt is **manageable** but should be addressed proactively to prevent accumulation.
