export const queryKeys = {
  config: ['config'] as const,
  eventStats: ['eventStats'] as const,
  connectionStatus: ['connectionStatus'] as const,
  billingStatus: ['billingStatus'] as const,
} as const;

// Helper function to create query keys with parameters
export const createQueryKey = {
  config: () => queryKeys.config,
  eventStats: () => queryKeys.eventStats,
  connectionStatus: () => queryKeys.connectionStatus,
  billingStatus: () => queryKeys.billingStatus,
  // For future use with specific IDs or filters
  eventStatsByType: (type: string) => [...queryKeys.eventStats, { type }] as const,
  connectionStatusByService: (service: string) => [...queryKeys.connectionStatus, { service }] as const,
};

// Mutation keys
export const mutationKeys = {
  updateConfig: ['updateConfig'] as const,
  testConnection: ['testConnection'] as const,
  createBilling: ['createBilling'] as const,
} as const;