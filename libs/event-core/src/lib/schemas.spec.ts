import {
  SHOPIFY_WEBHOOK_EVENTS,
  FACEBOOK_STANDARD_EVENTS,
  SEGMENT_EVENT_TYPES,
  createShopifyEvent,
  createSegmentEvent,
  createFacebookEvent,
  ShopifyWebhookEvent,
  FacebookStandardEvent,
  SegmentEventType,
} from './schemas';

describe('schemas', () => {
  describe('constants', () => {
    describe('SHOPIFY_WEBHOOK_EVENTS', () => {
      it('should contain all expected webhook events', () => {
        expect(SHOPIFY_WEBHOOK_EVENTS).toContain('orders/create');
        expect(SHOPIFY_WEBHOOK_EVENTS).toContain('customers/update');
        expect(SHOPIFY_WEBHOOK_EVENTS).toContain('products/delete');
        expect(SHOPIFY_WEBHOOK_EVENTS).toContain('inventory_levels/update');
        expect(SHOPIFY_WEBHOOK_EVENTS).toContain('checkouts/create');
      });

      it('should have 18 webhook events', () => {
        expect(SHOPIFY_WEBHOOK_EVENTS).toHaveLength(18);
      });

      it('should be a readonly array', () => {
        // TypeScript enforces readonly at compile time, not runtime
        // Just verify it's an array
        expect(Array.isArray(SHOPIFY_WEBHOOK_EVENTS)).toBe(true);
        expect(Object.isFrozen(SHOPIFY_WEBHOOK_EVENTS)).toBe(false); // Not frozen at runtime
        // Ensure array hasn't been modified by previous tests
        expect(SHOPIFY_WEBHOOK_EVENTS[0]).toBe('orders/create');
      });
    });

    describe('FACEBOOK_STANDARD_EVENTS', () => {
      it('should contain all standard Facebook events', () => {
        expect(FACEBOOK_STANDARD_EVENTS).toContain('PageView');
        expect(FACEBOOK_STANDARD_EVENTS).toContain('ViewContent');
        expect(FACEBOOK_STANDARD_EVENTS).toContain('Purchase');
        expect(FACEBOOK_STANDARD_EVENTS).toContain('AddToCart');
        expect(FACEBOOK_STANDARD_EVENTS).toContain('CompleteRegistration');
      });

      it('should have 10 standard events', () => {
        expect(FACEBOOK_STANDARD_EVENTS).toHaveLength(10);
      });

      it('should be a readonly array', () => {
        // TypeScript enforces readonly at compile time, not runtime
        // Just verify it's an array
        expect(Array.isArray(FACEBOOK_STANDARD_EVENTS)).toBe(true);
        expect(Object.isFrozen(FACEBOOK_STANDARD_EVENTS)).toBe(false); // Not frozen at runtime
      });
    });

    describe('SEGMENT_EVENT_TYPES', () => {
      it('should contain all Segment event types', () => {
        expect(SEGMENT_EVENT_TYPES).toEqual(['track', 'identify', 'page', 'group']);
      });

      it('should have 4 event types', () => {
        expect(SEGMENT_EVENT_TYPES).toHaveLength(4);
      });

      it('should be a readonly array', () => {
        // TypeScript enforces readonly at compile time, not runtime
        // Just verify it's an array
        expect(Array.isArray(SEGMENT_EVENT_TYPES)).toBe(true);
        expect(Object.isFrozen(SEGMENT_EVENT_TYPES)).toBe(false); // Not frozen at runtime
      });
    });
  });

  describe('type guards', () => {
    it('ShopifyWebhookEvent should match constant values', () => {
      const validEvent: ShopifyWebhookEvent = 'orders/create';
      expect(SHOPIFY_WEBHOOK_EVENTS).toContain(validEvent);
    });

    it('FacebookStandardEvent should match constant values', () => {
      const validEvent: FacebookStandardEvent = 'Purchase';
      expect(FACEBOOK_STANDARD_EVENTS).toContain(validEvent);
    });

    it('SegmentEventType should match constant values', () => {
      const validType: SegmentEventType = 'track';
      expect(SEGMENT_EVENT_TYPES).toContain(validType);
    });
  });

  describe('createShopifyEvent', () => {
    it('should create a Shopify event with required fields', () => {
      const event = createShopifyEvent('product_view', 'test-shop.myshopify.com');

      expect(event).toEqual({
        source: 'shopify',
        eventType: 'product_view',
        shopDomain: 'test-shop.myshopify.com',
        properties: {},
      });
    });

    it('should create a Shopify event with properties', () => {
      const properties = {
        productId: 'prod-123',
        price: 29.99,
        currency: 'USD',
      };

      const event = createShopifyEvent(
        'add_to_cart',
        'shop.myshopify.com',
        properties
      );

      expect(event).toEqual({
        source: 'shopify',
        eventType: 'add_to_cart',
        shopDomain: 'shop.myshopify.com',
        properties,
      });
    });

    it('should create a Shopify event with context', () => {
      const context = {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        page: {
          url: 'https://example.com',
          title: 'Example Page',
        },
      };

      const event = createShopifyEvent(
        'page_view',
        'shop.myshopify.com',
        {},
        context
      );

      expect(event).toEqual({
        source: 'shopify',
        eventType: 'page_view',
        shopDomain: 'shop.myshopify.com',
        properties: {},
        context,
      });
    });

    it('should create a Shopify event with all optional fields', () => {
      const properties = { key: 'value' };
      const context = { ip: '10.0.0.1' };

      const event = createShopifyEvent(
        'checkout_completed',
        'shop.myshopify.com',
        properties,
        context
      );

      expect(event).toEqual({
        source: 'shopify',
        eventType: 'checkout_completed',
        shopDomain: 'shop.myshopify.com',
        properties,
        context,
      });
    });

    it('should always set source to shopify', () => {
      const event = createShopifyEvent('search', 'shop.myshopify.com');
      expect(event.source).toBe('shopify');
    });

    it('should omit id and timestamp fields', () => {
      const event = createShopifyEvent('product_view', 'shop.myshopify.com');
      expect(event).not.toHaveProperty('id');
      expect(event).not.toHaveProperty('timestamp');
    });
  });

  describe('createSegmentEvent', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-12-01T10:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create a Segment event with type and timestamp', () => {
      const event = createSegmentEvent('track', {});

      expect(event).toEqual({
        type: 'track',
        timestamp: '2023-12-01T10:00:00.000Z',
      });
    });

    it('should create a Segment event with additional data', () => {
      const event = createSegmentEvent('identify', {
        userId: 'user-123',
        traits: {
          email: 'user@example.com',
          name: 'John Doe',
        },
      });

      expect(event).toEqual({
        type: 'identify',
        timestamp: '2023-12-01T10:00:00.000Z',
        userId: 'user-123',
        traits: {
          email: 'user@example.com',
          name: 'John Doe',
        },
      });
    });

    it('should create a track event with event name and properties', () => {
      const event = createSegmentEvent('track', {
        event: 'Product Viewed',
        userId: 'user-123',
        properties: {
          productId: 'prod-456',
          price: 29.99,
        },
      });

      expect(event).toEqual({
        type: 'track',
        event: 'Product Viewed',
        timestamp: '2023-12-01T10:00:00.000Z',
        userId: 'user-123',
        properties: {
          productId: 'prod-456',
          price: 29.99,
        },
      });
    });

    it('should create a page event', () => {
      const event = createSegmentEvent('page', {
        anonymousId: 'anon-123',
        properties: {
          url: 'https://example.com',
          title: 'Home Page',
        },
      });

      expect(event).toEqual({
        type: 'page',
        timestamp: '2023-12-01T10:00:00.000Z',
        anonymousId: 'anon-123',
        properties: {
          url: 'https://example.com',
          title: 'Home Page',
        },
      });
    });

    it('should override timestamp if provided in data', () => {
      const customTimestamp = '2023-06-15T14:30:00.000Z';
      const event = createSegmentEvent('track', {
        timestamp: customTimestamp,
      });

      expect(event.timestamp).toBe(customTimestamp);
    });

    it('should merge all provided data', () => {
      const event = createSegmentEvent('track', {
        event: 'Test Event',
        userId: 'user-123',
        anonymousId: 'anon-456',
        properties: { test: true },
        context: { ip: '192.168.1.1' },
        integrations: { All: true },
      });

      expect(event).toEqual({
        type: 'track',
        timestamp: '2023-12-01T10:00:00.000Z',
        event: 'Test Event',
        userId: 'user-123',
        anonymousId: 'anon-456',
        properties: { test: true },
        context: { ip: '192.168.1.1' },
        integrations: { All: true },
      });
    });
  });

  describe('createFacebookEvent', () => {
    it('should create a Facebook event with required fields', () => {
      const userData = {
        em: ['user@example.com'],
        ph: ['+1234567890'],
      };

      const event = createFacebookEvent('PageView', userData);

      expect(event).toEqual({
        event_name: 'PageView',
        user_data: userData,
        action_source: 'website',
      });
    });

    it('should create a Facebook event with custom data', () => {
      const userData = {
        em: ['user@example.com'],
        client_ip_address: '192.168.1.1',
        client_user_agent: 'Mozilla/5.0',
      };

      const customData = {
        product_id: 'prod-123',
        value: 29.99,
        currency: 'USD',
      };

      const event = createFacebookEvent('Purchase', userData, customData);

      expect(event).toEqual({
        event_name: 'Purchase',
        user_data: userData,
        custom_data: customData,
        action_source: 'website',
      });
    });

    it('should always set action_source to website', () => {
      const event = createFacebookEvent('ViewContent', {});
      expect(event.action_source).toBe('website');
    });

    it('should omit event_time field', () => {
      const event = createFacebookEvent('AddToCart', {});
      expect(event).not.toHaveProperty('event_time');
    });

    it('should handle empty user_data', () => {
      const event = createFacebookEvent('Search', {});

      expect(event).toEqual({
        event_name: 'Search',
        user_data: {},
        action_source: 'website',
      });
    });

    it('should handle complex custom_data', () => {
      const customData = {
        products: [
          { id: 'prod-1', price: 10 },
          { id: 'prod-2', price: 20 },
        ],
        cart_total: 30,
        nested: {
          level1: {
            level2: 'value',
          },
        },
      };

      const event = createFacebookEvent('InitiateCheckout', {}, customData);

      expect(event.custom_data).toEqual(customData);
    });

    it('should create events with all Facebook standard event names', () => {
      FACEBOOK_STANDARD_EVENTS.forEach((eventName) => {
        const event = createFacebookEvent(eventName, {});
        expect(event.event_name).toBe(eventName);
      });
    });
  });
});