import { ShopifyEvent, mappers } from '@eventabee/event-core';
import { logger, retry } from '@eventabee/shared-utils';
import { AppConfig } from '../services/config-service';
import { BrowserlessService } from '../services/browserless-service';

export class FacebookDestination {
  private readonly baseUrl = 'https://graph.facebook.com/v18.0';
  private browserlessService: BrowserlessService | null = null;

  setBrowserlessService(url: string, token: string): void {
    if (url && token) {
      this.browserlessService = new BrowserlessService(url, token);
    }
  }

  async send(events: ShopifyEvent[], config: AppConfig['facebook']): Promise<void> {
    if (!config.accessToken || !config.pixelId) {
      throw new Error('Facebook access token and pixel ID are required');
    }

    const facebookEvents = events.map(event => {
      const fbEvent = mappers.shopifyToFacebook.transform(event);
      return {
        ...fbEvent,
        event_time: Math.floor(new Date(event.timestamp).getTime() / 1000),
      };
    });

    await Promise.all([
      this.sendToConversionsAPI(facebookEvents, config),
      this.sendToPixel(events, config),
    ]);
  }

  private async sendToConversionsAPI(events: any[], config: AppConfig['facebook']): Promise<void> {
    await retry(async () => {
      const response = await fetch(
        `${this.baseUrl}/${config.pixelId}/events?access_token=${config.accessToken}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: events,
            test_event_code: process.env.NODE_ENV !== 'production' ? 'TEST12345' : undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Facebook CAPI error: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      
      if (result.error) {
        throw new Error(`Facebook CAPI error: ${JSON.stringify(result.error)}`);
      }

      logger.info('Successfully sent events to Facebook CAPI', { 
        count: events.length,
        eventsReceived: result.events_received,
        messagesReceived: result.messages_received,
      });
    }, {
      maxAttempts: 3,
      baseDelay: 1000,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND'],
    });
  }

  private async sendToPixel(events: ShopifyEvent[], config: AppConfig['facebook']): Promise<void> {
    if (!this.browserlessService) {
      logger.debug('Browserless not configured, skipping pixel events');
      return;
    }

    for (const event of events) {
      try {
        await this.browserlessService.sendPixelEvent(event, config.pixelId);
      } catch (error) {
        logger.error('Failed to send pixel event via browserless', { 
          error, 
          eventId: event.id,
          eventType: event.eventType 
        });
      }
    }
  }

  async validateConnection(accessToken: string, pixelId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/${pixelId}?access_token=${accessToken}&fields=name,id`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return !result.error && result.id === pixelId;
    } catch (error) {
      logger.error('Facebook connection validation failed', { error });
      return false;
    }
  }
}