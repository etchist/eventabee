import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createQueryKey, mutationKeys } from '../lib/react-query/queries';

export interface AppConfig {
  segment: {
    enabled: boolean;
    writeKey: string;
  };
  facebook: {
    enabled: boolean;
    accessToken: string;
    pixelId: string;
  };
  browserless: {
    enabled: boolean;
    token: string;
    url: string;
  };
}

// Fetch config
const fetchConfig = async (): Promise<AppConfig> => {
  const response = await fetch('/api/config');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.statusText}`);
  }
  
  return response.json();
};

// Update config
const updateConfig = async (newConfig: AppConfig): Promise<AppConfig> => {
  const response = await fetch('/api/config', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newConfig),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update configuration: ${error || response.statusText}`);
  }

  return response.json();
};

export function useConfig() {
  const queryClient = useQueryClient();

  // Query for fetching config
  const configQuery = useQuery({
    queryKey: createQueryKey.config(),
    queryFn: fetchConfig,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch on reconnect
  });

  // Mutation for updating config
  const updateMutation = useMutation({
    mutationKey: mutationKeys.updateConfig,
    mutationFn: updateConfig,
    onMutate: async (newConfig) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: createQueryKey.config() });

      // Snapshot the previous value
      const previousConfig = queryClient.getQueryData<AppConfig>(createQueryKey.config());

      // Optimistically update to the new value
      queryClient.setQueryData(createQueryKey.config(), newConfig);

      // Return a context object with the snapshotted value
      return { previousConfig };
    },
    onError: (err, newConfig, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousConfig) {
        queryClient.setQueryData(createQueryKey.config(), context.previousConfig);
      }
    },
    onSuccess: (data) => {
      // Update the cache with the server response
      queryClient.setQueryData(createQueryKey.config(), data);
      
      // Invalidate connection status as config changes might affect connections
      queryClient.invalidateQueries({ queryKey: createQueryKey.connectionStatus() });
    },
  });

  return {
    config: configQuery.data,
    isLoading: configQuery.isLoading,
    isError: configQuery.isError,
    error: configQuery.error,
    refetch: configQuery.refetch,
    updateConfig: updateMutation.mutate,
    updateConfigAsync: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
  };
}