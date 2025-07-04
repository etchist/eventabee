import { ShopifyToSegmentMapper, ShopifyToFacebookMapper, mappers } from './mappers';
import { ShopifyEvent, SegmentEvent } from './types';

describe('ShopifyToSegmentMapper', () => {
  let mapper: ShopifyToSegmentMapper;
  let baseShopifyEvent: ShopifyEvent;

  beforeEach(() => {
    mapper = new ShopifyToSegmentMapper();
    baseShopifyEvent = {
      id: 'event-123',
      timestamp: '2023-12-01T10:00:00.000Z',
      source: 'shopify',
      eventType: 'product_view',
      shopDomain: 'test-shop.myshopify.com',
      userId: 'user-123',
      anonymousId: 'anon-456',
      sessionId: 'session-789',
      customerId: 'cust-123',
      orderId: 'order-456',
      productId: 'prod-789',
      variantId: 'var-101',
      properties: {
        price: 29.99,
        currency: 'USD',
      },
      context: {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        page: {
          url: 'https://example.com/product',
          title: 'Product Page',
        },
      },
    };
  });

  describe('transform', () => {
    it('should map product_view event correctly', () => {
      const result = mapper.transform(baseShopifyEvent);

      expect(result).toEqual({
        type: 'track',
        event: 'Product Viewed',
        userId: 'user-123',
        anonymousId: 'anon-456',
        timestamp: '2023-12-01T10:00:00.000Z',
        properties: {
          price: 29.99,
          currency: 'USD',
          shopDomain: 'test-shop.myshopify.com',
          customerId: 'cust-123',
          orderId: 'order-456',
          productId: 'prod-789',
          variantId: 'var-101',
        },
        context: {
          userAgent: 'Mozilla/5.0',
          ip: '192.168.1.1',
          page: {
            url: 'https://example.com/product',
            title: 'Product Page',
          },
        },
      });
    });

    it('should map page_view event to page type', () => {
      const pageEvent: ShopifyEvent = {
        ...baseShopifyEvent,
        eventType: 'page_view',
      };

      const result = mapper.transform(pageEvent);

      expect(result.type).toBe('page');
      expect(result.event).toBeUndefined();
    });

    it('should map customer_created event to identify type', () => {
      const customerEvent: ShopifyEvent = {
        ...baseShopifyEvent,
        eventType: 'customer_created',
      };

      const result = mapper.transform(customerEvent);

      expect(result.type).toBe('identify');
      expect(result.event).toBeUndefined();
    });

    it('should map add_to_cart event correctly', () => {
      const cartEvent: ShopifyEvent = {
        ...baseShopifyEvent,
        eventType: 'add_to_cart',
      };

      const result = mapper.transform(cartEvent);

      expect(result).toMatchObject({
        type: 'track',
        event: 'Product Added',
      });
    });

    it('should map checkout_completed event correctly', () => {
      const checkoutEvent: ShopifyEvent = {
        ...baseShopifyEvent,
        eventType: 'checkout_completed',
      };

      const result = mapper.transform(checkoutEvent);

      expect(result).toMatchObject({
        type: 'track',
        event: 'Order Completed',
      });
    });

    it('should handle events without optional fields', () => {
      const minimalEvent: ShopifyEvent = {
        id: 'event-minimal',
        timestamp: '2023-12-01T10:00:00.000Z',
        source: 'shopify',
        eventType: 'search',
        shopDomain: 'minimal-shop.myshopify.com',
      };

      const result = mapper.transform(minimalEvent);

      expect(result).toEqual({
        type: 'track',
        event: 'Products Searched',
        userId: undefined,
        anonymousId: undefined,
        timestamp: '2023-12-01T10:00:00.000Z',
        properties: {
          shopDomain: 'minimal-shop.myshopify.com',
          customerId: undefined,
          orderId: undefined,
          productId: undefined,
          variantId: undefined,
        },
        context: undefined,
      });
    });

    it('should preserve all properties from the original event', () => {
      const eventWithExtraProps: ShopifyEvent = {
        ...baseShopifyEvent,
        properties: {
          price: 29.99,
          currency: 'USD',
          customField1: 'value1',
          customField2: 123,
          nestedObject: {
            key: 'value',
          },
        },
      };

      const result = mapper.transform(eventWithExtraProps);

      expect(result.properties).toEqual({
        price: 29.99,
        currency: 'USD',
        customField1: 'value1',
        customField2: 123,
        nestedObject: {
          key: 'value',
        },
        shopDomain: 'test-shop.myshopify.com',
        customerId: 'cust-123',
        orderId: 'order-456',
        productId: 'prod-789',
        variantId: 'var-101',
      });
    });
  });

  describe('eventTypeMapping', () => {
    const testCases: Array<[ShopifyEvent['eventType'], string, SegmentEvent['type']]> = [
      ['page_view', 'page', 'page'],
      ['product_view', 'Product Viewed', 'track'],
      ['collection_view', 'Product List Viewed', 'track'],
      ['search', 'Products Searched', 'track'],
      ['add_to_cart', 'Product Added', 'track'],
      ['remove_from_cart', 'Product Removed', 'track'],
      ['view_cart', 'Cart Viewed', 'track'],
      ['checkout_started', 'Checkout Started', 'track'],
      ['checkout_completed', 'Order Completed', 'track'],
      ['payment_info_submitted', 'Payment Info Entered', 'track'],
      ['order_placed', 'Order Completed', 'track'],
      ['order_updated', 'Order Updated', 'track'],
      ['order_cancelled', 'Order Cancelled', 'track'],
      ['customer_created', 'identify', 'identify'],
      ['customer_updated', 'identify', 'identify'],
      ['product_created', 'Product Created', 'track'],
      ['product_updated', 'Product Updated', 'track'],
      ['inventory_updated', 'Inventory Updated', 'track'],
    ];

    test.each(testCases)(
      'should map %s to %s event with type %s',
      (eventType, expectedEvent, expectedType) => {
        const event: ShopifyEvent = {
          ...baseShopifyEvent,
          eventType,
        };

        const result = mapper.transform(event);

        expect(result.type).toBe(expectedType);
        if (expectedType === 'track') {
          expect(result.event).toBe(expectedEvent);
        }
      }
    );
  });
});

