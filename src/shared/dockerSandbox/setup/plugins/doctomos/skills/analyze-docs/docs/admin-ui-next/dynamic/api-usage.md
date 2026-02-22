# API Usage - admin-ui-next

## Overview

This document provides practical examples and guidance for using the APIs consumed by the admin-ui-next frontend application.

---

## GraphQL API Usage

### Client Configuration

The GraphQL client is configured via Apollo Client and wrapped in a Next.js App Router compatible provider:

```typescript
import ApolloWrapper from 'lib/graphql/apollo/ApolloWrapper';

// In app layout
<ApolloWrapper>
  {children}
</ApolloWrapper>
```

**Key Features**:
- Automatic typename cleanup utility (`cleanTypename`)
- Cookie-based authentication (credentials included)
- InMemoryCache for client-side caching
- Next.js App Router integration via `@apollo/client-integration-nextjs`

---

## Authentication

### Cookie-Based Sessions

All GraphQL requests automatically include credentials:

```typescript
const httpLink = new HttpLink({
  uri: config.GRAPHQL_URL,
  credentials: 'include',  // Sends cookies with requests
  fetchOptions: {
    // Additional Next.js fetch options can be added here
  }
});
```

**Authentication Flow**:
1. User authenticates via `ACCOUNT_URL` (identity service)
2. Session cookie is set
3. All subsequent GraphQL requests include the cookie
4. Backend validates session and returns authorized data

**Checking Authentication Status**:
```typescript
// Use admin_initApp query to check login status
const { data } = useQuery(INIT_APP);

if (data?.viewer?.isLoggedIn) {
  // User is authenticated
  if (data.viewer.isAdmin) {
    // User has admin privileges
  }
}
```

---

## Query Examples

### Initialize Application

```typescript
import { useQuery } from '@apollo/client';
import { INIT_APP, InitAppRes } from 'lib/graphql/queries/initApp';

function AppInitializer() {
  const { data, loading, error } = useQuery<{ identity: InitAppRes['identity'], viewer: InitAppRes['viewer'] }>(INIT_APP);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Welcome, {data.viewer.firstName} {data.viewer.lastName}</h1>
      <p>Version: {data.identity.version}</p>
    </div>
  );
}
```

---

### List Campaigns with Pagination

```typescript
import { useQuery } from '@apollo/client';
import { CAMPAIGNS_LIST, CampaignsListRes } from 'lib/graphql/queries/campaignsList';

function CampaignsList() {
  const { data, loading, fetchMore } = useQuery<CampaignsListRes>(CAMPAIGNS_LIST, {
    variables: {
      limit: 20,
      skip: 0,
      sort: '-date.created',  // Sort by creation date descending
      type: 'REGISTRATION',    // Filter by campaign type
    }
  });

  const loadMore = () => {
    fetchMore({
      variables: {
        skip: data.viewer.campaigns.list.length
      }
    });
  };

  if (loading) return <div>Loading campaigns...</div>;

  return (
    <div>
      {data.viewer.campaigns.list.map(campaign => (
        <div key={campaign.id}>
          <h3>{campaign.name}</h3>
          <p>Status: {campaign.status}</p>
          <p>Domain: {campaign.domain.site}</p>
        </div>
      ))}
      <button onClick={loadMore}>Load More</button>
    </div>
  );
}
```

---

### Get Campaign Details

