import { ShopifyEvent } from '@eventabee/event-core';
import { logger, retry } from '@eventabee/shared-utils';

export class BrowserlessService {
  private readonly browserlessUrl: string;
  private readonly token: string;

  constructor(browserlessUrl: string, token: string) {
    this.browserlessUrl = browserlessUrl;
    this.token = token;
  }

  async sendPixelEvent(event: ShopifyEvent, pixelId: string): Promise<void> {
    const pixelCode = this.generatePixelCode(event, pixelId);
    
    await retry(async () => {
      const response = await fetch(`${this.browserlessUrl}/function`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`,
        },
        body: JSON.stringify({
          code: `
            const puppeteer = require('puppeteer');
            
            module.exports = async ({ page }) => {
              await page.goto('about:blank');
              
              await page.evaluate(() => {
                ${pixelCode}
              });
              
              // Wait for pixel to fire
              await page.waitForTimeout(2000);
              
              return { success: true };
            };
          `,
          context: {
            eventId: event.id,
            eventType: event.eventType,
            pixelId,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Browserless API error: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`Browserless execution failed: ${JSON.stringify(result)}`);
      }

      logger.info('Successfully sent pixel event via browserless', { 
        eventId: event.id,
        eventType: event.eventType,
        pixelId 
      });
    }, {
      maxAttempts: 2,
      baseDelay: 500,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT'],
    });
  }

  private generatePixelCode(event: ShopifyEvent, pixelId: string): string {
    const fbEvent = this.mapToFacebookPixelEvent(event);
    
    return `
      // Initialize Facebook Pixel
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      
      fbq('init', '${pixelId}');
      
      // Send the event
      fbq('track', '${fbEvent.eventName}', ${JSON.stringify(fbEvent.parameters)}, {
        eventID: '${event.id}'
      });
    `;
  }

  private mapToFacebookPixelEvent(event: ShopifyEvent): { eventName: string; parameters: any } {
    const baseParams = {
      source: 'shopify',
      shop_domain: event.shopDomain,
    };

    switch (event.eventType) {
      case 'page_view':
        return {
          eventName: 'PageView',
          parameters: baseParams,
        };
      
      case 'product_view':
        return {
          eventName: 'ViewContent',
          parameters: {
            ...baseParams,
            content_ids: [event.productId],
            content_type: 'product',
            value: event.properties?.price,
            currency: event.properties?.currency || 'USD',
          },
        };
      
      case 'add_to_cart':
        return {
          eventName: 'AddToCart',
          parameters: {
            ...baseParams,
            content_ids: [event.productId],
            content_type: 'product',
            value: event.properties?.price,
            currency: event.properties?.currency || 'USD',
            num_items: event.properties?.quantity || 1,
          },
        };
      
      case 'checkout_started':
        return {
          eventName: 'InitiateCheckout',
          parameters: {
            ...baseParams,
            value: event.properties?.total_price,
            currency: event.properties?.currency || 'USD',
            num_items: event.properties?.line_items?.length || 1,
          },
        };
      
      case 'order_placed':
        return {
          eventName: 'Purchase',
          parameters: {
            ...baseParams,
            value: event.properties?.total_price,
            currency: event.properties?.currency || 'USD',
            content_ids: event.properties?.line_items?.map((item: any) => item.product_id) || [],
            content_type: 'product',
            num_items: event.properties?.line_items?.length || 1,
          },
        };
      
      case 'customer_created':
        return {
          eventName: 'CompleteRegistration',
          parameters: baseParams,
        };
      
      default:
        return {
          eventName: 'CustomEvent',
          parameters: {
            ...baseParams,
            event_type: event.eventType,
          },
        };
    }
  }

  async validateConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.browserlessUrl}/json/version`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      return response.ok;
    } catch (error) {
      logger.error('Browserless connection validation failed', { error });
      return false;
    }
  }
}