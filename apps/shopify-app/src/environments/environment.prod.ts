export const environment = {
  production: true,
  port: process.env.PORT || 3000,
  shopifyApiKey: process.env.SHOPIFY_API_KEY || '',
  shopifyApiSecret: process.env.SHOPIFY_API_SECRET || '',
  shopifyScopes: process.env.SHOPIFY_SCOPES || 'read_orders,read_customers,read_products,write_pixels,write_subscriptions,read_subscriptions',
  hostUrl: process.env.HOST_URL || '',
  databaseUrl: process.env.DATABASE_URL || '',
  redisUrl: process.env.REDIS_URL || '',
  encryptionKey: process.env.ENCRYPTION_KEY || '',
};