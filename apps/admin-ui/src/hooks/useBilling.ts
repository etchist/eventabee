import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppBridge } from '@shopify/app-bridge-react';
import { Redirect } from '@shopify/app-bridge/actions';
import { createQueryKey, mutationKeys } from '../lib/react-query/queries';

export interface BillingStatus {
  hasActiveSubscription: boolean;
  currentPlan?: {
    id: string;
    name: string;
    price: number;
    interval: 'monthly' | 'yearly';
    features: string[];
  };
  usage?: {
    eventsProcessed: number;
    eventsLimit: number;
    billingCycleStart: string;
    billingCycleEnd: string;
  };
  nextBillingDate?: string;
  cancelledAt?: string;
}

export interface CreateBillingParams {
  plan: string;
  interval?: 'monthly' | 'yearly';
}

export interface CreateBillingResponse {
  confirmationUrl: string;
  success: boolean;
}

// Get session token helper
const getSessionToken = async (): Promise<string> => {
  // In a real implementation, this would get the actual session token from App Bridge
  // For now, returning a placeholder
  return 'session-token';
};

// Fetch billing status
const fetchBillingStatus = async (): Promise<BillingStatus> => {
  const response = await fetch('/api/billing/status', {
    headers: {
      'Authorization': `Bearer ${await getSessionToken()}`,
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch billing status: ${response.statusText}`);
  }
  
  return response.json();
};

// Create billing subscription
const createBillingSubscription = async (params: CreateBillingParams): Promise<CreateBillingResponse> => {
  const response = await fetch('/api/billing/create', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getSessionToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create billing subscription: ${error || response.statusText}`);
  }

  return response.json();
};

// Cancel billing subscription
const cancelBillingSubscription = async (): Promise<{ success: boolean }> => {
  const response = await fetch('/api/billing/cancel', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${await getSessionToken()}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to cancel billing subscription: ${error || response.statusText}`);
  }

  return response.json();
};

export function useBilling() {
  const app = useAppBridge();
  const queryClient = useQueryClient();

  // Query for fetching billing status
  const billingQuery = useQuery({
    queryKey: createQueryKey.billingStatus(),
    queryFn: fetchBillingStatus,
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    retry: (failureCount, error) => {
      // Don't retry on 401/403 errors
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('unauthorized') || message.includes('forbidden')) {
          return false;
        }
      }
      return failureCount < 3;
    },
  });

  // Mutation for creating billing subscription
  const createMutation = useMutation({
    mutationKey: mutationKeys.createBilling,
    mutationFn: createBillingSubscription,
    onSuccess: (data) => {
      if (data.confirmationUrl) {
        // Redirect to Shopify billing confirmation page
        const redirect = Redirect.create(app);
        redirect.dispatch(Redirect.Action.REMOTE, data.confirmationUrl);
      }
      
      // Invalidate billing status to refetch after subscription
      queryClient.invalidateQueries({ queryKey: createQueryKey.billingStatus() });
    },
  });

  // Mutation for cancelling billing subscription
  const cancelMutation = useMutation({
    mutationKey: ['cancelBilling'],
    mutationFn: cancelBillingSubscription,
    onSuccess: () => {
      // Invalidate billing status to refetch after cancellation
      queryClient.invalidateQueries({ queryKey: createQueryKey.billingStatus() });
    },
  });

  return {
    billingStatus: billingQuery.data,
    hasActiveSubscription: billingQuery.data?.hasActiveSubscription ?? false,
    currentPlan: billingQuery.data?.currentPlan,
    usage: billingQuery.data?.usage,
    isLoading: billingQuery.isLoading,
    isError: billingQuery.isError,
    error: billingQuery.error,
    refetch: billingQuery.refetch,
    
    // Create subscription
    createSubscription: createMutation.mutate,
    createSubscriptionAsync: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    
    // Cancel subscription
    cancelSubscription: cancelMutation.mutate,
    cancelSubscriptionAsync: cancelMutation.mutateAsync,
    isCancelling: cancelMutation.isPending,
    cancelError: cancelMutation.error,
  };
}

// Hook for checking if billing is required
export function useBillingRequired() {
  const { hasActiveSubscription, isLoading } = useBilling();
  
  return {
    billingRequired: !isLoading && !hasActiveSubscription,
    isCheckingBilling: isLoading,
  };
}