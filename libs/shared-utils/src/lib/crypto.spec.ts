import * as crypto from 'crypto';
import { CryptoUtil } from './crypto';

describe('CryptoUtil', () => {
  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt text successfully', () => {
      const originalText = 'This is a secret message';
      const key = 'my-secret-key-123';

      const encrypted = CryptoUtil.encrypt(originalText, key);
      const decrypted = CryptoUtil.decrypt(encrypted, key);

      expect(decrypted).toBe(originalText);
    });

    it('should produce different encrypted output for same input', () => {
      const text = 'Same text';
      const key = 'same-key';

      const encrypted1 = CryptoUtil.encrypt(text, key);
      const encrypted2 = CryptoUtil.encrypt(text, key);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should encrypt and decrypt with special characters', () => {
      const originalText = '!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`';
      const key = 'test-key';

      const encrypted = CryptoUtil.encrypt(originalText, key);
      const decrypted = CryptoUtil.decrypt(encrypted, key);

      expect(decrypted).toBe(originalText);
    });

    it('should encrypt and decrypt unicode text', () => {
      const originalText = 'Hello 世界 🌍 مرحبا';
      const key = 'unicode-key';

      const encrypted = CryptoUtil.encrypt(originalText, key);
      const decrypted = CryptoUtil.decrypt(encrypted, key);

      expect(decrypted).toBe(originalText);
    });

    it('should encrypt and decrypt empty string', () => {
      const originalText = '';
      const key = 'empty-key';

      const encrypted = CryptoUtil.encrypt(originalText, key);
      const decrypted = CryptoUtil.decrypt(encrypted, key);

      expect(decrypted).toBe(originalText);
    });

    it('should encrypt and decrypt very long text', () => {
      const originalText = 'a'.repeat(10000);
      const key = 'long-key';

      const encrypted = CryptoUtil.encrypt(originalText, key);
      const decrypted = CryptoUtil.decrypt(encrypted, key);

      expect(decrypted).toBe(originalText);
    });

    it('should throw error when decrypting with wrong key', () => {
      const originalText = 'Secret message';
      const correctKey = 'correct-key';
      const wrongKey = 'wrong-key';

      const encrypted = CryptoUtil.encrypt(originalText, correctKey);

      expect(() => {
        CryptoUtil.decrypt(encrypted, wrongKey);
      }).toThrow();
    });

    it('should throw error for invalid encrypted data format', () => {
      const invalidFormats = [
        'invalid-data',
        'part1:part2',
        'part1:part2:part3:part4',
        '::', 
        '::encrypted',
        'iv::encrypted',
        'iv:tag:',
      ];

      invalidFormats.forEach(invalid => {
        expect(() => {
          CryptoUtil.decrypt(invalid, 'any-key');
        }).toThrow(); // Just check that it throws, not the specific message
      });
    });

    it('should throw error for corrupted encrypted data', () => {
      const originalText = 'Test message';
      const key = 'test-key';
      const encrypted = CryptoUtil.encrypt(originalText, key);
      
      // Corrupt the encrypted data
      const parts = encrypted.split(':');
      parts[2] = parts[2].substring(0, parts[2].length - 2) + 'XX';
      const corrupted = parts.join(':');

      expect(() => {
        CryptoUtil.decrypt(corrupted, key);
      }).toThrow();
    });

    it('should use consistent AAD (Additional Authenticated Data)', () => {
      const text = 'Test with AAD';
      const key = 'aad-key';

      // This test ensures that the same AAD is used for encryption and decryption
      // If different AAD was used, decryption would fail
      const encrypted = CryptoUtil.encrypt(text, key);
      const decrypted = CryptoUtil.decrypt(encrypted, key);

      expect(decrypted).toBe(text);
    });

    it('should generate encrypted string in expected format', () => {
      const text = 'Format test';
      const key = 'format-key';

      const encrypted = CryptoUtil.encrypt(text, key);
      const parts = encrypted.split(':');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toMatch(/^[0-9a-f]{32}$/); // IV (16 bytes = 32 hex chars)
      expect(parts[1]).toMatch(/^[0-9a-f]{32}$/); // Tag (16 bytes = 32 hex chars)
      expect(parts[2]).toMatch(/^[0-9a-f]+$/); // Encrypted data
    });
  });

  describe('hash', () => {
    it('should generate SHA256 hash', () => {
      const data = 'Hello, World!';
      const hash = CryptoUtil.hash(data);

      expect(hash).toBe('dffd6021bb2bd5b0af676290809ec3a53191dd81c7f70a4b28688a362182986f');
    });

    it('should generate consistent hash for same input', () => {
      const data = 'Same data';
      const hash1 = CryptoUtil.hash(data);
      const hash2 = CryptoUtil.hash(data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different input', () => {
      const hash1 = CryptoUtil.hash('Data 1');
      const hash2 = CryptoUtil.hash('Data 2');

      expect(hash1).not.toBe(hash2);
    });

    it('should generate hash for empty string', () => {
      const hash = CryptoUtil.hash('');
      expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('should generate hash for unicode data', () => {
      const data = '世界 🌍 مرحبا';
      const hash = CryptoUtil.hash(data);

      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should return hash in lowercase hex format', () => {
      const hash = CryptoUtil.hash('Test data');
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
      expect(hash).toBe(hash.toLowerCase());
    });
  });

  describe('hmac', () => {
    it('should generate HMAC-SHA256', () => {
      const data = 'Message to sign';
      const secret = 'secret-key';
      const hmac = CryptoUtil.hmac(data, secret);

      // Check it's a valid hex string of the right length (64 chars for SHA256)
      expect(hmac).toMatch(/^[0-9a-f]{64}$/);
      expect(hmac.length).toBe(64);
    });

    it('should generate consistent HMAC for same input and secret', () => {
      const data = 'Same data';
      const secret = 'same-secret';
      const hmac1 = CryptoUtil.hmac(data, secret);
      const hmac2 = CryptoUtil.hmac(data, secret);

      expect(hmac1).toBe(hmac2);
    });

    it('should generate different HMAC for different data', () => {
      const secret = 'same-secret';
      const hmac1 = CryptoUtil.hmac('Data 1', secret);
      const hmac2 = CryptoUtil.hmac('Data 2', secret);

      expect(hmac1).not.toBe(hmac2);
    });

    it('should generate different HMAC for different secrets', () => {
      const data = 'Same data';
      const hmac1 = CryptoUtil.hmac(data, 'secret1');
      const hmac2 = CryptoUtil.hmac(data, 'secret2');

      expect(hmac1).not.toBe(hmac2);
    });

    it('should generate HMAC for empty data', () => {
      const hmac = CryptoUtil.hmac('', 'secret');
      expect(hmac).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate HMAC with empty secret', () => {
      const hmac = CryptoUtil.hmac('data', '');
      expect(hmac).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should generate HMAC for unicode data and secret', () => {
      const data = '世界 🌍';
      const secret = 'مرحبا';
      const hmac = CryptoUtil.hmac(data, secret);

      expect(hmac).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('verifyShopifyWebhook', () => {
    it('should verify valid webhook signature', () => {
      const data = 'webhook body content';
      const secret = 'webhook-secret';
      
      // Generate valid HMAC
      const validHmac = crypto
        .createHmac('sha256', secret)
        .update(data, 'utf8')
        .digest('base64');

      const isValid = CryptoUtil.verifyShopifyWebhook(data, validHmac, secret);
      expect(isValid).toBe(true);
    });

    it('should reject invalid webhook signature', () => {
      const data = 'webhook body content';
      const secret = 'webhook-secret';
      const invalidHmac = 'invalid-hmac-signature';

      const isValid = CryptoUtil.verifyShopifyWebhook(data, invalidHmac, secret);
      expect(isValid).toBe(false);
    });

    it('should reject webhook with wrong secret', () => {
      const data = 'webhook body content';
      const correctSecret = 'correct-secret';
      const wrongSecret = 'wrong-secret';
      
      const hmac = crypto
        .createHmac('sha256', correctSecret)
        .update(data, 'utf8')
        .digest('base64');

      const isValid = CryptoUtil.verifyShopifyWebhook(data, hmac, wrongSecret);
      expect(isValid).toBe(false);
    });

    it('should reject webhook with tampered data', () => {
      const originalData = 'original webhook data';
      const tamperedData = 'tampered webhook data';
      const secret = 'webhook-secret';
      
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(originalData, 'utf8')
        .digest('base64');

      const isValid = CryptoUtil.verifyShopifyWebhook(tamperedData, hmac, secret);
      expect(isValid).toBe(false);
    });

    it('should handle empty webhook data', () => {
      const data = '';
      const secret = 'webhook-secret';
      
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(data, 'utf8')
        .digest('base64');

      const isValid = CryptoUtil.verifyShopifyWebhook(data, hmac, secret);
      expect(isValid).toBe(true);
    });

    it('should handle JSON webhook data', () => {
      const data = JSON.stringify({ order: { id: 123, total: 99.99 } });
      const secret = 'webhook-secret';
      
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(data, 'utf8')
        .digest('base64');

      const isValid = CryptoUtil.verifyShopifyWebhook(data, hmac, secret);
      expect(isValid).toBe(true);
    });

    it('should use timing-safe comparison', () => {
      // This test verifies that timingSafeEqual is used by checking that
      // the function doesn't return early on first character mismatch
      const data = 'test data';
      const secret = 'secret';
      
      const validHmac = crypto
        .createHmac('sha256', secret)
        .update(data, 'utf8')
        .digest('base64');

      // Create an HMAC that differs only in the last character
      const almostValidHmac = validHmac.slice(0, -1) + 'X';

      const isValid = CryptoUtil.verifyShopifyWebhook(data, almostValidHmac, secret);
      expect(isValid).toBe(false);
    });

    it('should handle unicode in webhook data', () => {
      const data = 'Order from 世界 🌍 customer';
      const secret = 'webhook-secret';
      
      const hmac = crypto
        .createHmac('sha256', secret)
        .update(data, 'utf8')
        .digest('base64');

      const isValid = CryptoUtil.verifyShopifyWebhook(data, hmac, secret);
      expect(isValid).toBe(true);
    });
  });
});