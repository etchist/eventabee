export const environment = {
  production: false,
  port: process.env.PORT || 3000,
  shopifyApiKey: process.env.SHOPIFY_API_KEY || '',
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET || '',
  shopifyScopes: process.env.SHOPIFY_SCOPES || 'read_orders,read_customers,read_products,write_pixels,write_subscriptions,read_subscriptions',
  hostUrl: process.env.HOST_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://localhost:5432/eventabee',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  encryptionKey: process.env.ENCRYPTION_KEY || 'default-key-change-in-production',
  browserlessUrl: process.env.BROWSERLESS_URL || 'https://chrome.browserless.io',
};