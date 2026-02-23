# Type Usage Patterns - admin-ui

This document describes implicit types, function signatures, and usage patterns derived from GraphQL operations and JavaScript code.

## Overview

The admin-ui repository uses:
- **GraphQL Client**: Apollo Client v2
- **Language**: JavaScript (ES6+) with Babel
- **Type Safety**: GraphQL schema provides runtime type safety
- **Operation Files**: 46 GraphQL operation files in `/frontend/src/graphql/`

---

## GraphQL Operations

### Queries

#### admin_campaign
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_campaign($domain: String, $id: String, $locale: String, $showAllLocales: Boolean) {
  viewer {
    campaign(domain: $domain, id: $id, locale: $locale, showAllLocales: $showAllLocales) {
      ...campaignObject
      ... on RegistrationCampaign {
        ...regCampaignObject
      }
      ... on FanlistCampaign {
        ...fanlistCampaignObject
      }
    }
  }
}
```

**Source:** [getCampaign.js](/frontend/src/graphql/getCampaign.js:23)

**Variables Shape:**
- `domain` (String, optional) - Campaign domain to query
- `id` (String, optional) - Campaign ID to query
- `locale` (String, optional) - Locale for content filtering
- `showAllLocales` (Boolean, optional) - Whether to return all locales

**Return Type:** Query<{ viewer: { campaign: Campaign } }>

**Used By:**
- Campaign detail page components
- Campaign editor components

**Fragments Used:**
- `campaignObject` - Base campaign fields
- `regCampaignObject` - Registration campaign specific fields
- `fanlistCampaignObject` - Fanlist campaign specific fields
- `marketObject` - Market nested type
- `imageFields` - Image nested type
- `allSharedContent` - Shared content fields
- `allV1Content` - V1 content fields
- `allV2Content` - V2 content fields

---

#### admin_campaignsList
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_campaignsList($limit: Int, $skip: Int, $sort: String, $query: String, $type: CampaignType, $version: String) {
  viewer {
    campaigns {
      list(limit: $limit, skip: $skip, sort: $sort, query: $query, type: $type, version: $version) {
        id
        name
        schema {
          version
        }
        ... on RegistrationCampaign {
          domain {
            site
          }
        }
        ... on FanlistCampaign {
          scoring
          identifier
        }
      }
    }
  }
}
```

**Source:** [campaignsList.js](/frontend/src/graphql/campaignsList.js:4)

**Variables Shape:**
- `limit` (Int, optional) - Max results to return
- `skip` (Int, optional) - Results to skip (pagination offset)
- `sort` (String, optional) - Sort field and direction
- `query` (String, optional) - Search query string
- `type` (CampaignType enum, optional) - Filter by campaign type
- `version` (String, optional) - Filter by schema version

**Return Type:** Query<{ viewer: { campaigns: { list: Campaign[] } } }>

**Used By:**
- Campaign list page
- Campaign selector components

---

#### admin_searchArtists
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_searchArtists($queryStr: String!, $skip: Int, $limit: Int) {
  searchArtists(query: $queryStr, skip: $skip, limit: $limit) {
    id
    name
    image_url
    discovery_id
    needs_id
  }
}
```

**Source:** [search.js](/frontend/src/graphql/search.js:4)

**Variables Shape:**
- `queryStr` (String, required) - Artist name search query
- `skip` (Int, optional) - Pagination offset
- `limit` (Int, optional) - Max results to return

**Return Type:** Query<{ searchArtists: DiscoveryArtist[] }>

**Used By:**
- Artist search/autocomplete components
- Campaign artist selector

---

#### admin_searchVenues
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_searchVenues($queryStr: String!, $skip: Int, $limit: Int) {
  searchVenues(query: $queryStr, skip: $skip, limit: $limit) {
    id
    name
    city
    state
    timezone
    needs_id
    point {
      latitude
      longitude
    }
  }
}
```

**Source:** [search.js](/frontend/src/graphql/search.js:15)

**Variables Shape:**
- `queryStr` (String, required) - Venue name search query
- `skip` (Int, optional) - Pagination offset
- `limit` (Int, optional) - Max results to return

**Return Type:** Query<{ searchVenues: DiscoveryVenue[] }>

**Used By:**
- Venue search/autocomplete components
- Market venue selector

---

#### admin_entriesByMarketPreference
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_entriesByMarketPreference($campaignId: ID!) {
  metrics {
    entriesByMarketPreference(campaignId: $campaignId) {
      id
      counts
    }
  }
}
```

**Source:** [metrics.js](/frontend/src/graphql/metrics.js:5)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign to get metrics for

**Return Type:** Query<{ metrics: { entriesByMarketPreference: MarketPreferenceCounts[] } }>

**Used By:**
- Campaign metrics dashboard
- Entry distribution analytics

---

#### admin_eligibleByMarketPreference
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_eligibleByMarketPreference($campaignId: ID!, $includePrevSelected: Boolean, $minScore: Float, $maxScore: Float) {
  metrics {
    eligibleByMarketPreference(campaignId: $campaignId, includePrevSelected: $includePrevSelected, minScore: $minScore, maxScore: $maxScore) {
      id
      counts
    }
  }
}
```

