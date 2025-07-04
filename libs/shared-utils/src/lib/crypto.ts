import * as crypto from 'crypto';

/**
 * Utility class for cryptographic operations
 */
export class CryptoUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits
  private static readonly SALT_LENGTH = 32; // 256 bits
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly ITERATIONS = 100000;
  private static readonly DIGEST = 'sha256';

  /**
   * Derives a key from a password using scrypt
   */
  private static deriveKey(password: string): Buffer {
    // Using scrypt with a fixed salt for consistency with original implementation
    // In production, consider using a random salt stored with the encrypted data
    return crypto.scryptSync(password, 'salt', this.KEY_LENGTH);
  }

  /**
   * Encrypts text using AES-256-GCM
   * @param text The text to encrypt
   * @param password The password to use for encryption
   * @returns The encrypted text in format: iv:authTag:encryptedData (all hex encoded)
   */
  static encrypt(text: string, password: string): string {
    // Generate random IV
    const iv = crypto.randomBytes(this.IV_LENGTH);
    
    // Derive key from password
    const key = this.deriveKey(password);
    
    // Create cipher
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    
    // Set AAD (Additional Authenticated Data)
    const aad = Buffer.from('eventabee', 'utf8');
    cipher.setAAD(aad);
    
    // Encrypt the text
    const encrypted = Buffer.concat([
      cipher.update(text, 'utf8'),
      cipher.final()
    ]);
    
    // Get the authentication tag
    const authTag = cipher.getAuthTag();
    
    // Combine iv, authTag, and encrypted data
    // Format: iv:authTag:encryptedData (all hex encoded)
    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted.toString('hex')
    ].join(':');
  }

  /**
   * Decrypts text encrypted with encrypt()
   * @param encryptedText The encrypted text in format: iv:authTag:encryptedData
   * @param password The password used for encryption
   * @returns The decrypted text
   */
  static decrypt(encryptedText: string, password: string): string {
    // Parse the encrypted text
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, encryptedHex] = parts;
    
    // Validate hex strings (encryptedHex can be empty for empty input)
    if (!ivHex || !authTagHex || encryptedHex === undefined) {
      throw new Error('Invalid encrypted data format');
    }

    let iv: Buffer;
    let authTag: Buffer;
    let encrypted: Buffer;

    try {
      iv = Buffer.from(ivHex, 'hex');
      authTag = Buffer.from(authTagHex, 'hex');
      encrypted = Buffer.from(encryptedHex, 'hex');
    } catch {
      throw new Error('Invalid encrypted data format');
    }

    // Validate buffer lengths
    if (iv.length !== this.IV_LENGTH || authTag.length !== this.TAG_LENGTH) {
      throw new Error('Invalid encrypted data format');
    }

    // Derive key from password (must match encryption)
    const key = this.deriveKey(password);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    
    // Set the authentication tag
    decipher.setAuthTag(authTag);
    
    // Set AAD (must match what was used during encryption)
    const aad = Buffer.from('eventabee', 'utf8');
    decipher.setAAD(aad);
    
    try {
      // Decrypt the data
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);
      
      return decrypted.toString('utf8');
    } catch {
      // This typically happens with wrong password or corrupted data
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generates a SHA256 hash of the given data
   * @param data The data to hash
   * @returns The hash as a lowercase hex string
   */
  static hash(data: string): string {
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Generates an HMAC-SHA256 of the given data
   * @param data The data to sign
   * @param secret The secret key
   * @returns The HMAC as a lowercase hex string
   */
  static hmac(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
  }

  /**
   * Verifies a Shopify webhook signature
   * @param data The webhook body
   * @param hmacHeader The HMAC header value from Shopify
   * @param secret The webhook secret
   * @returns True if the signature is valid
   */
  static verifyShopifyWebhook(data: string, hmacHeader: string, secret: string): boolean {
    const expectedHmac = crypto
      .createHmac('sha256', secret)
      .update(data, 'utf8')
      .digest('base64');
    
    // Convert both to buffers for timing-safe comparison
    const expectedBuffer = Buffer.from(expectedHmac);
    const receivedBuffer = Buffer.from(hmacHeader);
    
    // Use timing-safe comparison to prevent timing attacks
    if (expectedBuffer.length !== receivedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
  }
}