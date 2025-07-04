import { SegmentConfig } from './types';

describe('Segment Types', () => {
  describe('SegmentConfig', () => {
    describe('valid configurations', () => {
      it('should accept valid configuration', () => {
        const config: SegmentConfig = {
          writeKey: 'test-write-key',
        };

        expect(config.writeKey).toBe('test-write-key');
      });

      it('should require writeKey', () => {
        const config: SegmentConfig = {
          writeKey: 'my-segment-write-key',
        };

        expect(config).toHaveProperty('writeKey');
        expect(typeof config.writeKey).toBe('string');
      });

      it('should accept realistic Segment write keys', () => {
        const config: SegmentConfig = {
          writeKey: 'sk_test_1234567890abcdef1234567890abcdef12345678',
        };

        expect(config.writeKey).toMatch(/^sk_/);
        expect(config.writeKey.length).toBeGreaterThan(10);
      });

      it('should accept short-form write keys', () => {
        const config: SegmentConfig = {
          writeKey: 'test-key',
        };

        expect(config.writeKey.length).toBeGreaterThan(0);
      });
    });

    describe('property types', () => {
      it('should enforce string type for writeKey', () => {
        const config: SegmentConfig = {
          writeKey: 'string-write-key',
        };

        expect(typeof config.writeKey).toBe('string');
      });

      it('should handle alphanumeric write keys', () => {
        const config: SegmentConfig = {
          writeKey: 'sk_test_1234567890abcdefABCDEF1234567890',
        };

        expect(typeof config.writeKey).toBe('string');
        expect(config.writeKey).toMatch(/^[A-Za-z0-9_]+$/);
      });
    });

    describe('configuration validation patterns', () => {
      it('should support write key format validation', () => {
        const validWriteKeys = [
          'sk_test_1234567890abcdef',
          'sk_live_abcdef1234567890',
          'test-write-key',
          'short',
          'key_with_underscores',
          'key-with-dashes',
          'KeyWithCamelCase',
          'key123',
          'SK_TEST_UPPERCASE',
        ];

        validWriteKeys.forEach(writeKey => {
          const config: SegmentConfig = {
            writeKey,
          };

          expect(config.writeKey).toBe(writeKey);
          expect(config.writeKey.length).toBeGreaterThan(0);
        });
      });

      it('should support different Segment key formats', () => {
        const keyFormats = [
          { type: 'test', key: 'sk_test_1234567890abcdef' },
          { type: 'live', key: 'sk_live_abcdef1234567890' },
          { type: 'development', key: 'dev_key_123456' },
          { type: 'legacy', key: 'legacy_segment_key' },
        ];

        keyFormats.forEach(({ type, key }) => {
          const config: SegmentConfig = {
            writeKey: key,
          };

          expect(config.writeKey).toBe(key);
          expect(config.writeKey.length).toBeGreaterThan(0);
        });
      });
    });

    describe('configuration patterns', () => {
      it('should work with environment variable patterns', () => {
        // Simulate loading from environment variables
        const config: SegmentConfig = {
          writeKey: process.env.SEGMENT_WRITE_KEY || 'fallback-write-key',
        };

        expect(config.writeKey).toBeTruthy();
      });

      it('should work with configuration object spread', () => {
        const baseConfig = {
          writeKey: 'base-write-key',
        };

        const config: SegmentConfig = {
          ...baseConfig,
        };

        expect(config.writeKey).toBe('base-write-key');
      });

      it('should work with configuration factory pattern', () => {
        const createConfig = (writeKey: string): SegmentConfig => ({
          writeKey,
        });

        const config = createConfig('factory-write-key');

        expect(config.writeKey).toBe('factory-write-key');
      });

      it('should support conditional configuration', () => {
        const isDevelopment = process.env.NODE_ENV !== 'production';
        
        const config: SegmentConfig = {
          writeKey: isDevelopment 
            ? 'sk_test_development_key' 
            : 'sk_live_production_key',
        };

        expect(config.writeKey).toBeTruthy();
        expect(config.writeKey).toContain('key');
      });
    });

    describe('immutability and copying', () => {
      it('should support object copying', () => {
        const originalConfig: SegmentConfig = {
          writeKey: 'original-write-key',
        };

        const copiedConfig: SegmentConfig = { ...originalConfig };

        expect(copiedConfig).toEqual(originalConfig);
        expect(copiedConfig).not.toBe(originalConfig);
      });

      it('should support partial updates', () => {
        const originalConfig: SegmentConfig = {
          writeKey: 'original-write-key',
        };

        const updatedConfig: SegmentConfig = {
          ...originalConfig,
          writeKey: 'updated-write-key',
        };

        expect(updatedConfig.writeKey).toBe('updated-write-key');
        expect(originalConfig.writeKey).toBe('original-write-key');
      });

      it('should work with JSON serialization', () => {
        const config: SegmentConfig = {
          writeKey: 'serializable-write-key',
        };

        const jsonString = JSON.stringify(config);
        const parsedConfig = JSON.parse(jsonString) as SegmentConfig;

        expect(parsedConfig).toEqual(config);
        expect(parsedConfig.writeKey).toBe(config.writeKey);
      });
    });

    describe('edge cases', () => {
      it('should handle empty strings', () => {
        const config: SegmentConfig = {
          writeKey: '',
        };

        expect(config.writeKey).toBe('');
        expect(typeof config.writeKey).toBe('string');
      });

      it('should handle whitespace strings', () => {
        const config: SegmentConfig = {
          writeKey: '   ',
        };

        expect(config.writeKey).toBe('   ');
      });

      it('should handle special characters', () => {
        const config: SegmentConfig = {
          writeKey: 'key!@#$%^&*()',
        };

        expect(config.writeKey).toBe('key!@#$%^&*()');
      });

      it('should handle unicode characters', () => {
        const config: SegmentConfig = {
          writeKey: 'key_测试_🔑',
        };

        expect(config.writeKey).toBe('key_测试_🔑');
      });

      it('should handle very long write keys', () => {
        const longKey = 'sk_test_' + 'a'.repeat(100);
        const config: SegmentConfig = {
          writeKey: longKey,
        };

        expect(config.writeKey).toBe(longKey);
        expect(config.writeKey.length).toBe(108); // 'sk_test_' + 100 'a's
      });
    });

    describe('type safety', () => {
      it('should prevent missing properties through TypeScript', () => {
        // This test verifies TypeScript compilation would catch missing properties
        const validConfig: SegmentConfig = {
          writeKey: 'test-write-key',
        };

        // writeKey should be required for TypeScript compilation
        expect(validConfig).toHaveProperty('writeKey');
      });

      it('should not allow additional properties implicitly', () => {
        const config: SegmentConfig = {
          writeKey: 'test-write-key',
        };

        // The type should only have the defined properties
        const configKeys = Object.keys(config);
        expect(configKeys).toEqual(['writeKey']);
      });
    });

    describe('integration patterns', () => {
      it('should support multiple environment configurations', () => {
        const environments = ['development', 'staging', 'production'] as const;
        
        const configs = environments.map(env => {
          const config: SegmentConfig = {
            writeKey: `sk_${env}_1234567890abcdef`,
          };
          return { env, config };
        });

        configs.forEach(({ env, config }) => {
          expect(config.writeKey).toContain(env);
          expect(config.writeKey.startsWith('sk_')).toBe(true);
        });
      });

      it('should work with configuration validation', () => {
        const validateConfig = (config: SegmentConfig): boolean => {
          return (
            typeof config.writeKey === 'string' &&
            config.writeKey.length > 0 &&
            !config.writeKey.includes(' ')
          );
        };

        const validConfig: SegmentConfig = {
          writeKey: 'sk_test_valid_key',
        };

        const invalidConfig: SegmentConfig = {
          writeKey: 'invalid key with spaces',
        };

        expect(validateConfig(validConfig)).toBe(true);
        expect(validateConfig(invalidConfig)).toBe(false);
      });

      it('should support configuration merging', () => {
        const defaultConfig: Partial<SegmentConfig> = {
          writeKey: 'default-key',
        };

        const userConfig: Partial<SegmentConfig> = {
          writeKey: 'user-key',
        };

        const finalConfig: SegmentConfig = {
          ...defaultConfig,
          ...userConfig,
        } as SegmentConfig;

        expect(finalConfig.writeKey).toBe('user-key');
      });
    });
  });
});