**Source:** [metrics.js](/frontend/src/graphql/metrics.js:16)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign to get metrics for
- `includePrevSelected` (Boolean, optional) - Include previously selected fans
- `minScore` (Float, optional) - Minimum eligibility score filter
- `maxScore` (Float, optional) - Maximum eligibility score filter

**Return Type:** Query<{ metrics: { eligibleByMarketPreference: MarketPreferenceCounts[] } }>

**Used By:**
- Campaign metrics dashboard
- Eligibility distribution analytics

---

#### admin_verifiedCountByMarket
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_verifiedCountByMarket($campaignId: ID!, $minScore: Float, $maxScore: Float) {
  metrics {
    verifiedCountByMarket(campaignId: $campaignId, minScore: $minScore, maxScore: $maxScore) {
      id
      count
    }
  }
}
```

**Source:** [metrics.js](/frontend/src/graphql/metrics.js:27)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign to get metrics for
- `minScore` (Float, optional) - Minimum score filter
- `maxScore` (Float, optional) - Maximum score filter

**Return Type:** Query<{ metrics: { verifiedCountByMarket: MarketEligibilityCount[] } }>

**Used By:**
- Campaign metrics dashboard
- Verified fan counts by market

---

#### admin_totalSelectedByMarket
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_totalSelectedByMarket($campaignId: ID!) {
  metrics {
    totalSelectedByMarket(campaignId: $campaignId) {
      id
      count
    }
  }
}
```

**Source:** [metrics.js](/frontend/src/graphql/metrics.js:39)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign to get metrics for

**Return Type:** Query<{ metrics: { totalSelectedByMarket: MarketEligibilityCount[] } }>

**Used By:**
- Campaign metrics dashboard
- Selected fan counts by market

---

#### admin_campaignExportList
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_campaignExportList($campaignId: String!, $limit: Int, $skip: Int, $exportType: String) {
  campaignExportList(campaignId: $campaignId, limit: $limit, skip: $skip, exportType: $exportType) {
    ...exportObject
  }
}
```

**Source:** [campaignExportList.js](/frontend/src/graphql/campaignExportList.js:7)

**Variables Shape:**
- `campaignId` (String, required) - Campaign to get exports for
- `limit` (Int, optional) - Max results to return
- `skip` (Int, optional) - Pagination offset
- `exportType` (String, optional) - Filter by export type

**Return Type:** Query<{ campaignExportList: Export[] }>

**Used By:**
- Export history page
- Export list components

**Fragments Used:**
- `exportObject` - Export fields

---

#### admin_campaignExport
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_campaignExport($campaignId: String!, $exportId: String!) {
  campaignExport(campaignId: $campaignId, exportId: $exportId) {
    ...exportObject
  }
}
```

**Source:** [campaignExport.js](/frontend/src/graphql/campaignExport.js:7)

**Variables Shape:**
- `campaignId` (String, required) - Campaign ID
- `exportId` (String, required) - Export ID to retrieve

**Return Type:** Query<{ campaignExport: Export }>

**Used By:**
- Export detail page
- Export download components

---

#### admin_campaignScoredList
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_campaignScoredList($campaignId: String!) {
  campaignScoredList(campaignId: $campaignId) {
    date
    count
    verifiedCount
    path
  }
}
```

**Source:** [campaignScoredList.js](/frontend/src/graphql/campaignScoredList.js:4)

**Variables Shape:**
- `campaignId` (String, required) - Campaign to get scored lists for

**Return Type:** Query<{ campaignScoredList: Scored[] }>

**Used By:**
- Scored list management page

---

#### admin_wavePrepList
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_wavePrepList($campaignId: ID!) {
  wavePrepList(campaignId: $campaignId) {
    date {
      started
      finished
    }
    status
    dateKey
    error {
      message
    }
    path
    count {
      name
      eligible
      selected
      waitlisted
      markets {
        name
        eligible
        selected
        waitlisted
      }
    }
  }
}
```

**Source:** [wavePrepList.js](/frontend/src/graphql/wavePrepList.js:4)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign to get wave prep list for

**Return Type:** Query<{ wavePrepList: WavePrep[] }>

**Used By:**
- Wave prep management page
- Wave scheduler

---

#### admin_waveList
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_waveList($campaignId: ID) {
  waveList(campaignId: $campaignId) {
    name
    status
    date {
      scheduled
      notify
      begin
      end
    }
    totalLimit
    generateOfferCode
    tiedToAccount
    singleUse
    categoryId
    campaignId
  }
}
```

**Source:** [waveList.js](/frontend/src/graphql/waveList.js:4)

**Variables Shape:**
- `campaignId` (ID, optional) - Campaign to filter waves by

**Return Type:** Query<{ waveList: Wave[] }>

**Used By:**
- Wave management page
- Wave status monitoring

---

#### admin_getStats
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_getStats($campaignId: ID!, $marketId: ID, $dateId: String, $type: StatsType!) {
  stats(campaignId: $campaignId, marketId: $marketId, dateId: $dateId, type: $type) {
    campaignId
    marketId
    dateId
    date {
      created
      updated
    }
    type
    meta
    count
    errors {
      message
    }
    status
  }
}
```

**Source:** [getStats.js](/frontend/src/graphql/getStats.js:4)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign to get stats for
- `marketId` (ID, optional) - Specific market to filter by
- `dateId` (String, optional) - Date key to filter by
- `type` (StatsType enum, required) - Type of stats to retrieve

