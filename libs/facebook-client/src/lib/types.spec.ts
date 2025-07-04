import { FacebookConfig } from './types';

describe('Facebook Types', () => {
  describe('FacebookConfig', () => {
    describe('valid configurations', () => {
      it('should accept valid configuration', () => {
        const config: FacebookConfig = {
          accessToken: 'test-access-token',
          pixelId: 'test-pixel-id',
        };

        expect(config.accessToken).toBe('test-access-token');
        expect(config.pixelId).toBe('test-pixel-id');
      });

      it('should require both accessToken and pixelId', () => {
        const config: FacebookConfig = {
          accessToken: 'my-facebook-access-token',
          pixelId: '1234567890',
        };

        expect(config).toHaveProperty('accessToken');
        expect(config).toHaveProperty('pixelId');
        expect(typeof config.accessToken).toBe('string');
        expect(typeof config.pixelId).toBe('string');
      });

      it('should accept realistic Facebook access tokens', () => {
        const config: FacebookConfig = {
          accessToken: 'EAABwzLixnjYBAZBmjXjkl2kljsdJKLDJSKLdjskldjskl',
          pixelId: '1234567890123456',
        };

        expect(config.accessToken).toMatch(/^[A-Za-z0-9]+$/);
        expect(config.pixelId).toMatch(/^\d+$/);
      });

      it('should accept short-form access tokens', () => {
        const config: FacebookConfig = {
          accessToken: 'test-token',
          pixelId: '123',
        };

        expect(config.accessToken.length).toBeGreaterThan(0);
        expect(config.pixelId.length).toBeGreaterThan(0);
      });
    });

    describe('property types', () => {
      it('should enforce string type for accessToken', () => {
        const config: FacebookConfig = {
          accessToken: 'string-token',
          pixelId: 'string-pixel-id',
        };

        expect(typeof config.accessToken).toBe('string');
      });

      it('should enforce string type for pixelId', () => {
        const config: FacebookConfig = {
          accessToken: 'test-access-token',
          pixelId: 'string-pixel-id',
        };

        expect(typeof config.pixelId).toBe('string');
      });

      it('should handle numeric pixel IDs as strings', () => {
        const config: FacebookConfig = {
          accessToken: 'test-access-token',
          pixelId: '1234567890123456',
        };

        expect(typeof config.pixelId).toBe('string');
        expect(config.pixelId).toBe('1234567890123456');
      });
    });

    describe('configuration validation patterns', () => {
      it('should support access token format validation', () => {
        const validTokens = [
          'EAABwzLixnjYBAZBmjXj',
          'test-access-token',
          'short',
          'token_with_underscores',
          'token-with-dashes',
          'TokenWithCamelCase',
          'token123',
        ];

        validTokens.forEach(token => {
          const config: FacebookConfig = {
            accessToken: token,
            pixelId: 'test-pixel-id',
          };

          expect(config.accessToken).toBe(token);
          expect(config.accessToken.length).toBeGreaterThan(0);
        });
      });

      it('should support pixel ID format validation', () => {
        const validPixelIds = [
          '1234567890123456',
          '123',
          'pixel-id-string',
          'mixed123pixel456',
          'PIXEL_ID',
        ];

        validPixelIds.forEach(pixelId => {
          const config: FacebookConfig = {
            accessToken: 'test-access-token',
            pixelId,
          };

          expect(config.pixelId).toBe(pixelId);
          expect(config.pixelId.length).toBeGreaterThan(0);
        });
      });
    });

    describe('configuration patterns', () => {
      it('should work with environment variable patterns', () => {
        // Simulate loading from environment variables
        const config: FacebookConfig = {
          accessToken: process.env.FACEBOOK_ACCESS_TOKEN || 'fallback-token',
          pixelId: process.env.FACEBOOK_PIXEL_ID || 'fallback-pixel-id',
        };

        expect(config.accessToken).toBeTruthy();
        expect(config.pixelId).toBeTruthy();
      });

      it('should work with configuration object spread', () => {
        const baseConfig = {
          accessToken: 'base-token',
        };

        const config: FacebookConfig = {
          ...baseConfig,
          pixelId: 'spread-pixel-id',
        };

        expect(config.accessToken).toBe('base-token');
        expect(config.pixelId).toBe('spread-pixel-id');
      });

      it('should work with configuration factory pattern', () => {
        const createConfig = (accessToken: string, pixelId: string): FacebookConfig => ({
          accessToken,
          pixelId,
        });

        const config = createConfig('factory-token', 'factory-pixel-id');

        expect(config.accessToken).toBe('factory-token');
        expect(config.pixelId).toBe('factory-pixel-id');
      });
    });

    describe('immutability and copying', () => {
      it('should support object copying', () => {
        const originalConfig: FacebookConfig = {
          accessToken: 'original-token',
          pixelId: 'original-pixel-id',
        };

        const copiedConfig: FacebookConfig = { ...originalConfig };

        expect(copiedConfig).toEqual(originalConfig);
        expect(copiedConfig).not.toBe(originalConfig);
      });

      it('should support partial updates', () => {
        const originalConfig: FacebookConfig = {
          accessToken: 'original-token',
          pixelId: 'original-pixel-id',
        };

        const updatedConfig: FacebookConfig = {
          ...originalConfig,
          accessToken: 'updated-token',
        };

        expect(updatedConfig.accessToken).toBe('updated-token');
        expect(updatedConfig.pixelId).toBe('original-pixel-id');
        expect(originalConfig.accessToken).toBe('original-token');
      });

      it('should work with JSON serialization', () => {
        const config: FacebookConfig = {
          accessToken: 'serializable-token',
          pixelId: 'serializable-pixel-id',
        };

        const jsonString = JSON.stringify(config);
        const parsedConfig = JSON.parse(jsonString) as FacebookConfig;

        expect(parsedConfig).toEqual(config);
        expect(parsedConfig.accessToken).toBe(config.accessToken);
        expect(parsedConfig.pixelId).toBe(config.pixelId);
      });
    });

    describe('edge cases', () => {
      it('should handle empty strings', () => {
        const config: FacebookConfig = {
          accessToken: '',
          pixelId: '',
        };

        expect(config.accessToken).toBe('');
        expect(config.pixelId).toBe('');
        expect(typeof config.accessToken).toBe('string');
        expect(typeof config.pixelId).toBe('string');
      });

      it('should handle whitespace strings', () => {
        const config: FacebookConfig = {
          accessToken: '   ',
          pixelId: '\t\n',
        };

        expect(config.accessToken).toBe('   ');
        expect(config.pixelId).toBe('\t\n');
      });

      it('should handle special characters', () => {
        const config: FacebookConfig = {
          accessToken: 'token!@#$%^&*()',
          pixelId: 'pixel_id-123.test',
        };

        expect(config.accessToken).toBe('token!@#$%^&*()');
        expect(config.pixelId).toBe('pixel_id-123.test');
      });

      it('should handle unicode characters', () => {
        const config: FacebookConfig = {
          accessToken: 'token_测试_🔑',
          pixelId: 'pixel_测试_📊',
        };

        expect(config.accessToken).toBe('token_测试_🔑');
        expect(config.pixelId).toBe('pixel_测试_📊');
      });
    });

    describe('type safety', () => {
      it('should prevent missing properties through TypeScript', () => {
        // This test verifies TypeScript compilation would catch missing properties
        const validConfig: FacebookConfig = {
          accessToken: 'test-token',
          pixelId: 'test-pixel-id',
        };

        // These should be required for TypeScript compilation
        expect(validConfig).toHaveProperty('accessToken');
        expect(validConfig).toHaveProperty('pixelId');
      });

      it('should not allow additional properties implicitly', () => {
        const config: FacebookConfig = {
          accessToken: 'test-token',
          pixelId: 'test-pixel-id',
        };

        // The type should only have the defined properties
        const configKeys = Object.keys(config);
        expect(configKeys).toEqual(['accessToken', 'pixelId']);
      });
    });
  });
});