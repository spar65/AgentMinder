import encryptionService from '../utils/encryptionService';

// This is the encrypted configuration blob
// Replace this with your own encrypted configuration 
// generated using the EncryptionService.encryptConfig method
const encryptedSecrets = 'REPLACE_WITH_ENCRYPTED_BLOB';

/**
 * Interface defining all available secrets in the application
 */
export interface AppSecrets {
  GITHUB_TOKEN?: string;
  FIGMA_TOKEN?: string;
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  API_KEYS?: Record<string, string>;
  [key: string]: any;
}

/**
 * Get application secrets
 * @returns Object containing all application secrets
 */
export function getSecrets(): AppSecrets {
  try {
    return encryptionService.decryptConfig(encryptedSecrets);
  } catch (error) {
    console.error('Failed to decrypt secrets:', error);
    return {};
  }
}

/**
 * Get a specific secret by key
 * @param key Secret key to retrieve
 * @returns Secret value or undefined if not found
 */
export function getSecret(key: keyof AppSecrets): any {
  const secrets = getSecrets();
  return secrets[key];
}

/**
 * Generate a new encrypted secret blob
 * This is a utility function to be used during development
 * to create a new encrypted configuration when secrets change
 * 
 * @param secrets Object containing secret key-value pairs
 * @returns Encrypted string to be stored in this file
 */
export function generateEncryptedSecrets(secrets: AppSecrets): string {
  return encryptionService.encryptConfig(secrets as Record<string, string>);
}

// Export a default secrets object for convenience
export default {
  get: getSecret,
  getAll: getSecrets,
  generate: generateEncryptedSecrets
}; 