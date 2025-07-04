import { ShopifyEvent, SegmentEvent, FacebookEvent } from './types';

export const SHOPIFY_WEBHOOK_EVENTS = [
  'orders/create',
  'orders/updated',
  'orders/paid',
  'orders/cancelled',
  'orders/fulfilled',
  'orders/partially_fulfilled',
  'customers/create',
  'customers/update',
  'customers/delete',
  'products/create',
  'products/update',
  'products/delete',
  'inventory_levels/update',
  'carts/create',
  'carts/update',
  'checkouts/create',
  'checkouts/update',
  'checkouts/delete',
] as const;

export type ShopifyWebhookEvent = typeof SHOPIFY_WEBHOOK_EVENTS[number];

export const FACEBOOK_STANDARD_EVENTS = [
  'PageView',
  'ViewContent',
  'Search',
  'AddToCart',
  'AddToWishlist',
  'InitiateCheckout',
  'AddPaymentInfo',
  'Purchase',
  'Lead',
  'CompleteRegistration',
] as const;

export type FacebookStandardEvent = typeof FACEBOOK_STANDARD_EVENTS[number];

export const SEGMENT_EVENT_TYPES = ['track', 'identify', 'page', 'group'] as const;

export type SegmentEventType = typeof SEGMENT_EVENT_TYPES[number];

export const createShopifyEvent = (
  eventType: ShopifyEvent['eventType'],
  shopDomain: string,
  properties: Record<string, unknown> = {},
  context?: ShopifyEvent['context']
): Omit<ShopifyEvent, 'id' | 'timestamp'> => ({
  source: 'shopify',
  eventType,
  shopDomain,
  properties,
  context,
});

export const createSegmentEvent = (
  type: SegmentEvent['type'],
  data: Partial<SegmentEvent>
): SegmentEvent => ({
  type,
  timestamp: new Date().toISOString(),
  ...data,
});

export const createFacebookEvent = (
  event_name: string,
  user_data: FacebookEvent['user_data'],
  custom_data?: Record<string, unknown>
): Omit<FacebookEvent, 'event_time'> => ({
  event_name,
  user_data,
  custom_data,
  action_source: 'website',
});