**Return Type:** Query<{ stats: Stat[] }>

**Used By:**
- Statistics dashboard
- Campaign analytics

---

#### admin_codesCount
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_codesCount($campaignId: ID!, $type: String!, $status: String) {
  codes {
    count(campaignId: $campaignId, type: $type, status: $status) {
      available
      assigned
      reserved
    }
  }
}
```

**Source:** [codesCount.js](/frontend/src/graphql/codesCount.js:4)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign to get code counts for
- `type` (String, required) - Code type
- `status` (String, optional) - Filter by code status

**Return Type:** Query<{ codes: { count: CodeCount } }>

**Used By:**
- Code management page
- Code inventory tracking

---

#### admin_initApp
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_initApp {
  viewer {
    id
    isLoggedIn
    isAdmin
    firstName
    lastName
    email
    auth {
      token
      isSupreme
      expiresAt
      permissions {
        campaignId
        actions
      }
    }
  }
  identity {
    url
    version
    integratorId
    placementId
  }
  ppc {
    url
    id
    token
  }
}
```

**Source:** [initApp.js](/frontend/src/graphql/initApp.js:4)

**Variables Shape:** None

**Return Type:** Query<{ viewer: Viewer, identity: Identity, ppc: Ppc }>

**Used By:**
- App initialization
- Authentication setup
- Configuration loading

---

#### admin_pollLoggedIn
**Confidence:** 100% (Explicit GraphQL Query)

```javascript
query admin_pollLoggedIn {
  viewer {
    isLoggedIn
  }
}
```

**Source:** [pollLoggedIn.js](/frontend/src/graphql/pollLoggedIn.js:4)

**Variables Shape:** None

**Return Type:** Query<{ viewer: { isLoggedIn: Boolean } }>

**Used By:**
- Session monitoring
- Authentication polling

---

### Mutations

#### admin_upsertCampaign
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_upsertCampaign($campaign: CampaignInput!) {
  upsertCampaign(campaign: $campaign) {
    ...campaignObject
    ... on RegistrationCampaign {
      ...regCampaignObject
    }
    ... on FanlistCampaign {
      eventIds
      scoring
      identifier
    }
  }
}
```

**Source:** [upsertCampaign.js](/frontend/src/graphql/upsertCampaign.js:21)

**Variables Shape:**
- `campaign` (CampaignInput, required) - Campaign data to create/update

**Return Type:** Mutation<{ upsertCampaign: Campaign }>

**Called By:**
- Campaign editor save action
- Campaign creation flow

**Calls:**
- Backend GraphQL resolver `Mutation.upsertCampaign`

**Transformation Logic:**
The mutation:
1. Validates all input fields against CampaignInput schema
2. Creates or updates campaign in database
3. Enriches output with computed fields (created/updated timestamps)
4. Returns polymorphic Campaign type (RegistrationCampaign or FanlistCampaign)

**Fragments Used:**
- `campaignObject` - Base campaign fields
- `regCampaignObject` - Registration campaign specific fields
- `marketObject` - Nested market data
- `imageFields` - Nested image data
- `allSharedContent`, `allV1Content`, `allV2Content` - Content fields

---

#### admin_upsertMarket
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_upsertMarket($market: MarketInput!) {
  upsertMarket(market: $market) {
    ...marketObject
  }
}
```

**Source:** [upsertMarket.js](/frontend/src/graphql/upsertMarket.js:9)

**Variables Shape:**
- `market` (MarketInput, required) - Market data to create/update

**Return Type:** Mutation<{ upsertMarket: Market }>

**Called By:**
- Market editor components
- Campaign market management

**Calls:**
- Backend GraphQL resolver `Mutation.upsertMarket`

---

#### admin_deleteMarket
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_deleteMarket($campaignId: String!, $marketId: String!, $transferMarketId: String) {
  deleteMarket(campaignId: $campaignId, marketId: $marketId, transferMarketId: $transferMarketId)
}
```

**Source:** [deleteMarket.js](/frontend/src/graphql/deleteMarket.js:4)

**Variables Shape:**
- `campaignId` (String, required) - Campaign ID
- `marketId` (String, required) - Market ID to delete
- `transferMarketId` (String, optional) - Market to transfer entries to

**Return Type:** Mutation<{ deleteMarket: JSON }>

**Called By:**
- Market deletion confirmation dialog

---

#### admin_scheduleExport
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_scheduleExport($campaignId: String!, $type: String!, $dateKey: String) {
  scheduleExport(campaignId: $campaignId, type: $type, dateKey: $dateKey) {
    ...exportObject
  }
}
```

**Source:** [scheduleExport.js](/frontend/src/graphql/scheduleExport.js:9)

**Variables Shape:**
- `campaignId` (String, required) - Campaign to export
- `type` (String, required) - Export type
- `dateKey` (String, optional) - Date key for filtering

**Return Type:** Mutation<{ scheduleExport: Export }>

**Called By:**
- Export scheduler component
- Export creation actions

---

