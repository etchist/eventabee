import {
  ShopifyEvent,
  SegmentEvent,
  FacebookEvent,
  EventTransformer,
  ShopifyEventType,
} from './types';
import { FacebookStandardEvent } from './schemas';

export class ShopifyToSegmentMapper implements EventTransformer<ShopifyEvent, SegmentEvent> {
  private eventTypeMapping: Record<ShopifyEventType, { type: SegmentEvent['type']; event?: string }> = {
    page_view: { type: 'page' },
    product_view: { type: 'track', event: 'Product Viewed' },
    collection_view: { type: 'track', event: 'Product List Viewed' },
    search: { type: 'track', event: 'Products Searched' },
    add_to_cart: { type: 'track', event: 'Product Added' },
    remove_from_cart: { type: 'track', event: 'Product Removed' },
    view_cart: { type: 'track', event: 'Cart Viewed' },
    checkout_started: { type: 'track', event: 'Checkout Started' },
    checkout_completed: { type: 'track', event: 'Order Completed' },
    payment_info_submitted: { type: 'track', event: 'Payment Info Entered' },
    order_placed: { type: 'track', event: 'Order Completed' },
    order_updated: { type: 'track', event: 'Order Updated' },
    order_cancelled: { type: 'track', event: 'Order Cancelled' },
    customer_created: { type: 'identify' },
    customer_updated: { type: 'identify' },
    product_created: { type: 'track', event: 'Product Created' },
    product_updated: { type: 'track', event: 'Product Updated' },
    inventory_updated: { type: 'track', event: 'Inventory Updated' },
  };

  transform(shopifyEvent: ShopifyEvent): SegmentEvent {
    const mapping = this.eventTypeMapping[shopifyEvent.eventType];
    
    return {
      type: mapping.type,
      event: mapping.event,
      userId: shopifyEvent.userId,
      anonymousId: shopifyEvent.anonymousId,
      timestamp: shopifyEvent.timestamp,
      properties: {
        ...shopifyEvent.properties,
        shopDomain: shopifyEvent.shopDomain,
        customerId: shopifyEvent.customerId,
        orderId: shopifyEvent.orderId,
        productId: shopifyEvent.productId,
        variantId: shopifyEvent.variantId,
      },
      context: shopifyEvent.context,
    };
  }
}

export class ShopifyToFacebookMapper implements EventTransformer<ShopifyEvent, FacebookEvent> {
  private eventTypeMapping: Record<ShopifyEventType, FacebookStandardEvent | string> = {
    page_view: 'PageView',
    product_view: 'ViewContent',
    collection_view: 'ViewContent',
    search: 'Search',
    add_to_cart: 'AddToCart',
    remove_from_cart: 'AddToCart',
    view_cart: 'ViewContent',
    checkout_started: 'InitiateCheckout',
    checkout_completed: 'Purchase',
    payment_info_submitted: 'AddPaymentInfo',
    order_placed: 'Purchase',
    order_updated: 'Purchase',
    order_cancelled: 'Purchase',
    customer_created: 'CompleteRegistration',
    customer_updated: 'Lead',
    product_created: 'Lead',
    product_updated: 'Lead',
    inventory_updated: 'Lead',
  };

  transform(shopifyEvent: ShopifyEvent): FacebookEvent {
    const eventName = this.eventTypeMapping[shopifyEvent.eventType];
    
    return {
      event_name: eventName,
      event_time: Math.floor(new Date(shopifyEvent.timestamp).getTime() / 1000),
      action_source: 'website',
      user_data: {
        client_ip_address: shopifyEvent.context?.ip,
        client_user_agent: shopifyEvent.context?.userAgent,
      },
      custom_data: {
        ...shopifyEvent.properties,
        shop_domain: shopifyEvent.shopDomain,
        customer_id: shopifyEvent.customerId,
        order_id: shopifyEvent.orderId,
        product_id: shopifyEvent.productId,
        variant_id: shopifyEvent.variantId,
      },
      event_source_url: shopifyEvent.context?.page?.url,
      event_id: shopifyEvent.id,
    };
  }
}

export const mappers = {
  shopifyToSegment: new ShopifyToSegmentMapper(),
  shopifyToFacebook: new ShopifyToFacebookMapper(),
};