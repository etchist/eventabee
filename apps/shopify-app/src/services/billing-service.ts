import { Session } from '@shopify/shopify-api';
import { logger } from '@eventabee/shared-utils';

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

  private subscriptions: Map<string, Subscription> = new Map();

  async getPlans(): Promise<BillingPlan[]> {
    return this.plans;
  }

  async createSubscription(session: Session, planId: string): Promise<string> {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      throw new Error(`Plan ${planId} not found`);
    }

    try {
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

      const client = new (require('@shopify/shopify-api').GraphqlQueryError)(session);
      const response = await client.query({
        data: {
          query: billingQuery,
          variables,
        },
      });

      if (response.body?.data?.appSubscriptionCreate?.userErrors?.length > 0) {
        const errors = response.body.data.appSubscriptionCreate.userErrors;
        throw new Error(`Billing creation failed: ${errors.map((e: any) => e.message).join(', ')}`);
      }

      const confirmationUrl = response.body?.data?.appSubscriptionCreate?.confirmationUrl;
      
      if (!confirmationUrl) {
        throw new Error('Failed to create billing subscription');
      }

      logger.info('Billing subscription created', {
        shop: session.shop,
        planId,
        subscriptionId: response.body?.data?.appSubscriptionCreate?.appSubscription?.id,
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

      const client = new (require('@shopify/shopify-api').GraphqlQueryError)(session);
      const response = await client.query({
        data: {
          query: billingQuery,
          variables: { id: chargeId },
        },
      });

      const subscription = response.body?.data?.node;
      
      if (subscription && subscription.status === 'ACTIVE') {
        // Store subscription info
        const sub: Subscription = {
          id: subscription.id,
          planId: this.extractPlanFromName(subscription.name),
          status: 'active',
          currentPeriodStart: new Date().toISOString(),
          currentPeriodEnd: subscription.currentPeriodEnd,
        };

        this.subscriptions.set(session.shop!, sub);

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
    return this.subscriptions.get(shop) || null;
  }

  async hasActiveSubscription(shop: string): Promise<boolean> {
    const subscription = await this.getSubscription(shop);
    return subscription?.status === 'active' && 
           new Date(subscription.currentPeriodEnd) > new Date();
  }

  async cancelSubscription(session: Session): Promise<void> {
    const subscription = await this.getSubscription(session.shop!);
    if (!subscription) {
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

      const client = new (require('@shopify/shopify-api').GraphqlQueryError)(session);
      const response = await client.query({
        data: {
          query: billingQuery,
          variables: { id: subscription.id },
        },
      });

      if (response.body?.data?.appSubscriptionCancel?.userErrors?.length > 0) {
        const errors = response.body.data.appSubscriptionCancel.userErrors;
        throw new Error(`Billing cancellation failed: ${errors.map((e: any) => e.message).join(', ')}`);
      }

      // Update local subscription status
      subscription.status = 'cancelled';
      this.subscriptions.set(session.shop!, subscription);

      logger.info('Billing subscription cancelled', {
        shop: session.shop,
        subscriptionId: subscription.id,
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

  private extractPlanFromName(subscriptionName: string): string {
    const plan = this.plans.find(p => subscriptionName.includes(p.name));
    return plan?.id || 'starter';
  }
}