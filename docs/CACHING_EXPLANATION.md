# Caching System Explanation

## How the Caching Works

The caching system uses a **Time-To-Live (TTL)** approach with automatic expiration. Here's how it works:

### 1. Cache Storage Layers

The system uses two storage layers:

- **Memory Cache**: Fast in-memory storage (Map) - cleared when page refreshes
- **localStorage**: Persistent browser storage - survives page refreshes (only for connections)

### 2. Cache Entry Structure

Each cached entry contains:
```typescript
{
  data: <the actual data>,
  timestamp: <when it was cached>,
  ttl: <how long it's valid in milliseconds>
}
```

### 3. Default TTL Values

Different data types have different cache durations:

- **Connections**: 5 minutes (persisted to localStorage)
- **Buckets**: 2 minutes
- **Objects/Files**: 1 minute
- **Metadata**: 30 seconds
- **Analytics**: 5 minutes

### 4. How Data is Retrieved

When you request data:

1. **Check Memory Cache First**: If found and not expired → return immediately
2. **Check localStorage** (if enabled): If found and not expired → restore to memory and return
3. **Fetch from API**: If not cached or expired → make API call, cache the result, then return

### 5. Cache Key Structure

Cache keys are constructed from relevant identifiers:
```
objects:bucket-name:connection-id:prefix
metadata:bucket-name:connection-id:file-key
analytics:connection-id
```

## What Happens When Files Are Added Outside the App?

### Current Behavior: **Stale Data Until TTL Expires**

If a file is added to a bucket outside of this app (via AWS Console, CLI, another app, etc.):

1. **The cache still contains the old file list** (up to 1 minute old)
2. **The new file won't appear** until:
   - The cache expires (after 1 minute for objects)
   - You manually refresh the page
   - You navigate away and back
   - You perform an action that invalidates the cache (upload, delete, etc.)

### Cache Invalidation Points

The cache is automatically invalidated when you:

✅ **Upload files** → Invalidates object cache for that bucket/prefix
✅ **Delete files** → Invalidates object cache for that bucket/prefix  
✅ **Update metadata** → Invalidates metadata cache for that file + analytics cache
✅ **Add/delete connections** → Invalidates connections cache

### What's NOT Automatically Invalidated

❌ Files added outside the app
❌ Files deleted outside the app
❌ Metadata changed outside the app
❌ New buckets created outside the app

## Example Scenarios

### Scenario 1: File Added via AWS Console

1. You're viewing a folder in BucketBoard (cached for 1 minute)
2. You add a file `new-file.txt` via AWS Console
3. **In BucketBoard**: The file won't appear immediately
4. **After 1 minute**: The cache expires, next navigation will fetch fresh data
5. **Or**: Click refresh, navigate away/back, or perform any action that invalidates cache

### Scenario 2: Multiple Files Uploaded via CLI

1. You upload 10 files via AWS CLI to a folder
2. You're viewing that folder in BucketBoard
3. **The files won't appear** until cache expires or you trigger invalidation
4. **Solution**: Click the refresh button (if we add one) or wait 1 minute

## Current Limitations

1. **No automatic refresh**: The app doesn't poll for changes
2. **No real-time updates**: No WebSocket or Server-Sent Events
3. **TTL-based only**: Relies on time expiration, not event-driven invalidation
4. **No manual refresh button**: Users can't force a refresh without navigating

## Potential Improvements

### Option 1: Add Manual Refresh Button
```typescript
// Add a refresh button that calls refetch()
<button onClick={() => refetchObjects()}>Refresh</button>
```

### Option 2: Reduce TTL for Objects
```typescript
OBJECTS: 30 * 1000, // 30 seconds instead of 1 minute
```

### Option 3: Add "Last Updated" Indicator
Show users when the data was last fetched:
```typescript
"Last updated: 45 seconds ago"
```

### Option 4: Implement Polling (Advanced)
Periodically check for changes:
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    refetchObjects();
  }, 30000); // Every 30 seconds
  return () => clearInterval(interval);
}, []);
```

### Option 5: Add ETag/Version Checking (Most Robust)
Check if data has changed before showing stale cache:
```typescript
// API returns ETag header
// Compare with cached ETag
// Only use cache if ETag matches
```

## Code Locations

### Cache Implementation
- `src/lib/utils/cache.ts` - Core caching logic
- `src/lib/utils/use-cached-fetch.ts` - React hook for cached fetching

### Cache Usage
- `src/app/buckets/page.tsx` - Buckets and objects listing
- `src/app/analytics/page.tsx` - Analytics data
- `src/app/connections/page.tsx` - Connections list

### Cache Invalidation
- File upload: `src/app/buckets/page.tsx:366`
- File delete: `src/app/buckets/page.tsx:557`
- Metadata update: `src/app/buckets/page.tsx:811`
- Connection changes: `src/app/connections/page.tsx`

## Summary

**The caching system prioritizes performance over real-time accuracy.** 

- ✅ **Fast**: Cached data loads instantly
- ✅ **Reduces API calls**: Saves bandwidth and API costs
- ⚠️ **Stale data possible**: Up to 1 minute old for objects
- ⚠️ **No external change detection**: Changes outside the app aren't detected

For most use cases, a 1-minute cache is acceptable. If you need real-time updates, consider implementing one of the improvements above.
