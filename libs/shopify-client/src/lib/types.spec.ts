import {
  ShopifyConfig,
  ShopifySession,
  ShopifyWebhookPayload,
  ShopifyOrder,
  ShopifyCustomer,
  ShopifyAddress,
  ShopifyProduct,
  ShopifyImage,
} from './types';

describe('Shopify Types', () => {
  describe('ShopifyConfig', () => {
    it('should accept valid configuration', () => {
      const config: ShopifyConfig = {
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        scopes: ['read_products', 'write_orders'],
        hostUrl: 'https://example.com',
        apiVersion: '2024-01',
      };

      expect(config.apiKey).toBe('test-api-key');
      expect(config.scopes).toHaveLength(2);
      expect(config.apiVersion).toBe('2024-01');
    });
  });

  describe('ShopifySession', () => {
    it('should accept valid session data', () => {
      const session: ShopifySession = {
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
        state: 'test-state',
        isOnline: true,
        scope: 'read_products',
        expires: new Date('2024-12-31'),
      };

      expect(session.shop).toBe('test-shop.myshopify.com');
      expect(session.isOnline).toBe(true);
      expect(session.expires).toBeInstanceOf(Date);
    });

    it('should accept minimal session data', () => {
      const session: ShopifySession = {
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
        isOnline: false,
      };

      expect(session.shop).toBe('test-shop.myshopify.com');
      expect(session.state).toBeUndefined();
      expect(session.scope).toBeUndefined();
    });
  });

  describe('ShopifyWebhookPayload', () => {
    it('should accept webhook payload', () => {
      const payload: ShopifyWebhookPayload = {
        topic: 'orders/create',
        shop_domain: 'test-shop.myshopify.com',
        payload: {
          id: 123,
          email: 'customer@example.com',
        },
      };

      expect(payload.topic).toBe('orders/create');
      expect(payload.shop_domain).toBe('test-shop.myshopify.com');
      expect(payload.payload).toHaveProperty('id', 123);
    });
  });

  describe('ShopifyOrder', () => {
    it('should accept valid order data', () => {
      const order: ShopifyOrder = {
        id: 123456,
        email: 'customer@example.com',
        created_at: '2023-12-01T10:00:00Z',
        updated_at: '2023-12-01T10:00:00Z',
        number: 1001,
        note: 'Customer note',
        token: 'order-token',
        gateway: 'shopify_payments',
        test: false,
        total_price: '99.99',
        subtotal_price: '89.99',
        total_weight: 1000,
        total_tax: '10.00',
        taxes_included: true,
        currency: 'USD',
        financial_status: 'paid',
        confirmed: true,
        total_discounts: '0.00',
        buyer_accepts_marketing: true,
        name: '#1001',
        referring_site: 'https://google.com',
        landing_site: 'https://shop.com',
        reference: 'ref-123',
        user_id: 789,
        location_id: 456,
        source_identifier: 'source-123',
        source_url: 'https://source.com',
        device_id: 321,
        phone: '+1234567890',
        customer_locale: 'en-US',
        app_id: 111,
        browser_ip: '192.168.1.1',
        checkout_id: 999,
        checkout_token: 'checkout-token',
        line_items: [],
        customer: {} as ShopifyCustomer,
        billing_address: {} as ShopifyAddress,
        shipping_address: {} as ShopifyAddress,
        fulfillments: [],
        refunds: [],
      };

      expect(order.id).toBe(123456);
      expect(order.currency).toBe('USD');
      expect(order.financial_status).toBe('paid');
    });
  });

  describe('ShopifyProduct', () => {
    it('should accept valid product data', () => {
      const product: ShopifyProduct = {
        id: 789,
        title: 'Test Product',
        body_html: '<p>Product description</p>',
        vendor: 'Test Vendor',
        product_type: 'Widget',
        created_at: '2023-12-01T10:00:00Z',
        handle: 'test-product',
        updated_at: '2023-12-01T10:00:00Z',
        published_at: '2023-12-01T10:00:00Z',
        template_suffix: '',
        status: 'active',
        published_scope: 'web',
        tags: 'tag1, tag2',
        admin_graphql_api_id: 'gid://shopify/Product/789',
        variants: [],
        options: [],
        images: [],
        image: {} as ShopifyImage,
      };

      expect(product.title).toBe('Test Product');
      expect(product.status).toBe('active');
      expect(product.tags).toBe('tag1, tag2');
    });
  });

  describe('ShopifyCustomer', () => {
    it('should accept valid customer data', () => {
      const customer: ShopifyCustomer = {
        id: 456,
        email: 'customer@example.com',
        accepts_marketing: true,
        created_at: '2023-12-01T10:00:00Z',
        updated_at: '2023-12-01T10:00:00Z',
        first_name: 'John',
        last_name: 'Doe',
        state: 'enabled',
        note: 'VIP customer',
        verified_email: true,
        multipass_identifier: 'multipass-123',
        tax_exempt: false,
        tags: 'vip, returning',
        currency: 'USD',
        phone: '+1234567890',
        addresses: [],
        tax_exemptions: [],
        email_marketing_consent: {},
        sms_marketing_consent: {},
        admin_graphql_api_id: 'gid://shopify/Customer/456',
        default_address: {} as ShopifyAddress,
      };

      expect(customer.email).toBe('customer@example.com');
      expect(customer.first_name).toBe('John');
      expect(customer.verified_email).toBe(true);
    });
  });

  describe('ShopifyAddress', () => {
    it('should accept valid address data', () => {
      const address: ShopifyAddress = {
        id: 123,
        customer_id: 456,
        first_name: 'John',
        last_name: 'Doe',
        company: 'Acme Corp',
        address1: '123 Main St',
        address2: 'Suite 100',
        city: 'New York',
        province: 'New York',
        country: 'United States',
        zip: '10001',
        phone: '+1234567890',
        name: 'John Doe',
        province_code: 'NY',
        country_code: 'US',
        country_name: 'United States',
        default: true,
      };

      expect(address.city).toBe('New York');
      expect(address.country_code).toBe('US');
      expect(address.default).toBe(true);
    });
  });
});