#### admin_uploadImage
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_uploadImage($base64: String!, $contentType: String!, $fileName: String, $cacheControl: String) {
  uploadImage(base64: $base64, contentType: $contentType, fileName: $fileName, cacheControl: $cacheControl) {
    url
    name
    width
    height
    alt_text
  }
}
```

**Source:** [uploadImage.js](/frontend/src/graphql/uploadImage.js:4)

**Variables Shape:**
- `base64` (String, required) - Base64 encoded image data
- `contentType` (String, required) - MIME type
- `fileName` (String, optional) - Original filename
- `cacheControl` (String, optional) - Cache-Control header value

**Return Type:** Mutation<{ uploadImage: Image }>

**Called By:**
- Image upload components
- Campaign image editor

---

#### admin_uploadCodes
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_uploadCodes($file: Upload!, $fileSize: Int!, $campaignId: String!, $type: String!) {
  uploadCodes(file: $file, fileSize: $fileSize, campaignId: $campaignId, type: $type) {
    in
    inserted
    updated
  }
}
```

**Source:** [uploadCodes.js](/frontend/src/graphql/uploadCodes.js:4)

**Variables Shape:**
- `file` (Upload, required) - File upload
- `fileSize` (Int, required) - File size in bytes
- `campaignId` (String, required) - Campaign to upload codes for
- `type` (String, required) - Code type

**Return Type:** Mutation<{ uploadCodes: UploadCodesCount }>

**Called By:**
- Code upload component

---

#### admin_uploadBlacklist
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_uploadBlacklist($file: Upload!, $fileSize: Int!, $fileName: String) {
  uploadBlacklist(file: $file, fileSize: $fileSize, fileName: $fileName) {
    url
    name
    contentType
  }
}
```

**Source:** [uploadBlacklist.js](/frontend/src/graphql/uploadBlacklist.js:4)

**Variables Shape:**
- `file` (Upload, required) - File upload
- `fileSize` (Int, required) - File size in bytes
- `fileName` (String, optional) - Original filename

**Return Type:** Mutation<{ uploadBlacklist: File }>

**Called By:**
- Blacklist upload component

---

#### admin_uploadScored
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_uploadScored($file: Upload!, $fileSize: Int!, $campaignId: String!, $campaignName: String!) {
  uploadScored(file: $file, fileSize: $fileSize, campaignId: $campaignId, campaignName: $campaignName) {
    url
    name
    contentType
  }
}
```

**Source:** [uploadScored.js](/frontend/src/graphql/uploadScored.js:4)

**Variables Shape:**
- `file` (Upload, required) - File upload
- `fileSize` (Int, required) - File size in bytes
- `campaignId` (String, required) - Campaign ID
- `campaignName` (String, required) - Campaign name for reference

**Return Type:** Mutation<{ uploadScored: File }>

**Called By:**
- Scored list upload component

---

#### admin_uploadFanlist
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_uploadFanlist($file: Upload!, $fileSize: Int!, $campaignId: String!) {
  uploadFanlist(file: $file, fileSize: $fileSize, campaignId: $campaignId) {
    url
    name
    contentType
  }
}
```

**Source:** [uploadFanlist.js](/frontend/src/graphql/uploadFanlist.js:4)

**Variables Shape:**
- `file` (Upload, required) - File upload
- `fileSize` (Int, required) - File size in bytes
- `campaignId` (String, required) - Campaign ID

**Return Type:** Mutation<{ uploadFanlist: File }>

**Called By:**
- Fanlist upload component

---

#### admin_uploadWave
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_uploadWave($file: Upload, $fileSize: Int, $fileName: String!, $config: WaveConfigInput!) {
  uploadWave(file: $file, fileSize: $fileSize, fileName: $fileName, config: $config)
}
```

**Source:** [uploadWave.js](/frontend/src/graphql/uploadWave.js:4)

**Variables Shape:**
- `file` (Upload, optional) - File upload
- `fileSize` (Int, optional) - File size in bytes
- `fileName` (String, required) - Filename
- `config` (WaveConfigInput, required) - Wave configuration

**Return Type:** Mutation<{ uploadWave: JSON }>

**Called By:**
- Wave upload component

---

#### admin_cancelWave
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_cancelWave($fileName: String!, $campaignId: ID) {
  cancelWave(fileName: $fileName, campaignId: $campaignId)
}
```

**Source:** [cancelWave.js](/frontend/src/graphql/cancelWave.js:4)

**Variables Shape:**
- `fileName` (String, required) - Wave filename to cancel
- `campaignId` (ID, optional) - Campaign ID

**Return Type:** Mutation<{ cancelWave: JSON }>

**Called By:**
- Wave cancellation action

---

#### admin_uploadWavePrepFile
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_uploadWavePrepFile($file: Upload!, $fileSize: Int!, $campaignId: ID!, $dateKey: String!, $type: WavePrepFileType!) {
  uploadWavePrepFile(file: $file, fileSize: $fileSize, campaignId: $campaignId, dateKey: $dateKey, type: $type) {
    url
    name
    contentType
  }
}
```

**Source:** [uploadWavePrepFile.js](/frontend/src/graphql/uploadWavePrepFile.js:4)

**Variables Shape:**
- `file` (Upload, required) - File upload
- `fileSize` (Int, required) - File size in bytes
- `campaignId` (ID, required) - Campaign ID
- `dateKey` (String, required) - Date key for wave prep
- `type` (WavePrepFileType enum, required) - File type

