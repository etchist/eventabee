import { useQuery } from '@tanstack/react-query';
import { createQueryKey } from '../lib/react-query/queries';

export interface EventStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventsByType: Record<string, number>;
  destinationStats: Record<string, { sent: number; failed: number }>;
}

// Fetch event stats
const fetchEventStats = async (): Promise<EventStats> => {
  const response = await fetch('/api/events/stats');
  
  if (!response.ok) {
    throw new Error(`Failed to fetch event stats: ${response.statusText}`);
  }
  
  return response.json();
};

export function useEventStats() {
  const statsQuery = useQuery({
    queryKey: createQueryKey.eventStats(),
    queryFn: fetchEventStats,
    staleTime: 1 * 60 * 1000, // Consider fresh for 1 minute
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 30 * 1000, // Refetch every 30 seconds for real-time updates
    refetchIntervalInBackground: true, // Continue refetching in background
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    isError: statsQuery.isError,
    error: statsQuery.error,
    refetch: statsQuery.refetch,
    isFetching: statsQuery.isFetching,
    dataUpdatedAt: statsQuery.dataUpdatedAt,
  };
}

// Hook for specific event type stats (example of how to extend)
export function useEventStatsByType(eventType: string) {
  const statsQuery = useQuery({
    queryKey: createQueryKey.eventStatsByType(eventType),
    queryFn: async () => {
      const response = await fetch(`/api/events/stats/${eventType}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch stats for ${eventType}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!eventType, // Only run query if eventType is provided
    staleTime: 2 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return {
    stats: statsQuery.data,
    isLoading: statsQuery.isLoading,
    isError: statsQuery.isError,
    error: statsQuery.error,
    refetch: statsQuery.refetch,
  };
}