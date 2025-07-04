import { ShopifyEvent } from '@eventabee/event-core';
import { logger, MemoryQueue } from '@eventabee/shared-utils';
import { SegmentDestination } from '../destinations/segment-destination';
import { FacebookDestination } from '../destinations/facebook-destination';
import { ConfigService } from './config-service';

export interface EventStats {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  eventsByType: Record<string, number>;
  destinationStats: Record<string, { sent: number; failed: number }>;
}

export interface ConnectionStatus {
  segment: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
  facebook: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
  browserless: {
    connected: boolean;
    lastSync?: string;
    error?: string;
  };
}

export class EventProcessor {
  private queue: MemoryQueue<ShopifyEvent>;
  private configService: ConfigService;
  private segmentDestination: SegmentDestination;
  private facebookDestination: FacebookDestination;
  private stats: Map<string, EventStats> = new Map();

  constructor() {
    this.queue = new MemoryQueue<ShopifyEvent>({
      maxConcurrent: 10,
      timeout: 30000,
      retryOptions: {
        maxAttempts: 3,
        delay: 1000,
      },
    });
    
    this.configService = new ConfigService();
    this.segmentDestination = new SegmentDestination();
    this.facebookDestination = new FacebookDestination();
    
    this.startProcessing();
  }

  async processEvent(event: ShopifyEvent): Promise<void> {
    logger.info('Processing event', { 
      eventType: event.eventType, 
      shop: event.shopDomain,
      eventId: event.id 
    });

    await this.queue.add(event, this.getEventPriority(event.eventType));
  }

  private getEventPriority(eventType: string): number {
    const highPriority = ['order_placed', 'checkout_completed'];
    const mediumPriority = ['add_to_cart', 'checkout_started'];
    
    if (highPriority.includes(eventType)) return 10;
    if (mediumPriority.includes(eventType)) return 5;
    return 1;
  }

  private async startProcessing(): void {
    setInterval(async () => {
      await this.queue.process({
        process: async (task) => {
          await this.handleEvent(task.data);
        },
      });
    }, 1000);
  }

  private async handleEvent(event: ShopifyEvent): Promise<void> {
    const config = await this.configService.getDecryptedConfig(event.shopDomain);
    const promises: Promise<void>[] = [];

    this.updateStats(event.shopDomain, event.eventType, 'total');

    try {
      if (config.segment.enabled && config.segment.writeKey) {
        promises.push(
          this.segmentDestination.send([event], config.segment)
            .then(() => this.updateStats(event.shopDomain, event.eventType, 'success', 'segment'))
            .catch((error) => {
              logger.error('Segment destination failed', { error, eventId: event.id });
              this.updateStats(event.shopDomain, event.eventType, 'failed', 'segment');
            })
        );
      }

      if (config.facebook.enabled && config.facebook.accessToken) {
        // Configure browserless if enabled
        if (config.browserless.enabled && config.browserless.token && config.browserless.url) {
          this.facebookDestination.setBrowserlessService(config.browserless.url, config.browserless.token);
        }
        
        promises.push(
          this.facebookDestination.send([event], config.facebook)
            .then(() => this.updateStats(event.shopDomain, event.eventType, 'success', 'facebook'))
            .catch((error) => {
              logger.error('Facebook destination failed', { error, eventId: event.id });
              this.updateStats(event.shopDomain, event.eventType, 'failed', 'facebook');
            })
        );
      }

      await Promise.allSettled(promises);
      
      logger.info('Event processed successfully', { 
        eventId: event.id, 
        destinationsCount: promises.length 
      });

    } catch (error) {
      this.updateStats(event.shopDomain, event.eventType, 'failed');
      throw error;
    }
  }

  private updateStats(
    shop: string, 
    eventType: string, 
    type: 'total' | 'success' | 'failed',
    destination?: string
  ): void {
    const shopStats = this.stats.get(shop) || {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      eventsByType: {},
      destinationStats: {},
    };

    if (type === 'total') {
      shopStats.totalEvents++;
      shopStats.eventsByType[eventType] = (shopStats.eventsByType[eventType] || 0) + 1;
    } else if (type === 'success') {
      shopStats.successfulEvents++;
      if (destination) {
        shopStats.destinationStats[destination] = shopStats.destinationStats[destination] || { sent: 0, failed: 0 };
        shopStats.destinationStats[destination].sent++;
      }
    } else if (type === 'failed') {
      shopStats.failedEvents++;
      if (destination) {
        shopStats.destinationStats[destination] = shopStats.destinationStats[destination] || { sent: 0, failed: 0 };
        shopStats.destinationStats[destination].failed++;
      }
    }

    this.stats.set(shop, shopStats);
  }

  async getStats(shop: string): Promise<EventStats> {
    return this.stats.get(shop) || {
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      eventsByType: {},
      destinationStats: {},
    };
  }

  async sendTestEvent(shop: string, eventType: string, properties: any): Promise<{ success: boolean; destinations: string[] }> {
    const config = await this.configService.getDecryptedConfig(shop);
    const destinations: string[] = [];
    
    // Create a test event
    const testEvent: ShopifyEvent = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      source: 'shopify',
      eventType: eventType as any,
      shopDomain: shop,
      properties: { ...properties, test: true },
    };

    const promises: Promise<void>[] = [];

    if (config.segment.enabled && config.segment.writeKey) {
      destinations.push('segment');
      promises.push(this.segmentDestination.send([testEvent], config.segment));
    }

    if (config.facebook.enabled && config.facebook.accessToken) {
      destinations.push('facebook');
      
      // Configure browserless if enabled for test
      if (config.browserless.enabled && config.browserless.token && config.browserless.url) {
        this.facebookDestination.setBrowserlessService(config.browserless.url, config.browserless.token);
      }
      
      promises.push(this.facebookDestination.send([testEvent], config.facebook));
    }

    try {
      await Promise.all(promises);
      return { success: true, destinations };
    } catch (error) {
      logger.error('Test event failed', { error, shop, eventType });
      throw error;
    }
  }

  async getConnectionStatus(shop: string): Promise<ConnectionStatus> {
    const config = await this.configService.getConfig(shop);
    
    return {
      segment: {
        connected: config.segment.enabled && !!config.segment.writeKey,
        lastSync: config.segment.lastSync,
        error: config.segment.lastError,
      },
      facebook: {
        connected: config.facebook.enabled && !!config.facebook.accessToken,
        lastSync: config.facebook.lastSync,
        error: config.facebook.lastError,
      },
      browserless: {
        connected: config.browserless.enabled && !!config.browserless.token,
        lastSync: config.browserless.lastSync,
        error: config.browserless.lastError,
      },
    };
  }
}