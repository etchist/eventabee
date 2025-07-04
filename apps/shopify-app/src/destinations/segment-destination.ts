import { ShopifyEvent, mappers } from '@eventabee/event-core';
import { logger, retry } from '@eventabee/shared-utils';
import { AppConfig } from '../services/config-service';

export class SegmentDestination {
  private readonly baseUrl = 'https://api.segment.io/v1';

  async send(events: ShopifyEvent[], config: AppConfig['segment']): Promise<void> {
    if (!config.writeKey) {
      throw new Error('Segment write key is required');
    }

    const segmentEvents = events.map(event => {
      const segmentEvent = mappers.shopifyToSegment.transform(event);
      return {
        ...segmentEvent,
        messageId: event.id,
        sentAt: new Date().toISOString(),
      };
    });

    await retry(async () => {
      const response = await fetch(`${this.baseUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(config.writeKey + ':').toString('base64')}`,
        },
        body: JSON.stringify({
          batch: segmentEvents,
          sentAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Segment API error: ${response.status} ${errorText}`);
      }

      logger.info('Successfully sent events to Segment', { 
        count: events.length,
        eventTypes: events.map(e => e.eventType),
      });
    }, {
      maxAttempts: 3,
      baseDelay: 1000,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
    });
  }

  async validateConnection(writeKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/identify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(writeKey + ':').toString('base64')}`,
        },
        body: JSON.stringify({
          userId: 'test-connection',
          traits: {
            test: true,
          },
          timestamp: new Date().toISOString(),
        }),
      });

      return response.ok;
    } catch (error) {
      logger.error('Segment connection validation failed', { error });
      return false;
    }
  }
}