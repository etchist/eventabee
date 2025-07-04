import 'dotenv/config';
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');
const next = require('next');
const path = require('path');

import { shopifyApp } from '@shopify/shopify-app-express';
import { LATEST_API_VERSION } from '@shopify/shopify-api';
import { environment } from './environments/environment';
import { logger } from '@eventabee/shared-utils';
import { billingRoutes } from './routes/billing';
import { apiRoutes } from './routes/api';
import { webhookRoutes } from './routes/webhooks';
import { authRoutes } from './routes/auth';

const app = express();

// Initialize Next.js app for admin UI
const dev = !environment.production;
const nextApp = next({ 
  dev, 
  dir: path.join(__dirname, '../../admin-ui'),
  conf: {
    distDir: dev ? '.next' : '../../../dist/apps/admin-ui/.next'
  }
});
const handle = nextApp.getRequestHandler();

app.use(helmet({
  contentSecurityPolicy: false, // Disable for embedded app
}));
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const shopify = shopifyApp({
  api: {
    apiKey: environment.shopifyApiKey,
    apiSecretKey: environment.shopifyApiSecret,
    scopes: environment.shopifyScopes.split(','),
    hostUrl: environment.hostUrl,
    apiVersion: LATEST_API_VERSION,
    isEmbeddedApp: true,
  },
  auth: {
    path: '/api/auth',
    callbackPath: '/api/auth/callback',
  },
  webhooks: {
    path: '/api/webhooks',
  },
  useOnlineTokens: true,
});

app.use(shopify.config.auth.path, shopify.auth.begin());
app.use(shopify.config.auth.callbackPath, shopify.auth.callback(), (req: any, res: any) => {
  res.redirect(`/?shop=${req.query.shop}&host=${req.query.host}`);
});

app.use('/api/webhooks', shopify.processWebhooks({ webhookHandlers: {} }));

// API Routes (protected)
app.use('/api/billing', shopify.validateAuthenticatedSession(), billingRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api', shopify.validateAuthenticatedSession(), apiRoutes);

// Health check endpoint
app.get('/health', (req: any, res: any) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: environment.production ? 'production' : 'development'
  });
});

// Serve Next.js admin UI
app.get('*', (req: any, res: any) => {
  return handle(req, res);
});

app.use((err: Error, req: any, res: any, next: any) => {
  logger.error('Unhandled error', { 
    error: err.message, 
    stack: err.stack,
    url: req.url,
    method: req.method 
  });
  
  res.status(500).json({ 
    error: environment.production ? 'Internal server error' : err.message 
  });
});

// Start Next.js and Express server
nextApp.prepare().then(() => {
  app.listen(environment.port, () => {
    logger.info(`Eventabee Shopify App listening on port ${environment.port}`);
    logger.info(`Admin UI available at http://localhost:${environment.port}`);
  });
}).catch((err) => {
  logger.error('Error starting server', { error: err });
  process.exit(1);
});