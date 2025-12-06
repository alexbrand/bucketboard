/**
 * React hook for cached data fetching with prefetching support
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { cacheManager, DEFAULT_TTL, CacheOptions } from './cache';

// Re-export DEFAULT_TTL for convenience
export { DEFAULT_TTL } from './cache';

export interface UseCachedFetchOptions extends CacheOptions {
  enabled?: boolean; // Whether to enable fetching
  refetchOnMount?: boolean; // Whether to refetch when component mounts
}

export interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  lastUpdated: number | null; // Timestamp when data was last fetched
  refetch: () => Promise<void>;
  invalidate: () => void;
}

/**
 * Hook for fetching and caching data with intelligent prefetching
 */
export function useCachedFetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: UseCachedFetchOptions = {}
): UseCachedFetchResult<T> {
  const {
    ttl,
    useLocalStorage = false,
    storageKey,
    enabled = true,
    refetchOnMount = false,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetcherRef = useRef(fetcher);
  const cacheOptions: CacheOptions = useMemo(
    () => ({ ttl, useLocalStorage, storageKey }),
    [ttl, useLocalStorage, storageKey]
  );

  // Update fetcher ref when it changes (but don't trigger re-renders)
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    // Check cache first (unless forcing refresh)
    if (!force) {
      const cached = cacheManager.get<T>(cacheKey, cacheOptions);
      if (cached !== null) {
        const timestamp = cacheManager.getTimestamp(cacheKey, cacheOptions);
        setData(cached);
        setError(null);
        setLastUpdated(timestamp);
        setLoading(false);
        return;
      }
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      // Use ref to get latest fetcher without adding it to dependencies
      const result = await fetcherRef.current();
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      cacheManager.set(cacheKey, result, cacheOptions);
      setData(result);
      setLastUpdated(Date.now());
    } catch (err) {
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }

      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      console.error(`Error fetching ${cacheKey}:`, error);
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [cacheKey, enabled, cacheOptions]);

  const invalidate = useCallback(() => {
    cacheManager.invalidate(cacheKey, cacheOptions);
    setData(null);
  }, [cacheKey, cacheOptions]);

  // Fetch data when cacheKey changes or component mounts
  useEffect(() => {
    if (!enabled) return;

    // Check cache and set initial state
    const cached = cacheManager.get<T>(cacheKey, cacheOptions);
    const timestamp = cacheManager.getTimestamp(cacheKey, cacheOptions);
    
    if (cached !== null && timestamp !== null) {
      // We have cached data - show it immediately
      setData(cached);
      setLastUpdated(timestamp);
      setError(null);
      setLoading(false);
      
      // Still fetch in background if refetchOnMount is true, or if cache is about to expire
      const cacheAge = Date.now() - timestamp;
      const ttlValue = cacheOptions.ttl || DEFAULT_TTL.OBJECTS;
      const shouldRefetch = refetchOnMount || cacheAge > ttlValue * 0.8; // Refetch if 80% of TTL has passed
      
      if (shouldRefetch) {
        fetchData(true);
      }
    } else {
      // No cached data - show loading and fetch
      setData(null);
      setError(null);
      setLastUpdated(null);
      setLoading(true);
      // Force fetch since we know cache is empty
      fetchData(true);
    }
  }, [enabled, refetchOnMount, cacheKey, fetchData, cacheOptions]); // Refetch when cacheKey changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refetch: () => fetchData(true),
    invalidate,
  };
}

/**
 * Hook for prefetching data (non-blocking)
 */
export function usePrefetch<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
) {
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);

  // Update refs when they change (but don't trigger re-renders)
  useEffect(() => {
    fetcherRef.current = fetcher;
  }, [fetcher]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const prefetch = useCallback(() => {
    cacheManager.prefetch(cacheKey, fetcherRef.current, optionsRef.current);
  }, [cacheKey]);

  return prefetch;
}

/**
 * Helper to create cache keys
 */
export function createCacheKey(...parts: (string | number | undefined)[]): string {
  return parts.filter(Boolean).join(':');
}
