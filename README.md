# Eventabee - Shopify Event Tracking App

A scalable Shopify app that captures frontend and backend events from Shopify stores and forwards them to multiple destinations including Segment and Facebook (CAPI & Pixel).

## Architecture

This is an NX monorepo containing:

- **apps/shopify-app** - Main Shopify application (Node.js/Express)
- **libs/event-core** - Core event types and schemas
- **libs/shopify-client** - Shopify API client wrapper
- **libs/segment-client** - Segment integration
- **libs/facebook-client** - Facebook CAPI/Pixel integration
- **libs/shared-utils** - Shared utilities (logging, crypto, validation, etc.)

## Features

### 🔐 **Merchant-Facing Admin Dashboard**
- Beautiful Shopify Polaris UI integrated into Shopify Admin
- Secure merchant configuration for API keys (Segment, Facebook, Browserless)
- Real-time event analytics and connection status monitoring
- Usage statistics and billing management

### 💳 **Automated Billing & Subscriptions**
- Multiple subscription tiers (Starter, Professional, Enterprise)
- Shopify's native billing API integration
- Usage-based limits with automatic enforcement
- Seamless upgrade/downgrade flow

### 📊 **Event Collection**
- Webhook events (orders, customers, products) 
- Frontend events via Web Pixels API
- Custom event tracking with validation

### 🔌 **Integrations**
- **Segment**: Server-side tracking API with batching
- **Facebook CAPI**: Direct server-to-server events  
- **Facebook Pixel**: Browser-based events via browserless

### ⚡ **Enterprise Features**
- Event deduplication and batching
- Retry logic with exponential backoff
- Encrypted credential storage (AES-256-GCM)
- Real-time event processing with queues
- Connection health monitoring and alerting

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

3. **Start development server**
   ```bash
   npm run dev  # Starts the main Shopify app with embedded admin UI
   ```

4. **Develop with Shopify CLI**
   ```bash
   npm run shopify:dev  # Tunnel and auto-reload for Shopify development
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## Development

### Project Structure
```
eventabee/
├── apps/
│   ├── shopify-app/          # Main Shopify app (Express + Next.js)
│   └── admin-ui/             # Admin dashboard (Next.js + Polaris)
├── libs/
│   ├── event-core/           # Event types & schemas
│   ├── shopify-client/       # Shopify integration
│   ├── segment-client/       # Segment integration  
│   ├── facebook-client/      # Facebook integration
│   └── shared-utils/         # Common utilities
└── tools/                    # Build & deployment tools
```

### Available Scripts
- `npm run build` - Build all packages
- `npm run test` - Run all tests  
- `npm run lint` - Lint all packages
- `npm run dev` - Start main Shopify app with embedded UI
- `npm run dev:ui` - Start admin UI only (port 3001)
- `npm run shopify:dev` - Start with Shopify CLI tunnel
- `npm run shopify:deploy` - Deploy to Shopify Partners

### Shopify App Setup

1. Install Shopify CLI: `npm install -g @shopify/cli @shopify/theme`
2. Configure your app in `shopify.app.toml`
3. Run `shopify app generate webhook` to set up webhooks
4. Deploy with `shopify app deploy`

## Environment Variables

Required environment variables:

```bash
# Shopify
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
HOST_URL=https://your-app-url.com

# Segment
SEGMENT_WRITE_KEY=your-segment-write-key

# Facebook
FACEBOOK_ACCESS_TOKEN=your-facebook-token
FACEBOOK_PIXEL_ID=your-pixel-id

# Browserless
BROWSERLESS_TOKEN=your-browserless-token
BROWSERLESS_URL=wss://chrome.browserless.io

# Security
ENCRYPTION_KEY=your-256-bit-key
```

## Deployment

### Docker
```bash
docker build -t eventabee .
docker run -p 3000:3000 eventabee
```

### Kubernetes
```bash
kubectl apply -f k8s/
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details