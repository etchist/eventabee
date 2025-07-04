import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createQueryKey, mutationKeys } from '../lib/react-query/queries';

export interface ConnectionStatus {
  segment: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
  facebook: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
  browserless: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
}

export interface TestConnectionResult {
  success: boolean;
  message?: string;
  error?: string;
  timestamp: string;
}

// Fetch connection status
const fetchConnectionStatus = async (): Promise<ConnectionStatus> => {
  const response = await fetch('/api/connections/status');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch connection status: ${response.statusText}`);
  }
  
  return response.json();
};

// Test a specific connection
const testConnection = async (service: string): Promise<TestConnectionResult> => {
  const response = await fetch(`/api/connections/test/${service}`, {
    method: 'POST',
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to test ${service} connection: ${error || response.statusText}`);
  }

  return response.json();
};

export function useConnections() {
  const queryClient = useQueryClient();

  // Query for fetching connection status
  const statusQuery = useQuery({
    queryKey: createQueryKey.connectionStatus(),
    queryFn: fetchConnectionStatus,
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchIntervalInBackground: false, // Don't refetch in background to reduce load
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Mutation for testing connections
  const testMutation = useMutation({
    mutationKey: mutationKeys.testConnection,
    mutationFn: testConnection,
    onMutate: async (service) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: createQueryKey.connectionStatus() });

      // Snapshot the previous value
      const previousStatus = queryClient.getQueryData<ConnectionStatus>(createQueryKey.connectionStatus());

      // Optimistically update the testing state (optional)
      if (previousStatus) {
        const updatedStatus = {
          ...previousStatus,
          [service]: {
            ...previousStatus[service as keyof ConnectionStatus],
            testing: true,
          },
        };
        queryClient.setQueryData(createQueryKey.connectionStatus(), updatedStatus);
      }

      return { previousStatus, service };
    },
    onError: (err, service, context) => {
      // Roll back to previous state on error
      if (context?.previousStatus) {
        queryClient.setQueryData(createQueryKey.connectionStatus(), context.previousStatus);
      }
    },
    onSuccess: (data, service) => {
      // Invalidate and refetch connection status after successful test
      queryClient.invalidateQueries({ queryKey: createQueryKey.connectionStatus() });
      
      // Optionally update the cache with test results
      const currentStatus = queryClient.getQueryData<ConnectionStatus>(createQueryKey.connectionStatus());
      if (currentStatus) {
        const updatedStatus = {
          ...currentStatus,
          [service]: {
            ...currentStatus[service as keyof ConnectionStatus],
            connected: data.success,
            lastSync: data.success ? new Date().toISOString() : currentStatus[service as keyof ConnectionStatus].lastSync,
            error: data.error,
          },
        };
        queryClient.setQueryData(createQueryKey.connectionStatus(), updatedStatus);
      }
    },
  });

  return {
    connectionStatus: statusQuery.data,
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,
    refetch: statusQuery.refetch,
    testConnection: testMutation.mutate,
    testConnectionAsync: testMutation.mutateAsync,
    isTesting: testMutation.isPending,
    testError: testMutation.error,
    lastTestResult: testMutation.data,
  };
}

// Hook for individual service connection status
export function useConnectionStatus(service: 'segment' | 'facebook' | 'browserless') {
  const { connectionStatus, ...rest } = useConnections();
  
  return {
    status: connectionStatus?.[service],
    connectionStatus,
    ...rest,
  };
}