import { logger, CryptoUtil } from '@eventabee/shared-utils';
import { environment } from '../environments/environment';
import { prisma } from './database-service';
import { Shop, EventMapping } from '../../../../generated/prisma';

export interface AppConfig {
  shop: string;
  segment: {
    enabled: boolean;
    writeKey: string;
    lastSync?: string;
    lastError?: string;
  };
  facebook: {
    enabled: boolean;
    accessToken: string;
    pixelId: string;
    lastSync?: string;
    lastError?: string;
  };
  browserless: {
    enabled: boolean;
    token: string;
    url: string;
    lastSync?: string;
    lastError?: string;
  };
  eventMapping: {
    [shopifyEvent: string]: {
      segment?: string;
      facebook?: string;
      enabled: boolean;
    };
  };
  webhooks: {
    enabled: string[];
  };
}

export class ConfigService {
  async getConfig(shop: string): Promise<AppConfig> {
    let shopRecord = await prisma.shop.findUnique({
      where: { shop },
      include: { eventMappings: true },
    });
    
    if (!shopRecord) {
      shopRecord = await this.createDefaultShop(shop);
    }
    
    return this.mapShopToConfig(shopRecord);
  }

  async updateConfig(shop: string, updates: Partial<AppConfig>): Promise<AppConfig> {
    const shopRecord = await prisma.shop.findUnique({
      where: { shop },
    });

    if (!shopRecord) {
      throw new Error(`Shop ${shop} not found`);
    }

    const updateData: any = {};

    // Handle segment updates
    if (updates.segment) {
      if (updates.segment.enabled !== undefined) {
        updateData.segmentEnabled = updates.segment.enabled;
      }
      if (updates.segment.writeKey !== undefined) {
        updateData.segmentWriteKey = updates.segment.writeKey ? 
          CryptoUtil.encrypt(updates.segment.writeKey, environment.encryptionKey) : '';
      }
      if (updates.segment.lastSync) {
        updateData.segmentLastSync = new Date(updates.segment.lastSync);
      }
      if (updates.segment.lastError !== undefined) {
        updateData.segmentLastError = updates.segment.lastError;
      }
    }

    // Handle facebook updates
    if (updates.facebook) {
      if (updates.facebook.enabled !== undefined) {
        updateData.facebookEnabled = updates.facebook.enabled;
      }
      if (updates.facebook.accessToken !== undefined) {
        updateData.facebookAccessToken = updates.facebook.accessToken ? 
          CryptoUtil.encrypt(updates.facebook.accessToken, environment.encryptionKey) : '';
      }
      if (updates.facebook.pixelId !== undefined) {
        updateData.facebookPixelId = updates.facebook.pixelId;
      }
      if (updates.facebook.lastSync) {
        updateData.facebookLastSync = new Date(updates.facebook.lastSync);
      }
      if (updates.facebook.lastError !== undefined) {
        updateData.facebookLastError = updates.facebook.lastError;
      }
    }

    // Handle browserless updates
    if (updates.browserless) {
      if (updates.browserless.enabled !== undefined) {
        updateData.browserlessEnabled = updates.browserless.enabled;
      }
      if (updates.browserless.token !== undefined) {
        updateData.browserlessToken = updates.browserless.token ? 
          CryptoUtil.encrypt(updates.browserless.token, environment.encryptionKey) : '';
      }
      if (updates.browserless.url !== undefined) {
        updateData.browserlessUrl = updates.browserless.url;
      }
      if (updates.browserless.lastSync) {
        updateData.browserlessLastSync = new Date(updates.browserless.lastSync);
      }
      if (updates.browserless.lastError !== undefined) {
        updateData.browserlessLastError = updates.browserless.lastError;
      }
    }

    // Handle webhooks updates
    if (updates.webhooks?.enabled) {
      updateData.webhooksEnabled = updates.webhooks.enabled;
    }

    // Update shop record
    const updatedShop = await prisma.shop.update({
      where: { id: shopRecord.id },
      data: updateData,
      include: { eventMappings: true },
    });

    // Handle event mapping updates
    if (updates.eventMapping) {
      for (const [shopifyEvent, mapping] of Object.entries(updates.eventMapping)) {
        await prisma.eventMapping.upsert({
          where: {
            shopId_shopifyEvent: {
              shopId: shopRecord.id,
              shopifyEvent,
            },
          },
          update: {
            segmentEvent: mapping.segment,
            facebookEvent: mapping.facebook,
            enabled: mapping.enabled,
          },
          create: {
            shopId: shopRecord.id,
            shopifyEvent,
            segmentEvent: mapping.segment,
            facebookEvent: mapping.facebook,
            enabled: mapping.enabled,
          },
        });
      }

      // Refresh the shop record with updated mappings
      const refreshedShop = await prisma.shop.findUnique({
        where: { id: shopRecord.id },
        include: { eventMappings: true },
      });
      
      if (refreshedShop) {
        return this.mapShopToConfig(refreshedShop);
      }
    }
    
    logger.info('Updated config for shop', { 
      shop, 
      segmentEnabled: updatedShop.segmentEnabled,
      facebookEnabled: updatedShop.facebookEnabled,
      browserlessEnabled: updatedShop.browserlessEnabled
    });
    
    return this.mapShopToConfig(updatedShop);
  }

