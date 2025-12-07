/**
 * Intelligent caching system with TTL support and prefetching capabilities
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

export interface CacheOptions {
  ttl?: number; // Default TTL in milliseconds
  useLocalStorage?: boolean; // Whether to persist to localStorage
  storageKey?: string; // Key for localStorage
}

// Default TTL values (in milliseconds)
export const DEFAULT_TTL = {
  CONNECTIONS: 5 * 60 * 1000, // 5 minutes
  BUCKETS: 2 * 60 * 1000, // 2 minutes
  OBJECTS: 1 * 60 * 1000, // 1 minute
  METADATA: 30 * 1000, // 30 seconds
  ANALYTICS: 5 * 60 * 1000, // 5 minutes
};

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private prefetchQueue: Set<string> = new Set();
  private maxCacheSize = 100; // Maximum number of entries in memory cache

  /**
   * Get a cached value if it exists and is not expired
   */
  get<T>(key: string, options?: CacheOptions): T | null {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Try localStorage if enabled
    if (options?.useLocalStorage && typeof window !== 'undefined') {
      const storageKey = options.storageKey || `cache_${key}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const entry: CacheEntry<T> = JSON.parse(stored);
          if (this.isValid(entry)) {
            // Restore to memory cache
            this.memoryCache.set(key, entry);
            return entry.data;
          } else {
            // Remove expired entry
            localStorage.removeItem(storageKey);
          }
        }
      } catch (error) {
        console.warn(`Error reading from localStorage cache (key: ${storageKey}):`, error);
        // Remove corrupted entry
        try {
          localStorage.removeItem(storageKey);
        } catch (removeError) {
          console.warn('Error removing corrupted cache entry:', removeError);
        }
      }
    }

    return null;
  }

  /**
   * Get the timestamp when a cached value was last updated
   */
  getTimestamp(key: string, options?: CacheOptions): number | null {
    // Try memory cache first
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.timestamp;
    }

    // Try localStorage if enabled
    if (options?.useLocalStorage && typeof window !== 'undefined') {
      const storageKey = options.storageKey || `cache_${key}`;
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const entry: CacheEntry<any> = JSON.parse(stored);
          if (this.isValid(entry)) {
            return entry.timestamp;
          }
        }
      } catch (error) {
        console.warn('Error reading timestamp from localStorage cache:', error);
      }
    }

    return null;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, data: T, options?: CacheOptions): void {
    const ttl = options?.ttl || DEFAULT_TTL.OBJECTS;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    // Store in memory cache
    this.memoryCache.set(key, entry);

    // Enforce max cache size
    if (this.memoryCache.size > this.maxCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    // Store in localStorage if enabled
    if (options?.useLocalStorage && typeof window !== 'undefined') {
      const storageKey = options.storageKey || `cache_${key}`;
      try {
        localStorage.setItem(storageKey, JSON.stringify(entry));
      } catch (error) {
        console.warn('Error writing to localStorage cache:', error);
        // If localStorage is full, try to clear old entries
        this.cleanupLocalStorage();
      }
    }
  }

  /**
   * Check if a cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string, options?: CacheOptions): void {
    this.memoryCache.delete(key);

    if (options?.useLocalStorage && typeof window !== 'undefined') {
      const storageKey = options.storageKey || `cache_${key}`;
      localStorage.removeItem(storageKey);
    }
  }

  /**
   * Invalidate all entries matching a pattern
   */
  invalidatePattern(pattern: string | RegExp): void {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keysToDelete: string[] = [];

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => this.memoryCache.delete(key));

    // Also clean localStorage
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cache_')) {
            const cacheKey = key.replace('cache_', '');
            if (regex.test(cacheKey)) {
              keysToRemove.push(key);
            }
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Error cleaning localStorage:', error);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.memoryCache.clear();

    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('cache_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (error) {
        console.warn('Error clearing localStorage:', error);
      }
    }
  }

  /**
   * Prefetch data (non-blocking)
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<void> {
    // Don't prefetch if already in queue or cache
    if (this.prefetchQueue.has(key) || this.get<T>(key, options)) {
      return;
    }

    this.prefetchQueue.add(key);

    try {
      const data = await fetcher();
      this.set(key, data, options);
    } catch (error) {
      console.warn(`Prefetch failed for ${key}:`, error);
    } finally {
      this.prefetchQueue.delete(key);
    }
  }

  /**
   * Clean up expired entries from localStorage
   */
  private cleanupLocalStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cache_')) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const entry: CacheEntry<any> = JSON.parse(stored);
              if (!this.isValid(entry)) {
                keysToRemove.push(key);
              }
            }
          } catch (parseError) {
            // Invalid entry, remove it
            console.warn(`Removing corrupted cache entry: ${key}`, parseError);
            keysToRemove.push(key);
          }
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Error during localStorage cleanup:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memorySize: number;
    memoryEntries: number;
  } {
    return {
      memorySize: this.memoryCache.size,
      memoryEntries: this.memoryCache.size,
    };
  }
}

// Singleton instance
export const cacheManager = new CacheManager();

// Cleanup expired entries on initialization
if (typeof window !== 'undefined') {
  // Access private method for cleanup - this is intentional for initialization
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (cacheManager as any).cleanupLocalStorage();
}
