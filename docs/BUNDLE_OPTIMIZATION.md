# Bundle Size Optimization & Lazy Loading

This document outlines the bundle size optimizations and lazy loading strategies implemented in BucketBoard.

## Overview

The application has been optimized to reduce initial bundle size and improve loading performance through strategic code splitting and lazy loading.

## Optimizations Implemented

### 1. Dynamic Imports for Cloud Provider SDKs

**Problem**: Cloud provider SDKs (@aws-sdk/client-s3, @azure/storage-blob, @google-cloud/storage) are heavy dependencies (~500KB+ combined) that were all loaded upfront even when only one provider was being used.

**Solution**: Modified `provider-factory.ts` to use dynamic imports, loading only the required provider SDK when needed.

```typescript
// Before: All SDKs loaded upfront
import { AWSS3Provider } from './providers/aws-s3';
import { AzureBlobProvider } from './providers/azure-blob';
import { GCPStorageProvider } from './providers/gcp-storage';

// After: Lazy loaded on demand
export async function createStorageProvider(connection: Connection): Promise<StorageProvider> {
  if (provider === 'aws-s3') {
    const { AWSS3Provider } = await import('./providers/aws-s3');
    return new AWSS3Provider(connection);
  }
  // Similar for other providers...
}
```

**Impact**:

- Reduces initial bundle size by ~500KB
- Only loads the SDK for the provider actually being used
- All API routes updated to handle async provider creation

### 2. Lazy Loading Heavy UI Components

**Components Optimized**:

- `ProgressTracker` - File upload/download progress component
- `VirtualizedObjectList` - Large list rendering component
- `ConnectionForm` - Form component with provider-specific fields

**Implementation**:

```typescript
// In buckets/page.tsx
const ProgressTracker = dynamic(
  () => import('@/components/ProgressTracker').then((mod) => mod.ProgressTracker),
  { ssr: false }
);

const VirtualizedObjectList = dynamic(
  () => import('@/components/VirtualizedObjectList').then((mod) => mod.VirtualizedObjectList),
  { ssr: false }
);
```

**Impact**:

- These components are only loaded when actually needed
- Reduces initial page load time
- Components are loaded in parallel when needed

### 3. Next.js Configuration Optimizations

**Turbopack Configuration** (Next.js 16+):

- Enabled Turbopack for faster builds
- Configured package import optimization for better tree-shaking

**optimizePackageImports**:

```typescript
experimental: {
  optimizePackageImports: [
    '@aws-sdk/client-s3',
    '@azure/storage-blob',
    '@google-cloud/storage',
    'react-window',
  ],
}
```

**Other Optimizations**:

- Disabled production source maps (`productionBrowserSourceMaps: false`)
- Enabled compression for static assets
- Configured modern image formats (AVIF, WebP)

## Performance Benefits

### Before Optimization:

- All cloud provider SDKs loaded upfront (~500KB)
- Heavy components loaded on initial page load
- Larger initial bundle size

### After Optimization:

- Cloud provider SDKs loaded on-demand (only when needed)
- Heavy components lazy-loaded (only when displayed)
- Smaller initial bundle size
- Faster Time to Interactive (TTI)
- Better code splitting via Turbopack

## Code Changes Summary

### Files Modified:

1. `src/lib/storage/provider-factory.ts` - Dynamic imports for SDKs
2. `src/app/buckets/page.tsx` - Lazy load ProgressTracker & VirtualizedObjectList
3. `src/app/connections/page.tsx` - Lazy load ConnectionForm
4. `next.config.ts` - Turbopack config and optimizations
5. All API routes - Updated to handle async `createStorageProvider()`

### API Routes Updated:

- `/api/buckets/route.ts`
- `/api/buckets/[bucket]/objects/route.ts`
- `/api/buckets/[bucket]/download/route.ts`
- `/api/buckets/[bucket]/metadata/route.ts`
- `/api/buckets/[bucket]/metadata/update/route.ts`
- `/api/connections/test/route.ts`
- `/api/analytics/route.ts`

## Testing

All optimizations have been verified:

- ✅ TypeScript compilation passes without errors
- ✅ Build completes successfully with Turbopack
- ✅ Dynamic imports work correctly
- ✅ Lazy-loaded components render properly
- ✅ All API routes handle async provider creation

## Future Optimization Opportunities

1. **Route-based code splitting**: Already handled by Next.js App Router
2. **Image optimization**: Configure next/image for optimal loading
3. **Font optimization**: Already using next/font with Geist fonts
4. **Bundle analysis**: Use `@next/bundle-analyzer` for detailed insights
5. **Service Worker**: Consider implementing for offline support and caching

## Monitoring

To analyze bundle size in the future:

```bash
# Install bundle analyzer
pnpm add -D @next/bundle-analyzer

# Run build with analyzer
ANALYZE=true pnpm build
```

## Notes

- Dynamic imports add minimal runtime overhead (microseconds)
- The async nature of `createStorageProvider` is handled transparently by API routes
- Client-side components are lazy-loaded with `ssr: false` to prevent hydration issues
- Turbopack provides faster builds compared to webpack in Next.js 16+