```typescript
import { useQuery } from '@apollo/client';
import { GET_CAMPAIGN, CampaignRes } from 'lib/graphql/queries/getCampaign';

function CampaignDetail({ campaignId }: { campaignId: string }) {
  const { data, loading } = useQuery<{ viewer: { campaign: CampaignRes } }>(GET_CAMPAIGN, {
    variables: {
      id: campaignId,
      locale: 'en-US',
      showAllLocales: false
    }
  });

  if (loading) return <div>Loading...</div>;

  const campaign = data.viewer.campaign;

  return (
    <div>
      <h1>{campaign.name}</h1>
      <h2>Artist: {campaign.artist.name}</h2>
      <img src={campaign.artist.image_url} alt={campaign.artist.name} />

      <h3>Important Dates</h3>
      <ul>
        <li>Opens: {new Date(campaign.date.open).toLocaleString()}</li>
        <li>Closes: {new Date(campaign.date.close).toLocaleString()}</li>
        <li>General Onsale: {new Date(campaign.date.generalOnsale).toLocaleString()}</li>
      </ul>

      <h3>Markets ({campaign.markets.length})</h3>
      {campaign.markets.map(market => (
        <div key={market.id}>
          <h4>{market.name}</h4>
          <p>{market.city}, {market.state}</p>
          <p>Event: {market.event.name} at {market.event.venue.name}</p>
          <p>Date: {new Date(market.event.date).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Search Venues

```typescript
import { useLazyQuery } from '@apollo/client';
import { SEARCH_VENUES, VenueRes } from 'lib/graphql/queries/searchVenues';
import { useState } from 'react';

function VenueSearch() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchVenues, { data, loading }] = useLazyQuery<{ searchVenues: VenueRes[] }>(SEARCH_VENUES);

  const handleSearch = () => {
    searchVenues({
      variables: {
        queryStr: searchQuery,
        limit: 10,
        skip: 0
      }
    });
  };

  return (
    <div>
      <input
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search venues..."
      />
      <button onClick={handleSearch}>Search</button>

      {loading && <p>Searching...</p>}

      {data?.searchVenues.map(venue => (
        <div key={venue.id}>
          <h4>{venue.name}</h4>
          <p>{venue.city}, {venue.state}, {venue.country}</p>
          <p>Timezone: {venue.timezone}</p>
          <p>Coordinates: {venue.point.latitude}, {venue.point.longitude}</p>
        </div>
      ))}
    </div>
  );
}
```

---

### Get Promoters

```typescript
import { useQuery } from '@apollo/client';
import { GET_PROMOTERS } from 'lib/graphql/queries/getPromoters';
import { Promoter } from 'lib/graphql/fragments/promoterFields';

