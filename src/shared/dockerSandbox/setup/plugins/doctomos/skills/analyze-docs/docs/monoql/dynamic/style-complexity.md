# Code Complexity - monoql

## Metrics

| Metric | Value | Enforcement |
|--------|-------|-------------|
| Avg function length | ~18 lines | ESLint max-lines: 200 per file |
| Max cyclomatic complexity | 7 | ESLint complexity: 7 (error) |
| Max nesting depth | 3 | ESLint max-depth: 3 (error) |
| Avg file size | ~85 lines | 147 source files analyzed |
| Largest file | 347 lines | `features/templates/newCampaign.js` (test template) |
| Largest production file | 198 lines | `lib/clients/campaigns/index.js` |
| Test files | 10 spec files | `.spec.js` convention |
| Source files | 147 files | `.js` files excluding node_modules |

## Size Distribution

**Most files are small and focused**:
- **0-50 lines**: ~40% of files (utilities, selectors, simple resolvers)
- **51-100 lines**: ~35% of files (standard modules)
- **101-150 lines**: ~18% of files (complex resolvers, clients)
- **151-200 lines**: ~5% of files (feature-rich modules near limit)
- **200+ lines**: ~2% of files (mostly test/feature files)

**Top 5 largest production files**:
1. `lib/clients/campaigns/index.js` - 198 lines (comprehensive API client)
2. `app/graphql/schema/resolvers/Wave/index.js` - 187 lines (SMS wave orchestration)
3. `lib/clients/entries/index.js` - 171 lines (entry service client)
4. `app/graphql/schema/resolvers/Campaign/index.js` - 146 lines (campaign GraphQL resolvers)
5. `app/graphql/schema/resolvers/Campaign/util.js` - 137 lines (campaign transformations)

## Complexity Observations

### Simple Areas ✓

**Excellent simplicity** in foundational modules:

#### 1. **Responses** (`app/responses/`)
- **`error.js`**: 10 lines - Simple error formatter
- **`success.js`**: Similar pattern
- **Complexity**: Trivial
- **Readability**: Perfect

#### 2. **Context Selectors** (`app/context/selectors/`)
- **`appContext.js`**: 1 line - Context accessor
- **`jwt.js`**: ~20 lines - JWT utilities
- **`graphql.js`**: ~30 lines - GraphQL context
- **Complexity**: Very low
- **Pattern**: Pure accessors/mutators

#### 3. **Middleware** (`app/middlewares/`)
- **`cors/resolveCorsOrigin.js`**: 8 lines - CORS config
- **`sessions.js`**: 42 lines - Session middleware
- **Individual middlewares**: Single purpose, < 50 lines each
- **Complexity**: Low to moderate
- **Pattern**: Higher-order functions wrapping simple logic

#### 4. **Simple Resolvers**
- **`Logout.js`**: ~15 lines - Clear logout logic
- **`enums.js`**: 6 lines - Constant definitions
- **`Ppc.js`**: ~30 lines - Straightforward resolver
- **Complexity**: Trivial to low

#### 5. **Client Index Files**
- **`app/graphql/schema/resolvers/index.js`**: 42 lines - Simple aggregator
- **`app/middlewares/index.js`**: Similar pattern
- **Complexity**: Trivial (just imports + exports)

### Moderate Complexity Areas ⚠️

**Functional composition** increases learning curve but manages complexity:

#### 1. **Data Transformations** (`app/graphql/schema/resolvers/Campaign/util.js`)
- **Lines**: 137
- **Cyclomatic complexity**: Within limits (< 7 per function)
- **Challenges**:
  - Dense Ramda pipes: `R.pipe(R.map(maybeConvertFaqsToArray), normalizeLocalizedOutput)`
  - Locale normalization logic (multiple representations)
  - Nested transformations for preferences/content
- **Mitigation**: Small functions, clear naming, consistent patterns
- **Example complexity**:
```javascript
export const normalizeCampaignOutput =
  ({ campaign: { preferences = [], content, locales = [], currentLocale, ...campaign } }) => ({
    ...campaign,
    ...(currentLocale ? { currentLocale: { id: normalizeLocale(currentLocale, '_') } } : {}),
    content: content && normalizeContentOutput(content),
    locales: locales.map(({ id, ...availLocale }) => ({
      ...availLocale,
      id: normalizeLocale(id, '_')
    })),
    preferences: preferences.map(
      ({ label, additional: { defaultLabel, ...additional } = {}, ...preference }) =>
        ({
          ...preference,
          additional: {
            ...additional,
            ...(defaultLabel ? {
              defaultLabel: normalizeLocalizedOutput(defaultLabel)
            } : {})
          },
          label: label && normalizeLocalizedOutput(label)
        })
    )
  });
```
- **Rating**: Moderate (requires FP knowledge, but well-structured)

