#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { generateEncryptedSecrets, AppSecrets } from '../config/secrets';
import encryptionService from '../utils/encryptionService';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Ask a question and get user input
 * @param question Question to ask
 * @returns Promise resolving to user input
 */
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Ask for a secret value, optionally masking the input
 * @param key Secret key name
 * @param defaultValue Optional default value
 * @returns Promise resolving to secret value
 */
async function askSecret(key: string, defaultValue?: string): Promise<string> {
  const defaultText = defaultValue ? ` (default: ${defaultValue.substring(0, 3)}...)` : '';
  const value = await askQuestion(`Enter ${key}${defaultText}: `);
  return value || defaultValue || '';
}

/**
 * Generate secrets configuration
 */
async function generateSecrets(): Promise<void> {
  console.log('Secret Manager - Generate Encrypted Secrets');
  console.log('------------------------------------------');
  
  const secrets: AppSecrets = {};
  
  console.log('Enter the secret values (press Enter to skip):');
  
  secrets.GITHUB_TOKEN = await askSecret('GITHUB_TOKEN');
  secrets.FIGMA_TOKEN = await askSecret('FIGMA_TOKEN');
  secrets.DATABASE_URL = await askSecret('DATABASE_URL');
  secrets.JWT_SECRET = await askSecret('JWT_SECRET');
  
  const addMoreSecrets = await askQuestion('Add more secrets? (y/n): ');
  if (addMoreSecrets.toLowerCase() === 'y') {
    let addingMore = true;
    while (addingMore) {
      const key = await askQuestion('Enter secret key: ');
      const value = await askSecret(key);
      
      if (key && value) {
        secrets[key] = value;
      }
      
      const continueAdding = await askQuestion('Add another secret? (y/n): ');
      addingMore = continueAdding.toLowerCase() === 'y';
    }
  }
  
  const encrypted = generateEncryptedSecrets(secrets);
  
  console.log('\nEncrypted secrets blob:');
  console.log('----------------------');
  console.log(encrypted);
  console.log('\nTo use these secrets, replace the encryptedSecrets value in src/config/secrets.ts');
  
  const saveToFile = await askQuestion('\nDo you want to automatically update the secrets file? (y/n): ');
  if (saveToFile.toLowerCase() === 'y') {
    try {
      const secretsFilePath = path.join(__dirname, '..', 'config', 'secrets.ts');
      let secretsFileContent = fs.readFileSync(secretsFilePath, 'utf8');
      
      // Replace the encrypted secrets placeholder
      secretsFileContent = secretsFileContent.replace(
        /const encryptedSecrets = '[^']*';/,
        `const encryptedSecrets = '${encrypted}';`
      );
      
      fs.writeFileSync(secretsFilePath, secretsFileContent);
      console.log('Secrets file updated successfully!');
    } catch (error) {
      console.error('Failed to update secrets file:', error);
    }
  }
  
  rl.close();
}

/**
 * Decrypt and display existing secrets
 */
async function decryptSecrets(): Promise<void> {
  console.log('Secret Manager - View Decrypted Secrets');
  console.log('--------------------------------------');
  
  try {
    const secretsFilePath = path.join(__dirname, '..', 'config', 'secrets.ts');
    const secretsFileContent = fs.readFileSync(secretsFilePath, 'utf8');
    
    // Extract the encrypted secrets string
    const match = secretsFileContent.match(/const encryptedSecrets = '([^']*)';/);
    if (!match || !match[1] || match[1] === 'REPLACE_WITH_ENCRYPTED_BLOB') {
      console.log('No encrypted secrets found in the secrets file.');
      rl.close();
      return;
    }
    
    const encrypted = match[1];
    const decrypted = encryptionService.decryptConfig(encrypted);
    
    console.log('Decrypted secrets:');
    console.log('------------------');
    Object.entries(decrypted).forEach(([key, value]) => {
      // Only show first 5 characters of the value
      const displayValue = value ? `${value.substring(0, 5)}...` : '';
      console.log(`${key}: ${displayValue}`);
    });
  } catch (error) {
    console.error('Failed to decrypt secrets:', error);
  }
  
  rl.close();
}

async function main(): Promise<void> {
  console.log('AgentMinder Secret Manager');
  console.log('=========================');
  console.log('1. Generate new encrypted secrets');
  console.log('2. View existing secrets');
  
  const choice = await askQuestion('\nSelect an option (1-2): ');
  
  switch (choice) {
    case '1':
      await generateSecrets();
      break;
    case '2':
      await decryptSecrets();
      break;
    default:
      console.log('Invalid option selected.');
      rl.close();
  }
}

// Run the script
main().catch(console.error); 