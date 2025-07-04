export interface BaseEvent {
  id: string;
  timestamp: string;
  sessionId?: string;
  userId?: string;
  anonymousId?: string;
  source: 'shopify' | 'custom';
  properties?: Record<string, unknown>;
  context?: EventContext;
}

export interface EventContext {
  userAgent?: string;
  ip?: string;
  page?: {
    url: string;
    title?: string;
    referrer?: string;
  };
  library?: {
    name: string;
    version: string;
  };
  [key: string]: unknown;
}

export interface ShopifyEvent extends BaseEvent {
  source: 'shopify';
  eventType: ShopifyEventType;
  shopDomain: string;
  customerId?: string;
  orderId?: string;
  productId?: string;
  variantId?: string;
}

export interface SegmentEvent {
  type: 'track' | 'identify' | 'page' | 'group';
  event?: string;
  userId?: string;
  anonymousId?: string;
  properties?: Record<string, unknown>;
  traits?: Record<string, unknown>;
  timestamp?: string;
  context?: Record<string, unknown>;
  integrations?: Record<string, unknown>;
}

export interface FacebookEvent {
  event_name: string;
  event_time: number;
  user_data: {
    em?: string[];
    ph?: string[];
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data?: Record<string, unknown>;
  event_source_url?: string;
  action_source: 'website' | 'app' | 'phone_call' | 'chat' | 'email' | 'other';
  event_id?: string;
}

export type ShopifyEventType =
  | 'page_view'
  | 'product_view'
  | 'collection_view'
  | 'search'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'checkout_started'
  | 'checkout_completed'
  | 'payment_info_submitted'
  | 'order_placed'
  | 'order_updated'
  | 'order_cancelled'
  | 'customer_created'
  | 'customer_updated'
  | 'product_created'
  | 'product_updated'
  | 'inventory_updated';

export interface EventTransformer<T extends BaseEvent, U> {
  transform(event: T): U;
}

export interface EventDestination {
  name: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  send(events: BaseEvent[]): Promise<void>;
}