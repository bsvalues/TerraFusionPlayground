import { QueryClient, QueryFunction } from "@tanstack/react-query";

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
    credentials: "include",
    headers: {
      ...headers,
    }
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

export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const requestOptions = addAuthHeaders(url, options);
  const res = await fetch(url, requestOptions);

  await throwIfResNotOk(res);
  return await res.json() as T;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey[0] as string;
    const requestOptions = addAuthHeaders(url);
    const res = await fetch(url, requestOptions);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
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