#### 2. **Selectors with Ramda** (`lib/clients/users/Selectors.js`)
- **Lines**: 22
- **Challenges**:
  - Point-free style
  - Nested `R.pipe` calls
  - `R.applySpec` object building
- **Example**:
```javascript
export const selectPhoneNumbers = R.pipe(
  R.path(['phone', 'list']),
  R.defaultTo([]),
  R.map(R.applySpec({
    account: R.prop('account'),
    is_confirmed: R.pipe(R.path(['date', 'confirmed']), R.isNil, R.not)
  }))
);
```
- **Mitigation**: Once Ramda is understood, this is clearer than imperative
- **Rating**: Moderate (learning curve, then excellent)

#### 3. **DataLoaders Factory** (`app/DataLoaders/index.js`)
- **Lines**: 48
- **Challenges**:
  - Factory pattern with closure over context
  - Side effects (priming caches, updating JWT)
  - Multiple service clients coordinated
- **Example complexity**:
```javascript
authenticate: R.pipeP(
  users.authenticate,
  R.tap(viewer => dataLoaders.me.prime('', viewer)),
  R.tap(viewer => {
    ctx.jwt = selectJwtFromViewer(viewer);
    debug('updated jwt %s', ctx.jwt);
  }))
```
- **Mitigation**: Well-isolated, single responsibility, clear naming
- **Rating**: Moderate (but elegant solution)

### Complex Areas 🔴

**Orchestration logic** reaches upper complexity bounds:

#### 1. **Wave Resolvers** (`app/graphql/schema/resolvers/Wave/index.js`)
- **Lines**: 187 (near 200 limit)
- **Cyclomatic complexity**: Likely 6-7 (at limit)
- **Challenges**:
  - Multiple data sources coordinated (S3, exports, statuses)
  - Async/await with parallel operations
  - Conditional logic for different wave states
  - File upload orchestration
- **Example**:
```javascript
waveList: async(root, queryObject, ctx) => {
  const { campaignId } = queryObject;
  const { jwt, dataLoaders } = ctx;
  const listSmsWaveObjectsData = ListObjectsData({
    jwt,
    campaignId,
    dataLoaders,
    bucket: SMS_WAVE_BUCKET
  });
  const [uploadedWaves, scheduledWaves, sentWaves] = await Promise.all([
    listSmsWaveObjectsData(WAVE_STATUS_DIRS.UPLOADED),
    listSmsWaveObjectsData(WAVE_STATUS_DIRS.SCHEDULED),
    listSmsWaveObjectsData(WAVE_STATUS_DIRS.SENT)
  ]);
  return addStatusToWaveList([...uploadedWaves, ...scheduledWaves, ...sentWaves]);
}
```
- **Mitigation**:
  - Extracted helper functions (`ListObjectsData`, `addStatusToWaveList`)
  - Clear variable naming
  - Promise.all for parallel ops
- **Rating**: Complex but necessary (SMS orchestration inherently complex)
- **Recommendation**: Consider splitting into smaller modules if features expand

#### 2. **Campaign Client** (`lib/clients/campaigns/index.js`)
- **Lines**: 198 (barely under 200 limit)
- **Cyclomatic complexity**: Low per function (but many functions)
- **Challenges**:
  - 20+ API methods in single file
  - Repetitive but not DRY-able (each endpoint unique)
  - Large surface area
- **Structure**:
```javascript
const campaigns = ({ request }) => ({
  byDomain: ({ jwt, domain, ...}) => request({ ... }),
  byCampaignId: ({ jwt, campaignId, ...}) => request({ ... }),
  list: ({ jwt, skip, limit, ...}) => request({ ... }),
  upsert: ({ jwt, id, ...campaign }) => request({ ... }),
  getCampaignContacts: ({ jwt, campaignId }) => request({ ... }),
  // ... 15 more methods
});
```
- **Mitigation**:
  - Consistent pattern per method
  - Clear method names
  - Shared `baseParams`
