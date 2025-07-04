import { EventBuilder, ShopifyEventBuilder, createEvent } from './events';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

describe('EventBuilder', () => {
  let builder: EventBuilder;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-01T10:00:00.000Z'));
    builder = new EventBuilder();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with id and timestamp', () => {
      const event = builder.build();
      expect(event.id).toBe('mock-uuid-123');
      expect(event.timestamp).toBe('2023-12-01T10:00:00.000Z');
    });
  });

  describe('setUserId', () => {
    it('should set userId on the event', () => {
      const event = builder.setUserId('user-123').build();
      expect(event.userId).toBe('user-123');
    });

    it('should support method chaining', () => {
      const result = builder.setUserId('user-123');
      expect(result).toBe(builder);
    });
  });

  describe('setAnonymousId', () => {
    it('should set anonymousId on the event', () => {
      const event = builder.setAnonymousId('anon-456').build();
      expect(event.anonymousId).toBe('anon-456');
    });

    it('should support method chaining', () => {
      const result = builder.setAnonymousId('anon-456');
      expect(result).toBe(builder);
    });
  });

  describe('setSessionId', () => {
    it('should set sessionId on the event', () => {
      const event = builder.setSessionId('session-789').build();
      expect(event.sessionId).toBe('session-789');
    });

    it('should support method chaining', () => {
      const result = builder.setSessionId('session-789');
      expect(result).toBe(builder);
    });
  });

  describe('setProperties', () => {
    it('should set properties on the event', () => {
      const properties = { key1: 'value1', key2: 123 };
      const event = builder.setProperties(properties).build();
      expect(event.properties).toEqual(properties);
    });

    it('should merge properties when called multiple times', () => {
      const event = builder
        .setProperties({ key1: 'value1' })
        .setProperties({ key2: 'value2' })
        .build();
      expect(event.properties).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should override existing properties with same key', () => {
      const event = builder
        .setProperties({ key1: 'value1' })
        .setProperties({ key1: 'newValue' })
        .build();
      expect(event.properties).toEqual({ key1: 'newValue' });
    });

    it('should support method chaining', () => {
      const result = builder.setProperties({ key: 'value' });
      expect(result).toBe(builder);
    });
  });

  describe('setContext', () => {
    it('should set context on the event', () => {
      const context = {
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
        page: {
          url: 'https://example.com',
          title: 'Example Page',
        },
      };
      const event = builder.setContext(context).build();
      expect(event.context).toEqual(context);
    });

    it('should merge context when called multiple times', () => {
      const event = builder
        .setContext({ userAgent: 'Mozilla/5.0' })
        .setContext({ ip: '192.168.1.1' })
        .build();
      expect(event.context).toEqual({
        userAgent: 'Mozilla/5.0',
        ip: '192.168.1.1',
      });
    });

    it('should support method chaining', () => {
      const result = builder.setContext({ ip: '192.168.1.1' });
      expect(result).toBe(builder);
    });
  });

  describe('build', () => {
    it('should return a complete BaseEvent', () => {
      const event = builder
        .setUserId('user-123')
        .setAnonymousId('anon-456')
        .setSessionId('session-789')
        .setProperties({ product: 'widget' })
        .setContext({ ip: '192.168.1.1' })
        .build();

      expect(event).toEqual({
        id: 'mock-uuid-123',
        timestamp: '2023-12-01T10:00:00.000Z',
        userId: 'user-123',
        anonymousId: 'anon-456',
        sessionId: 'session-789',
        properties: { product: 'widget' },
        context: { ip: '192.168.1.1' },
      });
    });
  });
});

describe('ShopifyEventBuilder', () => {
  let builder: ShopifyEventBuilder;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-01T10:00:00.000Z'));
    builder = new ShopifyEventBuilder('product_view', 'test-shop.myshopify.com');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with eventType and shopDomain', () => {
      const event = builder.build();
      expect(event.source).toBe('shopify');
      expect(event.eventType).toBe('product_view');
      expect(event.shopDomain).toBe('test-shop.myshopify.com');
    });
  });

  describe('setCustomerId', () => {
    it('should set customerId on the event', () => {
      const event = builder.setCustomerId('cust-123').build();
      expect(event.customerId).toBe('cust-123');
    });

    it('should support method chaining', () => {
      const result = builder.setCustomerId('cust-123');
      expect(result).toBe(builder);
    });
  });

  describe('setOrderId', () => {
    it('should set orderId on the event', () => {
      const event = builder.setOrderId('order-456').build();
      expect(event.orderId).toBe('order-456');
    });

    it('should support method chaining', () => {
      const result = builder.setOrderId('order-456');
      expect(result).toBe(builder);
    });
  });

  describe('setProductId', () => {
    it('should set productId on the event', () => {
      const event = builder.setProductId('prod-789').build();
      expect(event.productId).toBe('prod-789');
    });

    it('should support method chaining', () => {
      const result = builder.setProductId('prod-789');
      expect(result).toBe(builder);
    });
  });

  describe('setVariantId', () => {
    it('should set variantId on the event', () => {
      const event = builder.setVariantId('var-101').build();
      expect(event.variantId).toBe('var-101');
    });

    it('should support method chaining', () => {
      const result = builder.setVariantId('var-101');
      expect(result).toBe(builder);
    });
  });

  describe('build', () => {
    it('should return a complete ShopifyEvent', () => {
      const event = builder
        .setUserId('user-123')
        .setCustomerId('cust-456')
        .setOrderId('order-789')
        .setProductId('prod-101')
        .setVariantId('var-202')
        .setProperties({ price: 29.99 })
        .setContext({ ip: '192.168.1.1' })
        .build();

      expect(event).toEqual({
        id: 'mock-uuid-123',
        timestamp: '2023-12-01T10:00:00.000Z',
        source: 'shopify',
        eventType: 'product_view',
        shopDomain: 'test-shop.myshopify.com',
        userId: 'user-123',
        customerId: 'cust-456',
        orderId: 'order-789',
        productId: 'prod-101',
        variantId: 'var-202',
        properties: { price: 29.99 },
        context: { ip: '192.168.1.1' },
      });
    });

    it('should inherit methods from EventBuilder', () => {
      const event = builder
        .setSessionId('session-123')
        .setAnonymousId('anon-456')
        .build();

      expect(event.sessionId).toBe('session-123');
      expect(event.anonymousId).toBe('anon-456');
    });
  });
});

describe('createEvent', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-01T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a new ShopifyEventBuilder instance', () => {
    const builder = createEvent('checkout_started', 'test-shop.myshopify.com');
    expect(builder).toBeInstanceOf(ShopifyEventBuilder);
  });

  it('should initialize with correct eventType and shopDomain', () => {
    const event = createEvent('add_to_cart', 'another-shop.myshopify.com').build();
    expect(event.eventType).toBe('add_to_cart');
    expect(event.shopDomain).toBe('another-shop.myshopify.com');
  });

  it('should return a builder that can be chained', () => {
    const event = createEvent('order_placed', 'shop.myshopify.com')
      .setUserId('user-123')
      .setOrderId('order-456')
      .setProperties({ total: 99.99 })
      .build();

    expect(event.userId).toBe('user-123');
    expect(event.orderId).toBe('order-456');
    expect(event.properties?.total).toBe(99.99);
  });
});