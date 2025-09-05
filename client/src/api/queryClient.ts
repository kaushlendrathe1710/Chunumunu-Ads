import { QueryClient, QueryFunction } from '@tanstack/react-query';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Get JWT token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('auth_token');
};

// Set JWT token in localStorage
export const setAuthToken = (token: string | null): void => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

// Cache for recent API requests to prevent duplicate calls in quick succession
const apiRequestCache = new Map<string, { timestamp: number; response: Promise<Response> }>();
const AUTH_REQUEST_CACHE_TTL = 2000; // 2 second cache for auth requests

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: {
    priority?: 'high' | 'low' | 'auto';
    bypassCache?: boolean;
    signal?: AbortSignal;
  }
): Promise<Response> {
  // Performance optimization: For critical auth requests, use high priority
  const isAuthRequest = url.includes('/api/auth/verify-otp') || url.includes('/api/auth/send-otp');
  const fetchPriority = options?.priority || (isAuthRequest ? 'high' : 'auto');

  // Cache key based on method, url and data
  const cacheKey = `${method}:${url}:${data ? JSON.stringify(data) : ''}`;

  // Check if this is a cacheable request and if we have it in cache
  const isCacheable = isAuthRequest && method === 'GET' && !options?.bypassCache;
  const cachedRequest = apiRequestCache.get(cacheKey);

  if (
    isCacheable &&
    cachedRequest &&
    Date.now() - cachedRequest.timestamp < AUTH_REQUEST_CACHE_TTL
  ) {
    return cachedRequest.response;
  }

  // Create headers with Authorization if token exists
  const headers: Record<string, string> = {};

  // Only set Content-Type for JSON data, not for FormData
  if (data && !(data instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Add priority hint for performance
  if (fetchPriority) {
    headers['Priority'] = fetchPriority;
  }

  // Create the fetch promise
  const fetchPromise = (async () => {
    const res = await fetch(url, {
      method,
      headers,
      body: data instanceof FormData ? data : data ? JSON.stringify(data) : undefined,
      credentials: 'include', // Still include cookies for session fallback
      priority: fetchPriority as any, // TypeScript might not know this property yet
      signal: options?.signal, // Support for AbortSignal
    });

    // Handle token expiration - if we get a 401 and it's not an auth endpoint
    if (
      res.status === 401 &&
      !url.includes('/api/auth/login') &&
      !url.includes('/api/auth/verify-otp') &&
      !url.includes('/api/auth/send-otp')
    ) {
      // Only notify about token expiration but don't remove the token
      if (token) {
        console.warn('Authentication token expired or invalid, attempting to refresh');
        // We'll let the auth context manage the token validity
      }
    }

    // Only throw for non-401 errors or if we're in an auth flow
    if (
      res.status !== 401 ||
      url.includes('/api/auth/login') ||
      url.includes('/api/auth/verify-otp') ||
      url.includes('/api/auth/send-otp')
    ) {
      await throwIfResNotOk(res);
    }

    return res;
  })();

  // Store in cache if cacheable
  if (isCacheable) {
    apiRequestCache.set(cacheKey, {
      timestamp: Date.now(),
      response: fetchPromise,
    });
  }

  return fetchPromise;
}

// Cache for query responses to improve render performance
const queryCache = new Map<string, { timestamp: number; data: any }>();
const QUERY_CACHE_TTL = 5000; // 5 second cache for read queries

type UnauthorizedBehavior = 'returnNull' | 'throw';

// Define a function that returns a QueryFunction
export const getQueryFn = <T = unknown>(options: {
  on401: UnauthorizedBehavior;
  cacheTTL?: number; // Allow custom cache durations
}): QueryFunction<T | null> => {
  const { on401: unauthorizedBehavior, cacheTTL } = options;

  return async ({ queryKey, signal }) => {
    const url = queryKey[0] as string;
    const cacheTime = cacheTTL ?? QUERY_CACHE_TTL;
    const cacheKey = Array.isArray(queryKey) ? queryKey.join(':') : url;

    // Check cache for performance critical paths
    const isAuthQuery = url.includes('/api/auth/me');
    const cachedQuery = queryCache.get(cacheKey);

    // Use cached response if available and fresh (for auth endpoints)
    if (isAuthQuery && cachedQuery && Date.now() - cachedQuery.timestamp < cacheTime) {
      return cachedQuery.data;
    }

    // For other queries or if cache is stale, make a fresh request
    try {
      // Use our optimized apiRequest function instead of raw fetch
      const res = await apiRequest('GET', url, undefined, {
        priority: isAuthQuery ? 'high' : 'auto',
        signal,
      });

      // Handle token expiration - if we get a 401 and it's not an auth endpoint
      if (res.status === 401 && !url.includes('/api/auth/')) {
        console.warn('Authentication issue in query');

        // Try to handle session recovery instead of immediately failing
        if (unauthorizedBehavior === 'returnNull') {
          // Don't clear token here - let the auth context handle it if needed
          return null;
        }
      }

      // Parse the JSON response
      const data = (await res.json()) as T;

      // Cache the successful result for auth queries
      if (isAuthQuery) {
        queryCache.set(cacheKey, {
          timestamp: Date.now(),
          data,
        });
      }

      return data;
    } catch (error) {
      // Handle AbortError gracefully - these are expected when queries are cancelled
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Query was cancelled:', url);
        throw error; // Re-throw AbortError for React Query to handle
      }

      // Network errors should not immediately clear auth state
      console.error('Network or API error:', error);

      if (unauthorizedBehavior === 'returnNull') {
        return null;
      }
      throw error;
    }
  };
};

// Create and export the query client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw', cacheTTL: 5000 }), // 5 seconds cache
      refetchInterval: false,
      refetchOnWindowFocus: false, // Disable auto-refetch for faster experience
      staleTime: 300000, // 5 minutes - more reasonable staleTime
      retry: 1, // Reduced retry count for faster experience
      retryDelay: (attemptIndex) => Math.min(500 * 2 ** attemptIndex, 5000), // Faster exponential backoff
    },
    mutations: {
      retry: 1, // Also retry mutations once
    },
  },
});
