import { QueryClient, QueryFunction } from '@tanstack/react-query';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Add authentication headers to requests
function addAuthHeaders(url: string, options?: RequestInit): RequestInit {
  const headers = options?.headers || {};

  // Default options
  const requestOptions: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      ...headers,
    },
  };

  // Add API key for agent routes
  if (url.startsWith('/api/agents')) {
    requestOptions.headers = {
      ...requestOptions.headers,
      'X-API-Key': 'dev-api-key-mcp',
    };
  }

  return requestOptions;
}

/**
 * Type for extended request options that include data
 */
export interface ExtendedRequestInit extends RequestInit {
  data?: any;
}

/**
 * Makes an API request and returns the response object without parsing
 * Use this for more control over response handling
 */
export async function apiRequest(url: string, options?: ExtendedRequestInit): Promise<Response> {
  let requestOptions = { ...options };

  // Handle data property by converting it to JSON and setting the appropriate headers
  if (options?.data) {
    requestOptions = {
      ...requestOptions,
      body: JSON.stringify(options.data),
      headers: {
        ...requestOptions.headers,
        'Content-Type': 'application/json',
      },
    };

    // Remove data property as it's not a standard RequestInit property
    delete requestOptions.data;
  }

  const authRequestOptions = addAuthHeaders(url, requestOptions);
  const res = await fetch(url, authRequestOptions);
  return res;
}

/**
 * Makes an API request and automatically parses JSON response
 */
export async function apiJsonRequest<T = any>(
  url: string,
  options?: ExtendedRequestInit
): Promise<T> {
  const res = await apiRequest(url, options);
  await throwIfResNotOk(res);
  return (await res.json()) as T;
}

type UnauthorizedBehavior = 'returnNull' | 'throw';
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const url = queryKey[0] as string;
      const requestOptions = addAuthHeaders(url);
      const res = await fetch(url, requestOptions);

      if (unauthorizedBehavior === 'returnNull' && res.status === 401) {
        return null;
      }

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API error: ${res.status} ${res.statusText} - ${errorText}`);
        throw new Error(`${res.status}: ${errorText || res.statusText}`);
      }

      return await res.json();
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