describe('ShopifyToFacebookMapper', () => {
  let mapper: ShopifyToFacebookMapper;
  let baseShopifyEvent: ShopifyEvent;

  beforeEach(() => {
    mapper = new ShopifyToFacebookMapper();
    baseShopifyEvent = {
      id: 'event-123',
      timestamp: '2023-12-01T10:00:00.000Z',
      source: 'shopify',
      eventType: 'product_view',
      shopDomain: 'test-shop.myshopify.com',
      userId: 'user-123',
      customerId: 'cust-123',
      orderId: 'order-456',
      productId: 'prod-789',
      variantId: 'var-101',
      properties: {
        price: 29.99,
        currency: 'USD',
      },
      context: {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        page: {
          url: 'https://example.com/product',
          title: 'Product Page',
        },
      },
    };
  });

  describe('transform', () => {
    it('should map product_view event correctly', () => {
      const result = mapper.transform(baseShopifyEvent);

      expect(result).toEqual({
        event_name: 'ViewContent',
        event_time: 1701424800,
        action_source: 'website',
        user_data: {
          client_ip_address: '192.168.1.1',
          client_user_agent: 'Mozilla/5.0',
        },
        custom_data: {
          price: 29.99,
          currency: 'USD',
          shop_domain: 'test-shop.myshopify.com',
          customer_id: 'cust-123',
          order_id: 'order-456',
          product_id: 'prod-789',
          variant_id: 'var-101',
        },
        event_source_url: 'https://example.com/product',
        event_id: 'event-123',
      });
    });

    it('should calculate event_time correctly', () => {
      const event: ShopifyEvent = {
        ...baseShopifyEvent,
        timestamp: '2023-06-15T14:30:00.000Z',
      };

      const result = mapper.transform(event);

      expect(result.event_time).toBe(1686839400);
    });

    it('should map checkout_completed to Purchase event', () => {
      const checkoutEvent: ShopifyEvent = {
        ...baseShopifyEvent,
        eventType: 'checkout_completed',
      };

      const result = mapper.transform(checkoutEvent);

      expect(result.event_name).toBe('Purchase');
    });

    it('should map search to Search event', () => {
      const searchEvent: ShopifyEvent = {
        ...baseShopifyEvent,
        eventType: 'search',
      };

      const result = mapper.transform(searchEvent);

      expect(result.event_name).toBe('Search');
    });

    it('should handle events without context', () => {
      const eventWithoutContext: ShopifyEvent = {
        ...baseShopifyEvent,
        context: undefined,
      };

      const result = mapper.transform(eventWithoutContext);

      expect(result.user_data).toEqual({
        client_ip_address: undefined,
        client_user_agent: undefined,
      });
      expect(result.event_source_url).toBeUndefined();
    });

    it('should handle events without optional fields', () => {
      const minimalEvent: ShopifyEvent = {
        id: 'minimal-event',
        timestamp: '2023-12-01T10:00:00.000Z',
        source: 'shopify',
        eventType: 'page_view',
        shopDomain: 'minimal-shop.myshopify.com',
      };

      const result = mapper.transform(minimalEvent);

      expect(result).toEqual({
        event_name: 'PageView',
        event_time: 1701424800,
        action_source: 'website',
        user_data: {
          client_ip_address: undefined,
          client_user_agent: undefined,
        },
        custom_data: {
          shop_domain: 'minimal-shop.myshopify.com',
          customer_id: undefined,
          order_id: undefined,
          product_id: undefined,
          variant_id: undefined,
        },
        event_source_url: undefined,
        event_id: 'minimal-event',
      });
    });

    it('should preserve all custom properties', () => {
      const eventWithExtraProps: ShopifyEvent = {
        ...baseShopifyEvent,
        properties: {
          price: 29.99,
          currency: 'USD',
          customField1: 'value1',
          customField2: 123,
          nestedObject: {
            key: 'value',
          },
        },
      };

      const result = mapper.transform(eventWithExtraProps);

      expect(result.custom_data).toEqual({
        price: 29.99,
        currency: 'USD',
        customField1: 'value1',
        customField2: 123,
        nestedObject: {
          key: 'value',
        },
        shop_domain: 'test-shop.myshopify.com',
        customer_id: 'cust-123',
        order_id: 'order-456',
        product_id: 'prod-789',
        variant_id: 'var-101',
      });
    });
  });

  describe('eventTypeMapping', () => {
    const testCases: Array<[ShopifyEvent['eventType'], string]> = [
      ['page_view', 'PageView'],
      ['product_view', 'ViewContent'],
      ['collection_view', 'ViewContent'],
      ['search', 'Search'],
      ['add_to_cart', 'AddToCart'],
      ['remove_from_cart', 'AddToCart'],
      ['view_cart', 'ViewContent'],
      ['checkout_started', 'InitiateCheckout'],
      ['checkout_completed', 'Purchase'],
      ['payment_info_submitted', 'AddPaymentInfo'],
      ['order_placed', 'Purchase'],
      ['order_updated', 'Purchase'],
      ['order_cancelled', 'Purchase'],
      ['customer_created', 'CompleteRegistration'],
      ['customer_updated', 'Lead'],
      ['product_created', 'Lead'],
      ['product_updated', 'Lead'],
      ['inventory_updated', 'Lead'],
    ];

    test.each(testCases)(
      'should map %s to %s Facebook event',
      (eventType, expectedFacebookEvent) => {
        const event: ShopifyEvent = {
          ...baseShopifyEvent,
          eventType,
        };

        const result = mapper.transform(event);

        expect(result.event_name).toBe(expectedFacebookEvent);
      }
    );
  });
});

describe('mappers', () => {
  it('should export shopifyToSegment mapper instance', () => {
    expect(mappers.shopifyToSegment).toBeInstanceOf(ShopifyToSegmentMapper);
  });

  it('should export shopifyToFacebook mapper instance', () => {
    expect(mappers.shopifyToFacebook).toBeInstanceOf(ShopifyToFacebookMapper);
  });

  it('should export working mapper instances', () => {
    const shopifyEvent: ShopifyEvent = {
      id: 'test-event',
      timestamp: '2023-12-01T10:00:00.000Z',
      source: 'shopify',
      eventType: 'product_view',
      shopDomain: 'test.myshopify.com',
    };

    const segmentResult = mappers.shopifyToSegment.transform(shopifyEvent);
    expect(segmentResult.type).toBe('track');
    expect(segmentResult.event).toBe('Product Viewed');

    const facebookResult = mappers.shopifyToFacebook.transform(shopifyEvent);
    expect(facebookResult.event_name).toBe('ViewContent');
  });
});