**Return Type:** Mutation<{ uploadWavePrepFile: File }>

**Called By:**
- Wave prep file upload component

---

#### admin_triggerWavePrep
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_triggerWavePrep($campaignId: ID!, $dateKey: String!, $reassign: Boolean, $orderByPreference: Boolean, $singleMarket: Boolean, $randomSelection: Boolean, $minScore: Float) {
  triggerWavePrep(campaignId: $campaignId, dateKey: $dateKey, reassign: $reassign, orderByPreference: $orderByPreference, singleMarket: $singleMarket, randomSelection: $randomSelection, minScore: $minScore)
}
```

**Source:** [triggerWavePrep.js](/frontend/src/graphql/triggerWavePrep.js:4)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign ID
- `dateKey` (String, required) - Date key for wave prep
- `reassign` (Boolean, optional) - Whether to reassign existing selections
- `orderByPreference` (Boolean, optional) - Order by preference ranking
- `singleMarket` (Boolean, optional) - Single market mode
- `randomSelection` (Boolean, optional) - Random selection mode
- `minScore` (Float, optional) - Minimum score threshold

**Return Type:** Mutation<{ triggerWavePrep: JSON }>

**Called By:**
- Wave prep trigger action

---

#### admin_triggerSelection
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_triggerSelection($campaignId: ID!, $marketIds: [ID]!) {
  triggerSelection(campaignId: $campaignId, marketIds: $marketIds)
}
```

**Source:** [triggerSelection.js](/frontend/src/graphql/triggerSelection.js:4)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign ID
- `marketIds` ([ID], required) - Market IDs to trigger selection for

**Return Type:** Mutation<{ triggerSelection: JSON }>

**Called By:**
- Selection trigger action

---

#### admin_addTags
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_addTags($campaignId: String!, $fileRecords: [String]!, $targetField: String!, $tagName: String!) {
  addTags(campaignId: $campaignId, fileRecords: $fileRecords, targetField: $targetField, tagName: $tagName) {
    count
  }
}
```

**Source:** [addTags.js](/frontend/src/graphql/addTags.js:4)

**Variables Shape:**
- `campaignId` (String, required) - Campaign ID
- `fileRecords` ([String], required) - Record identifiers from file
- `targetField` (String, required) - Field to tag
- `tagName` (String, required) - Tag name to apply

**Return Type:** Mutation<{ addTags: UpdatedCount }>

**Called By:**
- Tag management action

---

#### admin_flipVerdicts
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_flipVerdicts($campaignId: String!, $tagName: String!, $filterType: FilterType!) {
  flipVerdicts(campaignId: $campaignId, tagName: $tagName, filterType: $filterType) {
    count
  }
}
```

**Source:** [flipVerdicts.js](/frontend/src/graphql/flipVerdicts.js:4)

**Variables Shape:**
- `campaignId` (String, required) - Campaign ID
- `tagName` (String, required) - Tag name to flip
- `filterType` (FilterType enum, required) - Filter type (allow/block)

**Return Type:** Mutation<{ flipVerdicts: UpdatedCount }>

**Called By:**
- Verdict management action

---

#### admin_upsertStat
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_upsertStat($campaignId: ID!, $marketId: ID, $dateId: String!, $type: StatsType!, $status: String, $meta: JSON, $count: JSON) {
  upsertStat(campaignId: $campaignId, marketId: $marketId, dateId: $dateId, type: $type, status: $status, meta: $meta, count: $count) {
    campaignId
    marketId
    dateId
    date {
      created
      updated
    }
    type
    meta
    count
    errors {
      message
    }
    status
  }
}
```

**Source:** [upsertStat.js](/frontend/src/graphql/upsertStat.js:4)

**Variables Shape:**
- `campaignId` (ID, required) - Campaign ID
- `marketId` (ID, optional) - Market ID
- `dateId` (String, required) - Date key
- `type` (StatsType enum, required) - Stat type
- `status` (String, optional) - Processing status
- `meta` (JSON, optional) - Metadata
- `count` (JSON, optional) - Count data

**Return Type:** Mutation<{ upsertStat: Stat }>

**Called By:**
- Statistics update actions

---

#### admin_logout
**Confidence:** 100% (Explicit GraphQL Mutation)

```javascript
mutation admin_logout {
  logout
}
```

**Source:** [logout.js](/frontend/src/graphql/logout.js:4)

**Variables Shape:** None

**Return Type:** Mutation<{ logout: Boolean }>

**Called By:**
- Logout action

---

## GraphQL Fragments

### campaignObject
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment campaignObject on Campaign {
  id
  type
  name
  date {
    created
    open
    closed
    close
    finish
    presaleWindowStart
    presaleWindowEnd
    generalOnsale
    sendReminderEmails
    triggeredEmailReminders
  }
  referenceTimezone
  artist {
    id
    name
    image_url
    discovery_id
    needs_id
    fanclubName
  }
  categoryId
}
```

**Source:** [fragments/campaignObject.js](/frontend/src/graphql/fragments/campaignObject.js:1)

**Target Type:** Campaign interface

**Fields Extracted:**
- Base campaign identification (id, type, name)
- Campaign date lifecycle fields
- Artist association with discovery info
- Category classification

