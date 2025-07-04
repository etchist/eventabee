import { v4 as uuidv4 } from 'uuid';
import { BaseEvent, ShopifyEvent } from './types';

export class EventBuilder {
  private event: Partial<BaseEvent>;

  constructor() {
    this.event = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
  }

  setUserId(userId: string): this {
    this.event.userId = userId;
    return this;
  }

  setAnonymousId(anonymousId: string): this {
    this.event.anonymousId = anonymousId;
    return this;
  }

  setSessionId(sessionId: string): this {
    this.event.sessionId = sessionId;
    return this;
  }

  setProperties(properties: Record<string, any>): this {
    this.event.properties = { ...this.event.properties, ...properties };
    return this;
  }

  setContext(context: BaseEvent['context']): this {
    this.event.context = { ...this.event.context, ...context };
    return this;
  }

  build(): BaseEvent {
    return this.event as BaseEvent;
  }
}

export class ShopifyEventBuilder extends EventBuilder {
  private shopifyEvent: Partial<ShopifyEvent>;

  constructor(eventType: ShopifyEvent['eventType'], shopDomain: string) {
    super();
    this.shopifyEvent = {
      source: 'shopify',
      eventType,
      shopDomain,
    };
  }

  setCustomerId(customerId: string): this {
    this.shopifyEvent.customerId = customerId;
    return this;
  }

  setOrderId(orderId: string): this {
    this.shopifyEvent.orderId = orderId;
    return this;
  }

  setProductId(productId: string): this {
    this.shopifyEvent.productId = productId;
    return this;
  }

  setVariantId(variantId: string): this {
    this.shopifyEvent.variantId = variantId;
    return this;
  }

  build(): ShopifyEvent {
    const baseEvent = super.build();
    return { ...baseEvent, ...this.shopifyEvent } as ShopifyEvent;
  }
}

export const createEvent = (
  eventType: ShopifyEvent['eventType'],
  shopDomain: string
): ShopifyEventBuilder => {
  return new ShopifyEventBuilder(eventType, shopDomain);
};