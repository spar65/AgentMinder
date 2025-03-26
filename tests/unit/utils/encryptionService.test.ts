import fs from 'fs';
import path from 'path';
import { EncryptionService } from '../../../src/utils/encryptionService';

// Mock the fs module
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('EncryptionService', () => {
  // Use a temp file location for tests
  const testKeyPath = path.join(process.cwd(), '.test-encryption-key');
  let encryptionService: EncryptionService;
  
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(false);
  });
  
  it('should create a new encryption key if one does not exist', () => {
    encryptionService = new EncryptionService(testKeyPath);
    expect(fs.writeFileSync).toHaveBeenCalledWith(testKeyPath, expect.any(String));
  });
  
  it('should use an existing encryption key if one exists', () => {
    // Mock that the key file exists
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('0123456789abcdef0123456789abcdef');
    
    encryptionService = new EncryptionService(testKeyPath);
    
    expect(fs.readFileSync).toHaveBeenCalledWith(testKeyPath, 'utf8');
    expect(fs.writeFileSync).not.toHaveBeenCalled();
  });
  
  it('should encrypt and decrypt a string correctly', () => {
    encryptionService = new EncryptionService(testKeyPath);
    
    const originalText = 'This is a secret message';
    const encrypted = encryptionService.encrypt(originalText);
    
    // Encrypted string should be different from the original
    expect(encrypted).not.toBe(originalText);
    
    // Format should be iv:authTag:encryptedData
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);
    
    // Decryption should return the original text
    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(originalText);
  });
  
  it('should encrypt and decrypt an object correctly', () => {
    encryptionService = new EncryptionService(testKeyPath);
    
    const originalConfig = {
      GITHUB_TOKEN: 'github-token-123',
      API_KEY: 'api-key-456',
      DATABASE_URL: 'mongodb://localhost:27017/test'
    };
    
    const encrypted = encryptionService.encryptConfig(originalConfig);
    
    // Encrypted string should not contain any of the original values
    Object.values(originalConfig).forEach(value => {
      expect(encrypted).not.toContain(value);
    });
    
    // Decryption should return the original object
    const decrypted = encryptionService.decryptConfig(encrypted);
    expect(decrypted).toEqual(originalConfig);
  });
  
  it('should throw an error when decrypting invalid format', () => {
    encryptionService = new EncryptionService(testKeyPath);
    
    // Test with invalid format (missing parts)
    const invalidEncrypted = 'invalid-format';
    
    expect(() => {
      encryptionService.decrypt(invalidEncrypted);
    }).toThrow('Invalid encrypted text format');
  });
}); 