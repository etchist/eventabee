import { Session, GraphqlClient } from '@shopify/shopify-api';
import { logger } from '@eventabee/shared-utils';
import { prisma, withTransaction } from './database-service';
import { SubscriptionStatus } from '../../../../generated/prisma';

export interface BillingPlan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  features: string[];
  limits: {
    eventsPerMonth: number;
    destinations: number;
  };
}

export interface Subscription {
  id: string;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEnd?: string;
}

export class BillingService {
  private readonly plans: BillingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 9.99,
      interval: 'monthly',
      features: [
        'Up to 10,000 events/month',
        'Segment integration',
        'Facebook Pixel integration',
        'Basic analytics',
      ],
      limits: {
        eventsPerMonth: 10000,
        destinations: 2,
      },
    },
    {
      id: 'professional', 
      name: 'Professional',
      price: 29.99,
      interval: 'monthly',
      features: [
        'Up to 100,000 events/month',
        'All integrations',
        'Advanced analytics',
        'Custom event mapping',
        'Priority support',
      ],
      limits: {
        eventsPerMonth: 100000,
        destinations: 5,
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise', 
      price: 99.99,
      interval: 'monthly',
      features: [
        'Unlimited events',
        'Custom integrations',
        'Dedicated support',
        'SLA guarantee',
        'Custom reporting',
      ],
      limits: {
        eventsPerMonth: -1, // unlimited
        destinations: -1, // unlimited
      },
    },
  ];

  async getPlans(): Promise<BillingPlan[]> {
    return this.plans;
  }

  async createSubscription(session: Session, planId: string): Promise<string> {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    try {
      // Get or create shop record
      const shop = await prisma.shop.findUnique({
        where: { shop: session.shop! },
      });

      if (!shop) {
        throw new Error(`Shop ${session.shop} not found`);
      }

      // Create Shopify billing subscription
      const billingQuery = `
        mutation appSubscriptionCreate($name: String!, $returnUrl: URL!, $test: Boolean, $lineItems: [AppSubscriptionLineItemInput!]!) {
          appSubscriptionCreate(name: $name, returnUrl: $returnUrl, test: $test, lineItems: $lineItems) {
            appSubscription {
              id
              status
            }
            confirmationUrl
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        name: `Eventabee ${plan.name} Plan`,
        returnUrl: `${process.env.HOST_URL}/api/billing/callback`,
        test: process.env.NODE_ENV !== 'production',
        lineItems: [
          {
            plan: {
              appRecurringPricingDetails: {
                price: { amount: plan.price, currencyCode: 'USD' },
                interval: plan.interval === 'monthly' ? 'EVERY_30_DAYS' : 'ANNUAL',
              },
            },
          },
        ],
      };

      const client = new GraphqlClient({ session });
      const response = await client.query({
        data: {
          query: billingQuery,
          variables,
        },
      });

      const responseData = (response.body as any)?.data?.appSubscriptionCreate;
      
      if (responseData?.userErrors?.length > 0) {
        const errors = responseData.userErrors;
        throw new Error(`Billing creation failed: ${errors.map((e: any) => e.message).join(', ')}`);
      }

      const confirmationUrl = responseData?.confirmationUrl;
      const subscriptionId = responseData?.appSubscription?.id;
      
      if (!confirmationUrl || !subscriptionId) {
        throw new Error('Failed to create billing subscription');
      }

      // Create pending subscription record
      await prisma.subscription.create({
        data: {
          shopId: shop.id,
          subscriptionId,
          planId,
          status: SubscriptionStatus.PENDING,
          currentPeriodStart: new Date(),
          currentPeriodEnd: this.calculatePeriodEnd(plan.interval),
        },
      });

      logger.info('Billing subscription created', {
        shop: session.shop,
        planId,
        subscriptionId,
      });

      return confirmationUrl;
    } catch (error) {
      logger.error('Error creating billing subscription', { error, shop: session.shop, planId });
      throw error;
    }
  }

  async handleBillingCallback(session: Session, chargeId: string): Promise<void> {
    try {
      // Verify and activate the subscription
      const billingQuery = `
        query getSubscription($id: ID!) {
          node(id: $id) {
            ... on AppSubscription {
              id
              name
              status
              currentPeriodEnd
              trialDays
            }
          }
        }
      `;

      const client = new GraphqlClient({ session });
      const response = await client.query({
        data: {
          query: billingQuery,
          variables: { id: chargeId },
        },
      });

      const subscription = (response.body as any)?.data?.node;
      
      if (subscription && subscription.status === 'ACTIVE') {
        // Update subscription status
        await prisma.subscription.update({
          where: { subscriptionId: chargeId },
          data: {
            status: SubscriptionStatus.ACTIVE,
            currentPeriodEnd: new Date(subscription.currentPeriodEnd),
          },
        });

        logger.info('Billing subscription activated', {
          shop: session.shop,
          subscriptionId: subscription.id,
        });
      }
    } catch (error) {
      logger.error('Error handling billing callback', { error, shop: session.shop, chargeId });
      throw error;
    }
  }

  async getSubscription(shop: string): Promise<Subscription | null> {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop },
      include: { subscription: true },
    });

    if (!shopRecord?.subscription) {
      return null;
    }

    return this.mapSubscriptionToInterface(shopRecord.subscription);
  }

  async hasActiveSubscription(shop: string): Promise<boolean> {
    const subscription = await this.getSubscription(shop);
    return subscription?.status === 'active' && 
           new Date(subscription.currentPeriodEnd) > new Date();
  }

  async cancelSubscription(session: Session): Promise<void> {
    const shop = await prisma.shop.findUnique({
      where: { shop: session.shop! },
      include: { subscription: true },
    });

    if (!shop?.subscription) {
      throw new Error('No active subscription found');
    }

    try {
      const billingQuery = `
        mutation appSubscriptionCancel($id: ID!) {
          appSubscriptionCancel(id: $id) {
            appSubscription {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const client = new GraphqlClient({ session });
      const response = await client.query({
        data: {
          query: billingQuery,
          variables: { id: shop.subscription.subscriptionId },
        },
      });

      const responseData = (response.body as any)?.data?.appSubscriptionCancel;
      
      if (responseData?.userErrors?.length > 0) {
        const errors = responseData.userErrors;
        throw new Error(`Billing cancellation failed: ${errors.map((e: any) => e.message).join(', ')}`);
      }

      // Update local subscription status
      await prisma.subscription.update({
        where: { id: shop.subscription.id },
        data: { status: SubscriptionStatus.CANCELLED },
      });

      logger.info('Billing subscription cancelled', {
        shop: session.shop,
        subscriptionId: shop.subscription.subscriptionId,
      });
    } catch (error) {
      logger.error('Error cancelling billing subscription', { error, shop: session.shop });
      throw error;
    }
  }

  async checkUsageLimits(shop: string, eventsThisMonth: number): Promise<{ withinLimits: boolean; plan: BillingPlan | null }> {
    const subscription = await this.getSubscription(shop);
    if (!subscription) {
      return { withinLimits: false, plan: null };
    }

    const plan = this.plans.find(p => p.id === subscription.planId);
    if (!plan) {
      return { withinLimits: false, plan: null };
    }

    const withinLimits = plan.limits.eventsPerMonth === -1 || 
                        eventsThisMonth <= plan.limits.eventsPerMonth;

    return { withinLimits, plan };
  }

  async updateEventCount(shop: string, increment = 1): Promise<void> {
    await withTransaction(async (tx) => {
      const shopRecord = await tx.shop.findUnique({
        where: { shop },
        include: { subscription: true },
      });

      if (!shopRecord?.subscription) {
        return;
      }

      const subscription = shopRecord.subscription;
      
      // Check if we need to reset the monthly counter
      const now = new Date();
      const lastReset = new Date(subscription.lastResetDate);
      if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            eventsThisMonth: increment,
            lastResetDate: now,
          },
        });
      } else {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            eventsThisMonth: {
              increment,
            },
          },
        });
      }
    });
  }

  async getUsageStats(shop: string): Promise<{ eventsThisMonth: number; limit: number }> {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop },
      include: { subscription: true },
    });

    if (!shopRecord?.subscription) {
      return { eventsThisMonth: 0, limit: 0 };
    }

    const plan = this.plans.find(p => p.id === shopRecord.subscription.planId);
    
    return {
      eventsThisMonth: shopRecord.subscription.eventsThisMonth,
      limit: plan?.limits.eventsPerMonth || 0,
    };
  }

  private calculatePeriodEnd(interval: 'monthly' | 'yearly'): Date {
    const date = new Date();
    if (interval === 'monthly') {
      date.setMonth(date.getMonth() + 1);
    } else {
      date.setFullYear(date.getFullYear() + 1);
    }
    return date;
  }

  private mapSubscriptionToInterface(subscription: any): Subscription {
    return {
      id: subscription.subscriptionId,
      planId: subscription.planId,
      status: subscription.status.toLowerCase() as any,
      currentPeriodStart: subscription.currentPeriodStart.toISOString(),
      currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
      trialEnd: subscription.trialEnd?.toISOString(),
    };
  }
}