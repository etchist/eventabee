import { BillingService } from '../services/billing-service';
import { logger } from '@eventabee/shared-utils';

const billingService = new BillingService();

export const requireActiveSubscription = async (req: any, res: any, next: any) => {
  try {
    const session = res.locals.shopify?.session;
    
    if (!session?.shop) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Skip billing check for billing-related endpoints
    if (req.path.startsWith('/api/billing') || req.path === '/health') {
      return next();
    }

    const hasActiveSubscription = await billingService.hasActiveSubscription(session.shop);
    
    if (!hasActiveSubscription) {
      logger.warn('Access denied - no active subscription', { 
        shop: session.shop,
        path: req.path 
      });
      
      return res.status(402).json({ 
        error: 'Active subscription required',
        billingRequired: true,
        message: 'Please subscribe to a plan to use this feature'
      });
    }

    // Check usage limits for event-related endpoints
    if (req.path.startsWith('/api/events') || req.path.startsWith('/api/webhooks')) {
      const stats = await getEventStats(session.shop);
      const usageCheck = await billingService.checkUsageLimits(session.shop, stats.totalEvents);
      
      if (!usageCheck.withinLimits) {
        logger.warn('Usage limit exceeded', { 
          shop: session.shop,
          eventsThisMonth: stats.totalEvents,
          limit: usageCheck.plan?.limits.eventsPerMonth 
        });
        
        return res.status(429).json({ 
          error: 'Usage limit exceeded',
          upgradeRequired: true,
          message: 'Please upgrade your plan to continue processing events'
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error checking billing status', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Helper function to get event stats
async function getEventStats(shop: string) {
  try {
    const { EventProcessor } = await import('../services/event-processor');
    const eventProcessor = new EventProcessor();
    return await eventProcessor.getStats(shop);
  } catch (error) {
    logger.error('Error getting event stats', { error, shop });
    return { totalEvents: 0, successfulEvents: 0, failedEvents: 0, eventsByType: {}, destinationStats: {} };
  }
}