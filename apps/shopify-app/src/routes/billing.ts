import * as express from 'express';
import { logger } from '@eventabee/shared-utils';
import { BillingService } from '../services/billing-service';

export const billingRoutes = express.Router();

const billingService = new BillingService();

billingRoutes.get('/plans', async (req: any, res: any) => {
  try {
    const plans = await billingService.getPlans();
    res.json(plans);
  } catch (error) {
    logger.error('Error fetching billing plans', { error });
    res.status(500).json({ error: 'Failed to fetch billing plans' });
  }
});

billingRoutes.get('/status', async (req: any, res: any) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const subscription = await billingService.getSubscription(session.shop);
    const hasActiveSubscription = await billingService.hasActiveSubscription(session.shop);

    res.json({
      hasActiveSubscription,
      subscription,
    });
  } catch (error) {
    logger.error('Error fetching billing status', { error });
    res.status(500).json({ error: 'Failed to fetch billing status' });
  }
});

billingRoutes.post('/create', async (req: any, res: any) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { planId } = req.body;
    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    logger.info('Creating billing subscription', { 
      shop: session.shop, 
      planId,
      correlationId: req.get('X-Request-Id') 
    });

    const confirmationUrl = await billingService.createSubscription(session, planId);

    res.json({ confirmationUrl });
  } catch (error) {
    logger.error('Error creating billing subscription', { error });
    res.status(500).json({ error: 'Failed to create billing subscription' });
  }
});

billingRoutes.get('/callback', async (req: any, res: any) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { charge_id } = req.query;
    if (!charge_id) {
      return res.status(400).json({ error: 'Charge ID is required' });
    }

    logger.info('Processing billing callback', { 
      shop: session.shop, 
      chargeId: charge_id,
      correlationId: req.get('X-Request-Id') 
    });

    await billingService.handleBillingCallback(session, charge_id as string);

    // Redirect to the app with success message
    res.redirect(`/?billing=success&shop=${session.shop}`);
  } catch (error) {
    logger.error('Error processing billing callback', { error });
    res.redirect(`/?billing=error&shop=${res.locals.shopify?.session?.shop}`);
  }
});

billingRoutes.post('/cancel', async (req: any, res: any) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    logger.info('Cancelling billing subscription', { 
      shop: session.shop,
      correlationId: req.get('X-Request-Id') 
    });

    await billingService.cancelSubscription(session);

    res.json({ success: true });
  } catch (error) {
    logger.error('Error cancelling billing subscription', { error });
    res.status(500).json({ error: 'Failed to cancel billing subscription' });
  }
});

billingRoutes.get('/usage', async (req: any, res: any) => {
  try {
    const session = res.locals.shopify?.session;
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get current month's event count from event processor
    const { EventProcessor } = await import('../services/event-processor');
    const eventProcessor = new EventProcessor();
    const stats = await eventProcessor.getStats(session.shop);
    
    const usageCheck = await billingService.checkUsageLimits(
      session.shop, 
      stats.totalEvents
    );

    res.json({
      eventsThisMonth: stats.totalEvents,
      plan: usageCheck.plan,
      withinLimits: usageCheck.withinLimits,
      usagePercentage: usageCheck.plan?.limits.eventsPerMonth === -1 
        ? 0 
        : (stats.totalEvents / usageCheck.plan?.limits.eventsPerMonth!) * 100,
    });
  } catch (error) {
    logger.error('Error fetching usage data', { error });
    res.status(500).json({ error: 'Failed to fetch usage data' });
  }
});