**Used By:**
- `admin_campaign` query
- `admin_upsertCampaign` mutation
- `admin_campaignsList` query

---

### regCampaignObject
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment regCampaignObject on RegistrationCampaign {
  domain {
    preview
    site
    share
  }
  status
  tour {
    name
  }
  login_types
  trackers {
    id
    type
    src
    additional
  }
  style
  content {
    localized {
      locale
      value {
        ...allSharedContent
        ...allV1Content
        ...allV2Content
      }
    }
  }
  image {
    main { ...imageFields }
    mobile { ...imageFields }
    email { ...imageFields }
    secondary { ...imageFields }
  }
  faqs {
    landing {
      open
      closed
    }
    confirmation {
      open
      closed
      activePresale
    }
  }
  preferences {
    id
    is_optional
    type
    label {
      localized {
        locale
        value
      }
    }
    additional
  }
  locales {
    id
    is_default
  }
  markets {
    ...marketObject
  }
  options {
    allowIntlPhones
    linkableAttributes
    showAccessCode
    useGenericBranding
    requirePassword
    passwordValue
    queueId
    hideFaq
    requirePrecheck {
      pastCampaignId
    }
    gate {
      card
      campaignId
      inviteOnly
      linkedAccount
      linkedCampaign
      idv
    }
    linkableAttributes
    automatedReminders
    waitingRoomDuration
    isLNAA
  }
  slack {
    channels {
      stats
    }
    noAlert
  }
  schema {
    version
  }
  subType
}
```

**Source:** [fragments/regCampaignObject.js](/frontend/src/graphql/fragments/regCampaignObject.js:1)

**Target Type:** RegistrationCampaign

**Fields Extracted:**
- Registration-specific domain configuration
- Campaign status and tour info
- Login types and tracking pixels
- Localized content (supports multiple content versions)
- Campaign images (main, mobile, email, secondary)
- FAQ configuration per page state
- Custom preference fields
- Locale configuration
- Markets (full nested structure)
- Registration options (phone, password, gating, etc.)
- Slack notification channels
- Schema version

**Dependencies:**
- Uses `imageFields` fragment for image data
- Uses `marketObject` fragment for market data
- Uses `allSharedContent`, `allV1Content`, `allV2Content` for content

**Used By:**
- `admin_campaign` query
- `admin_upsertCampaign` mutation

---

### fanlistCampaignObject
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment fanlistCampaignObject on FanlistCampaign {
  eventIds
  scoring
  exports {
    ...exportObject
  }
  uploads {
    date
    rows
    rowsIn
    status
  }
  identifier
  schema {
    version
  }
}
```

**Source:** [fragments/fanlistCampaignObject.js](/frontend/src/graphql/fragments/fanlistCampaignObject.js:1)

**Target Type:** FanlistCampaign

**Fields Extracted:**
- Event IDs associated with fanlist
- Scoring algorithm type
- Export history
- Upload history (date, row counts, status)
- Fan identifier strategy
- Schema version

**Dependencies:**
- Uses `exportObject` fragment for export data

**Used By:**
- `admin_campaign` query
- `admin_upsertCampaign` mutation

---

### marketObject
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment marketObject on Market {
  id
  name
  city
  state
  population
  timezone
  isAddedShow
  point {
    latitude
    longitude
  }
  event {
    ids
    name
    date
    presaleDateTime
    ticketer
    link
    venue {
      name
    }
    sharedCode
    splitAllocation {
      isActive
      link
      type
    }
  }
}
```

**Source:** [fragments/marketObject.js](/frontend/src/graphql/fragments/marketObject.js:1)

**Target Type:** Market

**Fields Extracted:**
- Market identification and location
- Geographic point (lat/long)
- Event details (ids, name, dates, ticketer)
- Venue information
- Split allocation configuration

**Used By:**
- `regCampaignObject` fragment
- `admin_upsertMarket` mutation

---

### exportObject
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment exportObject on Export {
  id
  campaignId
  exportType
  date {
    created
    started
    triggered
    pending
    finished
    failed
    expired
  }
  status
  count
  requesterUserId
  error {
    message
    payload
    stack
  }
  path
  dateKey
}
```

**Source:** [fragments/exportObject.js](/frontend/src/graphql/fragments/exportObject.js:1)

**Target Type:** Export

**Fields Extracted:**
- Export identification
- Export lifecycle timestamps
- Status and progress
- Error information (when failed)
- File path and date key

**Used By:**
- `fanlistCampaignObject` fragment
- `admin_scheduleExport` mutation
- `admin_campaignExportList` query
- `admin_campaignExport` query

---

### imageFields
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment imageFields on Image {
  url
  width
  height
  alt_text
}
```

**Source:** [fragments/imageFields.js](/frontend/src/graphql/fragments/imageFields.js:1)

**Target Type:** Image

**Fields Extracted:**
- Image URL
- Dimensions (width, height)
- Accessibility (alt_text)

**Used By:**
- `regCampaignObject` fragment
- `allV1Content` fragment

---

### allSharedContent
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment allSharedContent on Content {
  meta
  email {
    from {
      name
      account
    }
    subject {
      receipt
    }
    template {
      confirm
      receipt
      share
    }
  }
}
```