  async getDecryptedConfig(shop: string): Promise<AppConfig> {
    const config = await this.getConfig(shop);
    
    const decrypted = { ...config };
    
    if (config.segment.writeKey) {
      try {
        decrypted.segment.writeKey = CryptoUtil.decrypt(
          config.segment.writeKey,
          environment.encryptionKey
        );
      } catch (error) {
        logger.error('Failed to decrypt Segment write key', { shop, error });
        decrypted.segment.writeKey = '';
      }
    }
    
    if (config.facebook.accessToken) {
      try {
        decrypted.facebook.accessToken = CryptoUtil.decrypt(
          config.facebook.accessToken,
          environment.encryptionKey
        );
      } catch (error) {
        logger.error('Failed to decrypt Facebook access token', { shop, error });
        decrypted.facebook.accessToken = '';
      }
    }
    
    if (config.browserless.token) {
      try {
        decrypted.browserless.token = CryptoUtil.decrypt(
          config.browserless.token,
          environment.encryptionKey
        );
      } catch (error) {
        logger.error('Failed to decrypt Browserless token', { shop, error });
        decrypted.browserless.token = '';
      }
    }
    
    return decrypted;
  }

  private async createDefaultShop(shop: string): Promise<Shop & { eventMappings: EventMapping[] }> {
    const defaultMappings = [
      { shopifyEvent: 'page_view', segmentEvent: 'Page Viewed', facebookEvent: 'PageView', enabled: true },
      { shopifyEvent: 'product_view', segmentEvent: 'Product Viewed', facebookEvent: 'ViewContent', enabled: true },
      { shopifyEvent: 'add_to_cart', segmentEvent: 'Product Added', facebookEvent: 'AddToCart', enabled: true },
      { shopifyEvent: 'checkout_started', segmentEvent: 'Checkout Started', facebookEvent: 'InitiateCheckout', enabled: true },
      { shopifyEvent: 'order_placed', segmentEvent: 'Order Completed', facebookEvent: 'Purchase', enabled: true },
      { shopifyEvent: 'customer_created', segmentEvent: 'User Registered', facebookEvent: 'CompleteRegistration', enabled: true },
    ];

    const shopRecord = await prisma.shop.create({
      data: {
        shop,
        browserlessUrl: environment.browserlessUrl,
        webhooksEnabled: [
          'orders/create',
          'orders/updated', 
          'customers/create',
          'products/create',
        ],
        eventMappings: {
          create: defaultMappings,
        },
      },
      include: { eventMappings: true },
    });

    logger.info('Created default config for shop', { shop });
    return shopRecord;
  }

  private mapShopToConfig(shop: Shop & { eventMappings: EventMapping[] }): AppConfig {
    const eventMapping: AppConfig['eventMapping'] = {};
    
    for (const mapping of shop.eventMappings) {
      eventMapping[mapping.shopifyEvent] = {
        segment: mapping.segmentEvent || undefined,
        facebook: mapping.facebookEvent || undefined,
        enabled: mapping.enabled,
      };
    }

    return {
      shop: shop.shop,
      segment: {
        enabled: shop.segmentEnabled,
        writeKey: shop.segmentWriteKey,
        lastSync: shop.segmentLastSync?.toISOString(),
        lastError: shop.segmentLastError || undefined,
      },
      facebook: {
        enabled: shop.facebookEnabled,
        accessToken: shop.facebookAccessToken,
        pixelId: shop.facebookPixelId,
        lastSync: shop.facebookLastSync?.toISOString(),
        lastError: shop.facebookLastError || undefined,
      },
      browserless: {
        enabled: shop.browserlessEnabled,
        token: shop.browserlessToken,
        url: shop.browserlessUrl,
        lastSync: shop.browserlessLastSync?.toISOString(),
        lastError: shop.browserlessLastError || undefined,
      },
      eventMapping,
      webhooks: {
        enabled: shop.webhooksEnabled,
      },
    };
  }
}