import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

/**
 * Service for encrypting and decrypting sensitive information
 * This allows storing encrypted values in the repository
 */
export class EncryptionService {
  private algorithm = 'aes-256-gcm';
  private encryptionKey: Buffer;
  private keyFileLocation: string;

  /**
   * Initialize the encryption service with a key
   * @param keyFileLocation Optional path to store the encryption key
   */
  constructor(keyFileLocation?: string) {
    this.keyFileLocation = keyFileLocation || path.join(process.cwd(), '.encryption-key');
    this.encryptionKey = this.getOrCreateKey();
  }

  /**
   * Get existing encryption key or create a new one
   * @returns Buffer containing the encryption key
   */
  private getOrCreateKey(): Buffer {
    try {
      if (fs.existsSync(this.keyFileLocation)) {
        return Buffer.from(fs.readFileSync(this.keyFileLocation, 'utf8'), 'hex');
      }
    } catch (error) {
      console.warn('Could not read encryption key:', error);
    }

    // Create a new key if one doesn't exist
    const newKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(this.keyFileLocation, newKey.toString('hex'));
    } catch (error) {
      console.error('Could not save encryption key:', error);
    }

    return newKey;
  }

  /**
   * Encrypt a string value
   * @param text Plain text to encrypt
   * @returns Encrypted string (format: iv:authTag:encryptedData)
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag().toString('hex');
    
    // Format: iv:authTag:encryptedData
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   * @param encryptedText Encrypted text (format: iv:authTag:encryptedData)
   * @returns Decrypted plain text
   */
  decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encryptedData = parts[2];
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Encrypt a configuration object
   * @param config Object containing configuration values
   * @returns Encrypted configuration string
   */
  encryptConfig(config: Record<string, string>): string {
    return this.encrypt(JSON.stringify(config));
  }

  /**
   * Decrypt a configuration object
   * @param encryptedConfig Encrypted configuration string
   * @returns Decrypted configuration object
   */
  decryptConfig(encryptedConfig: string): Record<string, string> {
    return JSON.parse(this.decrypt(encryptedConfig));
  }
}

export default new EncryptionService(); 