**Source:** [fragments/allSharedContent.js](/frontend/src/graphql/fragments/allSharedContent.js:1)

**Target Type:** Content

**Fields Extracted:**
- Content metadata
- Email configuration (from, subject, templates)

**Used By:**
- `regCampaignObject` fragment
- Content value in localized content

---

### allV1Content
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment allV1Content on Content {
  body {
    terms {
      main
    }
    started {
      welcome {
        above_button
        below_button
        header
      }
      registration {
        above_form
        below_form
        above_button
        header
        submit_button_content
      }
      entry {
        header
        top
        main
        attributes
      }
    }
    finished {
      welcome {
        main
        header
      }
    }
  }
  share {
    template {
      default
      twitter
      facebook
      email_body
      email_subject
    }
  }
  image {
    share { ...imageFields }
    background { ...imageFields }
    logo { ...imageFields }
  }
  errors {
    code
    message
  }
}
```

**Source:** [fragments/allV1Content.js](/frontend/src/graphql/fragments/allV1Content.js:1)

**Target Type:** Content

**Fields Extracted:**
- V1 content body structure (terms, started states, finished states)
- Social share templates
- Content images (share, background, logo)
- Error messages

**Dependencies:**
- Uses `imageFields` fragment

**Used By:**
- `regCampaignObject` fragment
- Content value in localized content

---

### allV2Content
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment allV2Content on Content {
  body {
    signup {
      infoBody
    }
  }
  faqs {
    id
    question
    answer
  }
}
```

**Source:** [fragments/allV2Content.js](/frontend/src/graphql/fragments/allV2Content.js:1)

**Target Type:** Content

**Fields Extracted:**
- V2 signup content body
- FAQ list (id, question, answer)

**Used By:**
- `regCampaignObject` fragment
- Content value in localized content

---

### adminUser
**Confidence:** 100% (Explicit GraphQL Fragment)

```graphql
fragment adminUser on Viewer {
  id
  isLoggedIn
  isAdmin
  firstName
  lastName
  email
}
```

**Source:** [fragments/adminUser.js](/frontend/src/graphql/fragments/adminUser.js:1)

**Target Type:** Viewer

**Fields Extracted:**
- User identification and login status
- Admin flag
- User profile (name, email)

**Used By:**
- Various viewer queries

---

## Common Patterns

### Pattern: Apollo Client Query Execution

**Description:** Standard Apollo Client query execution pattern used throughout the application.

**Example Usage:**
```javascript
import { useQuery } from '@apollo/react-hooks';
import getCampaign from './graphql/getCampaign';

function CampaignDetail({ campaignId }) {
  const { loading, error, data } = useQuery(getCampaign, {
    variables: { id: campaignId },
    fetchPolicy: 'cache-first'
  });

  if (loading) return <Loading />;
  if (error) return <Error error={error} />;

  const campaign = data.viewer.campaign;
  return <CampaignView campaign={campaign} />;
}
```

**Found In:**
- Component files throughout `/frontend/src/components/`
- Saga files in `/frontend/src/sagas/`

---

### Pattern: Apollo Client Mutation Execution

**Description:** Standard Apollo Client mutation execution pattern with optimistic updates.

**Example Usage:**
```javascript
import { useMutation } from '@apollo/react-hooks';
import upsertCampaign from './graphql/upsertCampaign';

function CampaignEditor({ campaign }) {
  const [saveCampaign, { loading, error }] = useMutation(upsertCampaign, {
    onCompleted: (data) => {
      // Handle success
      showSuccessMessage('Campaign saved');
    },
    onError: (error) => {
      // Handle error
      showErrorMessage(error.message);
    }
  });

  const handleSave = () => {
    saveCampaign({
      variables: {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          // ... other fields
        }
      }
    });
  };

  return <Form onSubmit={handleSave} />;
}
```

**Found In:**
- Form components in `/frontend/src/components/`
- Action handlers in `/frontend/src/sagas/`

---

### Pattern: File Upload with Apollo

**Description:** File upload pattern using apollo-upload-client for multipart form data.

**Example Usage:**
```javascript
import { useMutation } from '@apollo/react-hooks';
import uploadImage from './graphql/uploadImage';

function ImageUploader() {
  const [upload, { loading }] = useMutation(uploadImage);

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async () => {
      const base64 = reader.result.split(',')[1];

      const { data } = await upload({
        variables: {
          base64,
          contentType: file.type,
          fileName: file.name,
          cacheControl: 'public, max-age=31536000'
        }
      });

      const imageUrl = data.uploadImage.url;
      // Use imageUrl...
    };

    reader.readAsDataURL(file);
  };

  return <input type="file" onChange={handleFileChange} />;
}
```

**Found In:**
- Image upload components
- File upload utilities

---

### Pattern: Fragment Composition

**Description:** GraphQL fragments are composed to build complete type queries, promoting reusability.

**Example:**
```javascript
// Base fragment
const imageFields = `
  fragment imageFields on Image {
    url
    width
    height
    alt_text
  }
`;

// Composite fragment uses base fragment
const campaignImages = `
  ${imageFields}

  fragment campaignImages on CampaignImages {
    main { ...imageFields }
    mobile { ...imageFields }
    email { ...imageFields }
  }
