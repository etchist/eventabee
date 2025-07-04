import { logger, CryptoUtil } from '@eventabee/shared-utils';
import { environment } from '../environments/environment';

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
  private configs: Map<string, AppConfig> = new Map();

  async getConfig(shop: string): Promise<AppConfig> {
    let config = this.configs.get(shop);
    
    if (!config) {
      config = this.createDefaultConfig(shop);
      this.configs.set(shop, config);
      logger.info('Created default config for shop', { shop });
    }
    
    return config;
  }

  async updateConfig(shop: string, updates: Partial<AppConfig>): Promise<AppConfig> {
    const currentConfig = await this.getConfig(shop);
    
    const updatedConfig: AppConfig = {
      ...currentConfig,
      ...updates,
      shop,
    };

    if (updates.segment?.writeKey) {
      updatedConfig.segment.writeKey = CryptoUtil.encrypt(
        updates.segment.writeKey,
        environment.encryptionKey
      );
    }

    if (updates.facebook?.accessToken) {
      updatedConfig.facebook.accessToken = CryptoUtil.encrypt(
        updates.facebook.accessToken,
        environment.encryptionKey
      );
    }

    if (updates.browserless?.token) {
      updatedConfig.browserless.token = CryptoUtil.encrypt(
        updates.browserless.token,
        environment.encryptionKey
      );
    }

    this.configs.set(shop, updatedConfig);
    
    logger.info('Updated config for shop', { 
      shop, 
      segmentEnabled: updatedConfig.segment.enabled,
      facebookEnabled: updatedConfig.facebook.enabled,
      browserlessEnabled: updatedConfig.browserless.enabled
    });
    
    return updatedConfig;
  }

  private createDefaultConfig(shop: string): AppConfig {
    return {
      shop,
      segment: {
        enabled: false,
        writeKey: '',
      },
      facebook: {
        enabled: false,
        accessToken: '',
        pixelId: '',
      },
      browserless: {
        enabled: false,
        token: '',
        url: environment.browserlessUrl,
      },
      eventMapping: {
        page_view: { segment: 'Page Viewed', facebook: 'PageView', enabled: true },
        product_view: { segment: 'Product Viewed', facebook: 'ViewContent', enabled: true },
        add_to_cart: { segment: 'Product Added', facebook: 'AddToCart', enabled: true },
        checkout_started: { segment: 'Checkout Started', facebook: 'InitiateCheckout', enabled: true },
        order_placed: { segment: 'Order Completed', facebook: 'Purchase', enabled: true },
        customer_created: { segment: 'User Registered', facebook: 'CompleteRegistration', enabled: true },
      },
      webhooks: {
        enabled: [
          'orders/create',
          'orders/updated',
          'customers/create',
          'products/create',
        ],
      },
    };
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
}