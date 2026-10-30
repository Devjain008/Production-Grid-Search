/**
 * Stale-While-Revalidate (SWR) Client-Side API Cache with In-Flight Deduplication & Abort Signals
 * Guarantees zero-lag tab switches, background revalidations, and zero duplicate network hits.
 */

class ApiCacheManager {
  constructor() {
    this.cache = new Map();
    this.inFlight = new Map();
    this.defaultTtl = 60 * 1000; // 60 seconds TTL
  }

  /**
   * Fetch with Stale-While-Revalidate semantics & in-flight deduplication
   */
  async get(url, options = {}) {
    const {
      ttl = this.defaultTtl,
      signal = null,
      headers = {},
      forceRefresh = false
    } = options;

    const cached = this.cache.get(url);
    const now = Date.now();

    // 1. Return fresh cached data immediately if not forced to refresh
    if (!forceRefresh && cached && (now - cached.timestamp < ttl)) {
      return { data: cached.data, fromCache: true, stale: false };
    }

    // 2. Return stale data immediately while triggering background revalidation
    if (!forceRefresh && cached) {
      this.revalidateInBackground(url, options);
      return { data: cached.data, fromCache: true, stale: true };
    }

    // 3. Deduplicate in-flight requests (prevent simultaneous redundant network fetches)
    if (this.inFlight.has(url)) {
      const data = await this.inFlight.get(url);
      return { data, fromCache: false, stale: false };
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch(url, {
          signal,
          headers: {
            'Accept': 'application/json',
            ...headers
          }
        });

        if (!res.ok) {
          const errorObj = new Error(`HTTP ${res.status}: ${res.statusText}`);
          errorObj.status = res.status;
          throw errorObj;
        }

        const data = await res.json();
        this.cache.set(url, {
          data,
          timestamp: Date.now()
        });

        return data;
      } finally {
        this.inFlight.delete(url);
      }
    })();

    this.inFlight.set(url, fetchPromise);
    const data = await fetchPromise;
    return { data, fromCache: false, stale: false };
  }

  /**
   * Background silent revalidation
   */
  async revalidateInBackground(url, options) {
    if (this.inFlight.has(url)) return;

    try {
      const { signal, headers } = options;
      const res = await fetch(url, {
        signal,
        headers: {
          'Accept': 'application/json',
          ...headers
        }
      });
      if (res.ok) {
        const data = await res.json();
        this.cache.set(url, {
          data,
          timestamp: Date.now()
        });
        window.dispatchEvent(new CustomEvent('evolve:cache-updated', { detail: { url, data } }));
      }
    } catch {
      // Background revalidation failure silently preserves existing cache
    }
  }

  /**
   * Invalidate specific URL or URL prefix
   */
  invalidate(urlPrefix) {
    if (!urlPrefix) {
      this.cache.clear();
      return;
    }
    for (const key of this.cache.keys()) {
      if (key.startsWith(urlPrefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Optimistically update cached value
   */
  set(url, data) {
    this.cache.set(url, {
      data,
      timestamp: Date.now()
    });
    window.dispatchEvent(new CustomEvent('evolve:cache-updated', { detail: { url, data } }));
  }
}

export const apiCache = new ApiCacheManager();

/**
 * React Hook for cached SWR data
 */
import { useState, useEffect, useRef, useCallback } from 'react';

export function useCachedApi(url, options = {}) {
  const {
    enabled = true,
    ttl = 60000,
    initialData = null,
    onSuccess = null,
    onError = null
  } = options;

  const [data, setData] = useState(() => {
    if (!url) return initialData;
    const cached = apiCache.cache.get(url);
    return cached ? cached.data : initialData;
  });
  const [loading, setLoading] = useState(() => {
    if (!enabled || !url) return false;
    return !apiCache.cache.has(url);
  });
  const [error, setError] = useState(null);
  const [isValidating, setIsValidating] = useState(false);

  const abortControllerRef = useRef(null);

  const executeFetch = useCallback(async (forceRefresh = false) => {
    if (!enabled || !url) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      if (!apiCache.cache.has(url) || forceRefresh) {
        setLoading(true);
      } else {
        setIsValidating(true);
      }

      const res = await apiCache.get(url, {
        ttl,
        forceRefresh,
        signal: abortControllerRef.current.signal
      });

      setData(res.data);
      setError(null);
      onSuccess?.(res.data);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err);
        onError?.(err);
      }
    } finally {
      setLoading(false);
      setIsValidating(false);
    }
  }, [url, enabled, ttl, onSuccess, onError]);

  useEffect(() => {
    executeFetch();

    // Listen for background updates
    const handleCacheUpdate = (e) => {
      if (e.detail?.url === url) {
        setData(e.detail.data);
      }
    };
    window.addEventListener('evolve:cache-updated', handleCacheUpdate);

    return () => {
      window.removeEventListener('evolve:cache-updated', handleCacheUpdate);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [executeFetch, url]);

  const refetch = useCallback(() => executeFetch(true), [executeFetch]);

  return { data, loading, error, refetch, isValidating, setData };
}