`;

// Query uses composite fragment
const query = gql`
  ${campaignImages}

  query getCampaign($id: ID!) {
    campaign(id: $id) {
      image {
        ...campaignImages
      }
    }
  }
`;
```

**Found In:**
- All fragment files in `/frontend/src/graphql/fragments/`
- Query files that import and compose fragments

---

### Pattern: Polymorphic Type Queries

**Description:** GraphQL interface queries with inline fragments for concrete type-specific fields.

**Example:**
```javascript
query getCampaign($id: ID!) {
  campaign(id: $id) {
    # Common interface fields
    id
    type
    name

    # Type-specific fields
    ... on RegistrationCampaign {
      domain {
        site
      }
      options {
        requirePassword
      }
    }

    ... on FanlistCampaign {
      eventIds
      scoring
    }
  }
}
```

**Found In:**
- `getCampaign.js` query
- `upsertCampaign.js` mutation
- `campaignsList.js` query

---

### Pattern: Localized Content Access

**Description:** Multi-locale content stored in array format, accessed by locale key.

**Example:**
```javascript
// GraphQL returns localized content
const campaign = {
  content: {
    localized: [
      { locale: 'en_US', value: { ... } },
      { locale: 'fr_CA', value: { ... } }
    ]
  }
};

// Access pattern in JavaScript
function getLocalizedContent(campaign, locale) {
  const localized = campaign.content.localized.find(
    item => item.locale === locale
  );
  return localized ? localized.value : null;
}

// Usage
const contentEN = getLocalizedContent(campaign, 'en_US');
const welcomeHeader = contentEN.body.started.welcome.header;
```

**Found In:**
- Content rendering components
- Localization utilities in `/frontend/src/shared/utils/localizationUtils.js`

---

### Pattern: Nested Type Transformation

**Description:** Input types transform to output types with computed/enriched fields.

**Data Flow Example:**
```javascript
// Input (client → server)
const campaignInput = {
  name: 'Summer Tour',
  date: {
    open: '2025-06-01T00:00:00Z',
    close: '2025-06-30T23:59:59Z'
  },
  artist: {
    id: 'artist-123',
    name: 'Artist Name'
  }
};

// Output (server → client)
const campaignOutput = {
  id: 'campaign-456', // Generated
  name: 'Summer Tour',
  date: {
    created: '2025-05-01T10:30:00Z', // Auto-added
    updated: '2025-05-15T14:20:00Z', // Auto-updated
    opened: null, // Computed when campaign opens
    closed: null, // Computed when campaign closes
    open: '2025-06-01T00:00:00Z',
    close: '2025-06-30T23:59:59Z'
  },
  artist: {
    id: 'artist-123',
    name: 'Artist Name',
    discovery_id: 'disc-789', // Enriched from discovery service
    image_url: 'https://...', // Enriched from discovery service
  },
  eligibility: { // Computed field (not in input)
    isEligible: true,
    reason: null
  }
};
```

**Found Throughout:** All mutation operations

---

### Pattern: Pagination

**Description:** Standard limit/skip pagination for list queries.

**Example Usage:**
```javascript
const { data } = useQuery(campaignsList, {
  variables: {
    limit: 20,
    skip: page * 20,
    sort: '-created' // descending by created date
  }
});

// Infinite scroll pagination
const [loadMore] = useLazyQuery(campaignsList);
const handleScroll = () => {
  if (atBottom && !loading) {
    loadMore({
      variables: {
        limit: 20,
        skip: data.campaigns.list.length
      }
    });
  }
};
```

**Found In:**
- List view components
- Infinite scroll implementations

---

### Pattern: Metrics Aggregation

**Description:** Metrics queries return aggregated count data by market/preference.

**Example:**
```javascript
const { data } = useQuery(entriesByMarketPreference, {
  variables: { campaignId: 'campaign-123' }
});

// Result structure:
// [
//   { id: 'market-1', counts: [100, 50, 25] }, // counts by preference rank
//   { id: 'market-2', counts: [80, 40, 20] }
// ]

// Usage in chart
const chartData = data.metrics.entriesByMarketPreference.map(market => ({
  marketId: market.id,
  firstChoice: market.counts[0],
  secondChoice: market.counts[1],
  thirdChoice: market.counts[2]
}));
```

**Found In:**
- Metrics dashboard components
- Analytics visualization

---

## Type Confidence Summary

**High Confidence (95-100%):** All types documented
- All types are explicitly defined in GraphQL schema
- GraphQL provides compile-time type validation
- Schema serves as single source of truth

**Medium Confidence (70-94%):** None
- No JSDoc or validation schemas found

**Low Confidence (50-69%):** None
- No implicit types inferred from defaults

---

## Notes

- **No TypeScript**: This codebase uses JavaScript exclusively; no `.ts` or `.tsx` files found in source directories
- **Type Safety**: Provided entirely by GraphQL schema at runtime
- **GraphQL Client**: Apollo Client v2 with apollo-upload-client for file uploads
- **Fragment Pattern**: Extensive use of fragment composition for type reusability
- **Polymorphism**: Campaign interface with RegistrationCampaign and FanlistCampaign implementations
- **Localization**: Multi-locale support with localized content arrays (legacy locale fields deprecated)
- **File Uploads**: Base64 encoding for images, multipart for bulk data files