- **Rating**: Moderate complexity (high line count, low per-function complexity)
- **Recommendation**: Could split into domain sub-modules (campaigns, markets, contacts) if grows

#### 3. **Campaign Resolver** (`app/graphql/schema/resolvers/Campaign/index.js`)
- **Lines**: 146
- **Challenges**:
  - Multiple resolver types (Campaign, Viewer, Query, Mutation)
  - Async coordination with DataLoaders
  - Type resolution logic
  - Cookie/password management
- **Example complexity**:
```javascript
campaign: async(root, { domain, password, locale: dirtyLocale, id: campaignId, showAllLocales }, ctx) => {
  const { jwt, cookies } = ctx;
  const locale = normalizeLocale(dirtyLocale);
  const passwordMap = getPasswordMapFromCookies(cookies);
  const campaignPassword = password || passwordMap[domain];

  const campaign = campaignId ?
    await ctx.dataLoaders.campaignsById.load({ jwt, campaignId, locale, showAllLocales })
    : await ctx.dataLoaders.campaignsByDomain.load({ jwt, domain, locale,
      showAllLocales, password: campaignPassword });

  const normalized = normalizeCampaignOutput({ campaign });
  putStatus(ctx, normalized.status);

  if (password) {
    const updatedPasswordMap = { ...passwordMap, [domain]: password };
    setPasswordCookie({ cookies, passwordMap: updatedPasswordMap });
  }
  return normalized;
}
```
- **Mitigation**:
  - Extracted utilities (normalization, cookie handling)
  - Clear variable names
  - Ternary for conditional loading
- **Rating**: Moderate to complex (business logic complexity)

### Metrics vs. Reality

**ESLint enforcement works**:
- **Complexity = 7 limit**: Forces function decomposition
- **Max-depth = 3**: Prevents deep nesting (no arrow anti-pattern)
- **Max-lines = 200**: Keeps files focused (only 2 files near limit)

**Result**: Despite complex domain logic, code stays maintainable through:
1. Small functions (avg 18 lines)
2. Clear naming
3. Functional composition (Ramda)
4. Separation of concerns

## Nesting Depth Analysis

**Max depth = 3 enforced by ESLint**

**Typical depths observed**:

### Depth 1 (Most common - 70% of code)
```javascript
const campaigns = ({ request }) => ({
  byDomain: ({ jwt, domain, locale }) => request({ ... })
});
```

### Depth 2 (Common - 25% of code)
```javascript
const DataLoaders = ctx => {
  const dataLoaders = R.map(makeDataLoader, {
    me: () => (ctx.jwt ? users.me({ jwt: ctx.jwt }) : {})
  });
  return dataLoaders;
};
```

### Depth 3 (Less common - 5% of code, at limit)
```javascript
preferences: preferences.map(
  ({ label, additional: { defaultLabel, ...additional } = {}, ...preference }) =>
    ({
      ...preference,
      additional: {
        ...additional,
        ...(defaultLabel ? {
          defaultLabel: normalizeLocalizedOutput(defaultLabel)
        } : {})
      }
    })
)
```

**No depth 4+ observed** - ESLint prevents it

## Function Length Analysis

**Distribution** (sampled 50 functions):
- **1-10 lines**: 28% (simple utilities, selectors)
- **11-25 lines**: 52% (standard functions)
- **26-40 lines**: 15% (resolvers with logic)
- **41-60 lines**: 5% (complex resolvers)

**Longest functions** (approaching complexity limits):
- Campaign resolver methods: 30-40 lines
- Wave orchestration: 40-50 lines
- Normalization functions: 30-45 lines

**Average**: ~18 lines per function

## Test Coverage

**Test files**: 10 `.spec.js` files found

**Test structure**:
- Unit tests for utilities (`Selectors.spec.js`, `util.spec.js`)
- Integration tests in `features/` (Cucumber)
- Co-located with source (not separate test directory)

**Test file sizes**:
- `Campaign/util.spec.js`: 344 lines (extensive transformation tests)
- `Selectors.spec.js`: 122 lines (selector unit tests)
- Test files exempt from 200-line limit (reasonable for comprehensive tests)

## Recommendations

### Maintain Current Strengths ✓