function PromotersList() {
  const { data, loading } = useQuery<{ promoters: Promoter[] }>(GET_PROMOTERS);

  if (loading) return <div>Loading promoters...</div>;

  return (
    <div>
      <h2>Promoters</h2>
      {data.promoters.map(promoter => (
        <div key={promoter.id}>
          <h3>{promoter.name}</h3>
          <h4>Privacy URLs:</h4>
          <ul>
            {promoter.privacyUrls.map((url, idx) => (
              <li key={idx}>
                <a href={url.url} target="_blank" rel="noopener noreferrer">
                  {url.locale} {url.is_default && '(default)'}
                </a>
              </li>
            ))}
          </ul>
          <p>Created: {new Date(promoter.date.created).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}
```

---

## Mutation Examples

### Create/Update Market

```typescript
import { useMutation } from '@apollo/client';
import { UPSERT_MARKET } from 'lib/graphql/mutations/upsertMarket';
import { MarketRes } from 'lib/graphql/fragments/marketObject';

function MarketForm({ campaignId }: { campaignId: string }) {
  const [upsertMarket, { loading, error }] = useMutation<{ upsertMarket: MarketRes }>(UPSERT_MARKET);

  const handleSubmit = async (formData: any) => {
    try {
      const { data } = await upsertMarket({
        variables: {
          market: {
            id: formData.id, // Omit for new market
            name: formData.name,
            city: formData.city,
            state: formData.state,
            population: parseInt(formData.population),
            timezone: formData.timezone,
            point: {
              latitude: parseFloat(formData.latitude),
              longitude: parseFloat(formData.longitude)
            },
            event: {
              ids: formData.eventIds,
              name: formData.eventName,
              date: formData.eventDate,
              presaleDateTime: formData.presaleDateTime,
              ticketer: formData.ticketer,
              link: formData.link,
              venue: {
                name: formData.venueName
              },
              sharedCode: formData.sharedCode
            },
            isAddedShow: formData.isAddedShow,
            promoterIds: formData.promoterIds
          }
        }
      });

      console.log('Market saved:', data.upsertMarket);
    } catch (err) {
      console.error('Failed to save market:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Market'}
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

---

### Delete Market

```typescript
import { useMutation } from '@apollo/client';
import { DELETE_MARKET } from 'lib/graphql/mutations/deleteMarket';

function DeleteMarketButton({ campaignId, marketId }: { campaignId: string; marketId: string }) {
  const [deleteMarket, { loading }] = useMutation<{ deleteMarket: boolean }>(DELETE_MARKET, {
    refetchQueries: ['admin_campaign'], // Refresh campaign data after deletion
  });

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this market?')) {
      return;
    }

    try {
      const { data } = await deleteMarket({
        variables: {
          campaignId,
          marketId,
          transferMarketId: null, // Optional: transfer data to another market
        }
      });

      if (data.deleteMarket) {
        console.log('Market deleted successfully');
      }
    } catch (err) {
      console.error('Failed to delete market:', err);
    }
  };

  return (
    <button onClick={handleDelete} disabled={loading}>
      {loading ? 'Deleting...' : 'Delete Market'}
    </button>
  );
}
```

---

### Create/Update Promoter

```typescript
import { useMutation } from '@apollo/client';
import { UPSERT_PROMOTER, PromoterInput } from 'lib/graphql/mutations/upsertPromoter';
import { Promoter } from 'lib/graphql/fragments/promoterFields';

function PromoterForm({ existingPromoter }: { existingPromoter?: Promoter }) {
  const [upsertPromoter, { loading, error }] = useMutation<{ upsertPromoter: Promoter }>(UPSERT_PROMOTER, {
    refetchQueries: ['promoters'], // Refresh promoters list
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formData = new FormData(e.target as HTMLFormElement);

    const input: PromoterInput = {
      id: existingPromoter?.id, // Omit for new promoter
      name: formData.get('name') as string,
      privacyUrls: [
        {
          locale: 'en-US',
          url: formData.get('privacyUrl_en') as string,
          is_default: true
        },
        {
          locale: 'es-MX',
          url: formData.get('privacyUrl_es') as string,
          is_default: false
        }
      ].filter(url => url.url) // Remove empty URLs
    };

    try {
      const { data } = await upsertPromoter({
        variables: { promoter: input }
      });

      console.log('Promoter saved:', data.upsertPromoter);
    } catch (err) {
      console.error('Failed to save promoter:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name:
        <input name="name" defaultValue={existingPromoter?.name} required />
      </label>

      <label>
        Privacy URL (English):
        <input
          name="privacyUrl_en"
          type="url"
          defaultValue={existingPromoter?.privacyUrls.find(u => u.locale === 'en-US')?.url}
          required
        />
      </label>

      <label>
        Privacy URL (Spanish):
        <input
          name="privacyUrl_es"
          type="url"
          defaultValue={existingPromoter?.privacyUrls.find(u => u.locale === 'es-MX')?.url}
        />
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : existingPromoter ? 'Update' : 'Create'} Promoter
      </button>
      {error && <p>Error: {error.message}</p>}
    </form>
  );
}
```

---

### Delete Promoter

```typescript
import { useMutation } from '@apollo/client';
import { DELETE_PROMOTER } from 'lib/graphql/mutations/deletePromoter';

function DeletePromoterButton({ promoterId }: { promoterId: string }) {
  const [deletePromoter, { loading }] = useMutation<{ deletePromoter: boolean }>(DELETE_PROMOTER, {
    refetchQueries: ['promoters'],
  });

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this promoter?')) {
      return;
    }

    try {
      const { data } = await deletePromoter({
        variables: { promoterId }
      });

      if (data.deletePromoter) {
        console.log('Promoter deleted successfully');
      }
    } catch (err) {
      console.error('Failed to delete promoter:', err);
    }
  };

  return (
    <button onClick={handleDelete} disabled={loading}>
      {loading ? 'Deleting...' : 'Delete Promoter'}
    </button>
  );
}
```

---

## Custom Hooks

### useUpsertMarket Hook Example

The application provides custom hooks for common operations:

```typescript
// lib/hooks/graphql/useUpsertMarket.ts
import { useMutation } from '@apollo/client';
import { UPSERT_MARKET } from 'lib/graphql/mutations/upsertMarket';

export function useUpsertMarket() {
  const [upsertMarket, { loading, error, data }] = useMutation(UPSERT_MARKET);

  return {
    upsertMarket,
    loading,
    error,
    data: data?.upsertMarket
  };
}

// Usage in component
function MyComponent() {
  const { upsertMarket, loading } = useUpsertMarket();

  const handleSave = () => {
    upsertMarket({
      variables: {
        market: { /* ... */ }
      }
    });
  };
}
```

---

## REST API Usage

### Health Check

```bash
# Check if the application is healthy
curl https://admin-dev.vf.nonprod9.us-east-1.tktm.io/heartbeat

# Response
{
  "status": "OK"
}
```

**Use Cases**:
- Load balancer health checks
- Uptime monitoring
- Deployment validation

---

### Metrics Endpoint

```bash
# Fetch Prometheus metrics
curl https://admin-dev.vf.nonprod9.us-east-1.tktm.io/metrics

# Response (sample)
# HELP process_cpu_user_seconds_total Total user CPU time spent in seconds.
# TYPE process_cpu_user_seconds_total counter
process_cpu_user_seconds_total 1.2345

# HELP nodejs_heap_size_total_bytes Process heap size from Node.js in bytes.
# TYPE nodejs_heap_size_total_bytes gauge
nodejs_heap_size_total_bytes 123456789

# HELP nodejs_heap_size_used_bytes Process heap size used from Node.js in bytes.
# TYPE nodejs_heap_size_used_bytes gauge
nodejs_heap_size_used_bytes 98765432
```

**Prometheus Scrape Configuration**:
```yaml
scrape_configs:
  - job_name: 'admin-ui-next'
    metrics_path: '/metrics'
    static_configs:
      - targets: ['admin-dev.vf.nonprod9.us-east-1.tktm.io']
```

**Available Metrics**:
- Process CPU usage
- Node.js heap memory usage
- Event loop lag
- Active handles
- Active requests
- GC statistics

---

## Error Handling

### GraphQL Errors

```typescript
import { ApolloError } from '@apollo/client';

function MyComponent() {
  const { data, loading, error } = useQuery(SOME_QUERY);

  if (error) {
    // Network error
    if (error.networkError) {
      console.error('Network error:', error.networkError.message);
    }

    // GraphQL errors
    if (error.graphQLErrors.length > 0) {
      error.graphQLErrors.forEach(({ message, locations, path }) => {
        console.error(
          `GraphQL error: ${message}`,
          `Location: ${JSON.stringify(locations)}`,
          `Path: ${path}`
        );
      });
    }

    return <div>Error loading data: {error.message}</div>;
  }

  // ... render data
}
```

### Common Error Scenarios

**401 Unauthorized**:
```typescript
// Handle authentication errors
if (error?.networkError?.statusCode === 401) {
  // Redirect to login
  window.location.href = `${config.ACCOUNT_URL}/login`;
}
```

**404 Not Found**:
```typescript
// Handle resource not found
if (error?.message.includes('not found')) {
  return <div>Campaign not found</div>;
}
```

**Mutation Errors**:
```typescript
const [upsertMarket, { error }] = useMutation(UPSERT_MARKET, {
  onError: (error) => {
    // Handle specific error cases
    if (error.message.includes('duplicate')) {
      alert('A market with this name already exists');
    } else if (error.message.includes('validation')) {
      alert('Invalid data provided');
    } else {
      alert('Failed to save market');
    }
  },
  onCompleted: (data) => {
    alert('Market saved successfully!');
  }
});
```

---

## Caching Strategy

### Apollo InMemoryCache

The application uses Apollo's InMemoryCache with automatic typename removal:

```typescript
// Utility to remove __typename before mutations
import { cleanTypename } from 'lib/graphql/apollo/ApolloWrapper';

const marketData = cleanTypename(data.viewer.campaign.markets[0]);

// Now safe to use in mutations without __typename
upsertMarket({
  variables: {
    market: marketData
  }
});
```

### Cache Updates After Mutations

```typescript
const [deleteMarket] = useMutation(DELETE_MARKET, {
  // Option 1: Refetch specific queries
  refetchQueries: ['admin_campaign', 'admin_campaignsList'],

  // Option 2: Update cache manually
  update(cache, { data: { deleteMarket } }) {
    if (deleteMarket) {
      // Manually update cached data
      cache.modify({
        id: cache.identify({ __typename: 'Campaign', id: campaignId }),
        fields: {
          markets(existingMarkets = [], { readField }) {
            return existingMarkets.filter(
              marketRef => readField('id', marketRef) !== marketId
            );
          }
        }
      });
    }
  }
});
```

---

## Best Practices

### 1. Use TypeScript Types

Always use the provided TypeScript types for type safety:

```typescript
import { CampaignRes } from 'lib/graphql/queries/getCampaign';
import { MarketRes } from 'lib/graphql/fragments/marketObject';

// Type-safe query result
const { data } = useQuery<{ viewer: { campaign: CampaignRes } }>(GET_CAMPAIGN);
```

### 2. Handle Loading States

Always provide loading indicators:

```typescript
if (loading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <DataDisplay data={data} />;
```

### 3. Optimize Queries

Only request fields you need:

```typescript
// Instead of using all fragments, create minimal queries
const MINIMAL_CAMPAIGN = gql`
  query minimal_campaign($id: String!) {
    viewer {
      campaign(id: $id) {
        id
        name
        status
      }
    }
  }
`;
```

### 4. Clean Typename Before Mutations

Always remove `__typename` before sending data back:

```typescript
import { cleanTypename } from 'lib/graphql/apollo/ApolloWrapper';

const sanitizedData = cleanTypename(formData);
upsertMarket({ variables: { market: sanitizedData } });
```

### 5. Refetch or Update Cache

After mutations, ensure UI reflects changes:

```typescript
const [deleteMutation] = useMutation(DELETE_MUTATION, {
  refetchQueries: ['relevantQuery'],
  awaitRefetchQueries: true, // Wait for refetch to complete
});
```

---

## Environment-Specific Configuration

### Development
```yaml
GRAPHQL_URL: https://monoql-dev.vf.nonprod9.us-east-1.tktm.io/graphql
ADMIN_URL: https://admin-dev.vf.nonprod9.us-east-1.tktm.io
```

### QA
```yaml
GRAPHQL_URL: https://monoql-qa.vf.nonprod9.us-east-1.tktm.io/graphql
ADMIN_URL: https://admin-qa.vf.nonprod9.us-east-1.tktm.io
```

### Pre-Production
```yaml
GRAPHQL_URL: https://monoql-preprod.vf.nonprod9.us-east-1.tktm.io/graphql
ADMIN_URL: https://admin-preprod.vf.nonprod9.us-east-1.tktm.io
```

### Production
```yaml
GRAPHQL_URL: https://monoql.vf.prod.us-east-1.tktm.io/graphql
ADMIN_URL: https://admin.vf.prod.us-east-1.tktm.io
```

---

## Rate Limits

**GraphQL API**: No explicit rate limits documented in the frontend. Rate limiting is handled by the backend GraphQL service.

**REST Endpoints**: Health and metrics endpoints have no rate limits as they are designed for frequent polling by monitoring systems.

---

## Support and Troubleshooting

### Common Issues

**Issue**: Mutation returns success but UI doesn't update
- **Solution**: Add `refetchQueries` or update cache manually

**Issue**: Authentication errors (401)
- **Solution**: Redirect to `ACCOUNT_URL` for re-authentication

**Issue**: GraphQL typename conflicts in mutations
- **Solution**: Use `cleanTypename()` utility before submitting

**Issue**: Stale data after navigation
- **Solution**: Consider Apollo's `fetchPolicy` options:
  - `cache-first` (default)
  - `network-only` (always fetch fresh)
  - `cache-and-network` (show cached, fetch fresh)

### Debugging

Enable Apollo Client Developer Tools:

```typescript
// In browser console
window.__APOLLO_CLIENT__ = apolloClient;

// View cache
apolloClient.cache.extract();

// Run query manually
apolloClient.query({ query: MY_QUERY, variables: { ... } });
```
