import * as express from 'express';
import { logger } from '@eventabee/shared-utils';
import { ConfigService } from '../services/config-service';
import { EventProcessor } from '../services/event-processor';

export const apiRoutes = express.Router();

const configService = new ConfigService();
const eventProcessor = new EventProcessor();

apiRoutes.get('/config', async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const config = await configService.getConfig(session.shop);
    res.json(config);
  } catch (error) {
    logger.error('Error fetching config', { error });
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

apiRoutes.post('/config', async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const config = await configService.updateConfig(session.shop, req.body);
    res.json(config);
  } catch (error) {
    logger.error('Error updating config', { error });
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

apiRoutes.get('/events/stats', async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const stats = await eventProcessor.getStats(session.shop);
    res.json(stats);
  } catch (error) {
    logger.error('Error fetching event stats', { error });
    res.status(500).json({ error: 'Failed to fetch event statistics' });
  }
});

apiRoutes.post('/events/test', async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { eventType, properties } = req.body;
    
    const result = await eventProcessor.sendTestEvent(session.shop, eventType, properties);
    res.json(result);
  } catch (error) {
    logger.error('Error sending test event', { error });
    res.status(500).json({ error: 'Failed to send test event' });
  }
});

apiRoutes.get('/connections/status', async (req, res) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const status = await eventProcessor.getConnectionStatus(session.shop);
    res.json(status);
  } catch (error) {
    logger.error('Error fetching connection status', { error });
    res.status(500).json({ error: 'Failed to fetch connection status' });
  }
});