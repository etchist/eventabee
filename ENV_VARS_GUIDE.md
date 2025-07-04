# Environment Variables Guide for Eventabee

## Required Environment Variables

These are the **only** environment variables needed by the application. All merchant-specific credentials (Segment, Facebook, Browserless) are configured through the admin UI and stored encrypted in the database.

### 1. Shopify App Credentials (Required)
```bash
# Your Shopify app's API key from Partners Dashboard
SHOPIFY_API_KEY=your-shopify-api-key-here

# Your Shopify app's API secret from Partners Dashboard  
SHOPIFY_API_SECRET=your-shopify-api-secret-here

# Required scopes for the app to function
SHOPIFY_SCOPES=read_orders,read_customers,read_products,write_pixels,read_checkouts,write_subscriptions,read_subscriptions

# Your app's public URL (ngrok URL for development, production URL for live)
HOST_URL=https://your-app-url.ngrok.io

# Same as SHOPIFY_API_KEY, needed for frontend App Bridge
NEXT_PUBLIC_SHOPIFY_API_KEY=your-shopify-api-key-here
```

### 2. Security (Required)
```bash
# 256-bit encryption key for securing merchant credentials
# Generate with: openssl rand -hex 32
ENCRYPTION_KEY=your-256-bit-hex-key-here
```

### 3. Database Configuration (Required for Production)
```bash
# PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/eventabee

# Redis connection string for event queuing
REDIS_URL=redis://localhost:6379
```

### 4. Application Settings (Optional)
```bash
# Port to run the application on (default: 3000)
PORT=3000

# Environment (development or production)
NODE_ENV=development

# Debug logging (development only)
DEBUG=eventabee:*
```

## What NOT to Include

The following should **NEVER** be in environment variables because they are merchant-specific and configured through the UI:

- ❌ `SEGMENT_WRITE_KEY` - Merchants enter their own
- ❌ `FACEBOOK_ACCESS_TOKEN` - Merchants enter their own
- ❌ `FACEBOOK_PIXEL_ID` - Merchants enter their own
- ❌ `BROWSERLESS_TOKEN` - Merchants enter their own
- ❌ `BROWSERLESS_URL` - Merchants enter their own

## Development Setup

1. Copy the example file:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Shopify app credentials from the Partners Dashboard

3. Generate a secure encryption key:
   ```bash
   openssl rand -hex 32
   ```

4. For local development, you can use the default database URLs or run:
   ```bash
   docker-compose up -d postgres redis
   ```

## Production Deployment

For production, ensure you have:
- Valid SSL certificate (HOST_URL must be HTTPS)
- Production database with backups
- Redis instance for queuing
- Strong encryption key (never commit this!)
- Proper environment isolation

## Security Best Practices

1. **Never commit `.env` files** to version control
2. **Rotate encryption keys** periodically
3. **Use different keys** for development and production
4. **Monitor access** to environment variables
5. **Use secrets management** tools in production (AWS Secrets Manager, Vault, etc.)