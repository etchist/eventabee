import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Consider data fresh for 5 minutes
      staleTime: 5 * 60 * 1000,
      // Cache time: Keep data in cache for 10 minutes
      gcTime: 10 * 60 * 1000,
      // Retry configuration
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error) {
          const statusCode = (error as { response?: { status?: number } })?.response?.status;
          if (statusCode && statusCode >= 400 && statusCode < 500) {
            return false;
          }
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Retry delay exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus
      refetchOnWindowFocus: false,
      // Network mode
      networkMode: 'online',
    },
    mutations: {
      // Retry configuration for mutations
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error) {
          const statusCode = (error as { response?: { status?: number } })?.response?.status;
          if (statusCode && statusCode >= 400 && statusCode < 500) {
            return false;
          }
        }
        // Retry up to 2 times for mutations
        return failureCount < 2;
      },
      // Retry delay
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Network mode
      networkMode: 'online',
    },
  },
});

// Error handler for global error logging
queryClient.setMutationDefaults(['*'], {
  mutationFn: async () => {
    throw new Error('No mutation function provided');
  },
  onError: (error: Error) => {
    console.error('Mutation error:', error);
    // You can add your global error handling here
    // For example: show a toast notification, log to an error service, etc.
  },
});

// Query error handler
queryClient.setQueryDefaults(['*'], {
  queryFn: async () => {
    throw new Error('No query function provided');
  },
  onError: (error: Error) => {
    console.error('Query error:', error);
    // You can add your global error handling here
  },
});