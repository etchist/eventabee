import * as express from 'express';
import { logger } from '@eventabee/shared-utils';

export const authRoutes = express.Router();

authRoutes.get('/status', (req, res) => {
  const session = res.locals.shopify?.session;
  
  if (session?.isActive()) {
    res.json({
      authenticated: true,
      shop: session.shop,
      scope: session.scope,
    });
  } else {
    res.json({
      authenticated: false,
    });
  }
});

authRoutes.post('/logout', (req, res) => {
  const session = res.locals.shopify?.session;
  
  if (session) {
    logger.info('User logging out', { shop: session.shop });
  }
  
  res.json({ success: true });
});