1. **Keep ESLint rules strict** - They're working beautifully
2. **Continue functional patterns** - Ramda composition keeps complexity low
3. **Maintain 200-line limit** - Forces good decomposition
4. **Keep using DataLoaders** - Excellent abstraction for GraphQL

### Areas for Improvement 💡

#### 1. **Wave Resolver - Consider Module Split**
- **Current**: 187 lines in single file
- **Suggestion**: Split into `Wave/queries.js`, `Wave/mutations.js`, `Wave/utils.js`
- **Benefit**: Each file < 100 lines, easier to navigate

#### 2. **Campaign Client - Domain Sub-modules**
- **Current**: 198 lines, 20+ methods
- **Suggestion**: Split into:
  - `campaigns/core.js` (byDomain, byCampaignId, list, upsert)
  - `campaigns/contacts.js` (getCampaignContacts, saveCampaignContacts)
  - `campaigns/markets.js` (getMarket, upsertMarket, deleteMarket)
  - `campaigns/search.js` (searchArtists, searchContacts, searchVenues)
  - `campaigns/index.js` (aggregate exports)
- **Benefit**: Each domain module ~50 lines, better organization

#### 3. **Add JSDoc for Complex Ramda Pipes**
- **Current**: Ramda pipes with no comments
- **Suggestion**: Add JSDoc to explain data flow
```javascript
/**
 * Normalizes campaign output for GraphQL
 * Transforms: locales (dash -> underscore), content (FAQs to arrays), preferences (nested localization)
 * @param {Object} campaign - Raw campaign from service
 * @returns {Object} Normalized campaign for GraphQL
 */
export const normalizeCampaignOutput = ({ campaign: { ... } }) => ...
```
- **Benefit**: Easier onboarding for developers unfamiliar with Ramda

#### 4. **Consider Extracting Utility Modules**
- **`util.js` files** grow large with reusable helpers
- **Suggestion**: Split `resolvers/util.js` (126 lines) into:
  - `resolvers/utils/auth.js` (compareAndUpdateToken, throwIfTokenMismatch)
  - `resolvers/utils/encoding.js` (base64Encode, base64Decode)
  - `resolvers/utils/filenames.js` (makeScoringFilename, makeDateFilename, etc.)
  - `resolvers/utils/locales.js` (normalizeLocale, localesKeyToUnderscore, etc.)
- **Benefit**: Each utility module ~30 lines, easier to find/maintain

#### 5. **Document FP Patterns for Team**
- **Current**: FP patterns assumed knowledge
- **Suggestion**: Add `docs/functional-patterns.md` explaining:
  - Ramda pipe composition
  - Point-free style
  - Common patterns (`R.applySpec`, `R.tap`, `R.pipeP`)
- **Benefit**: Faster onboarding, consistent usage

## Complexity Trends

**Historical** (inferred from current state):
- Started with strong FP foundation (Ramda, ESLint fp/*)
- Complexity managed through decomposition
- Files stay under limits as features added (good discipline)

**Current State**: ✓ Healthy
- Only 2 files near 200-line limit
- Average complexity low (~18 lines/fn)
- Clear patterns established

**Future Risk**: ⚠️ Monitor these areas
- Wave resolver (187 lines) - next feature may exceed limit
- Campaign client (198 lines) - already at limit
- Test files growing (344 lines) - consider test utilities

**Mitigation Strategy**:
- Proactive splitting before hitting 200 lines
- Extract helpers early
- Continue strict ESLint enforcement

## Summary

**Complexity Score**: ★★★★☆ (4/5)

**Strengths**:
- Strict linting keeps individual functions simple
- Functional composition manages complexity elegantly
- Small file sizes (avg 85 lines)
- No deep nesting (max 3)
- Clear patterns repeated consistently

**Challenges**:
- Ramda learning curve for new developers
- Some files approaching size limits
- Complex domain logic (SMS orchestration, campaign normalization) inherently challenging

**Verdict**: Code complexity is **well-managed** through:
1. Functional programming discipline
2. Strict ESLint rules
3. Small, focused modules
4. Clear naming conventions
5. Consistent patterns

The codebase is more complex than imperative alternatives initially, but pays dividends in:
- Predictability (pure functions)
- Testability (no side effects except ctx)
- Maintainability (small changes, clear boundaries)
- Scalability (patterns extend naturally)
