import fs from 'fs';
import path from 'path';
import encryptionService from './encryptionService';

// Patterns to identify common sensitive data
const SENSITIVE_PATTERNS = [
  {
    name: 'GitHub Token',
    regex: /github_pat_[a-zA-Z0-9_]{22,}/g,
    placeholder: 'ENCRYPTED_GITHUB_TOKEN'
  },
  {
    name: 'Figma Token',
    regex: /figd_[a-zA-Z0-9_-]{40,}/g,
    placeholder: 'ENCRYPTED_FIGMA_TOKEN'
  },
  {
    name: 'AWS Key',
    regex: /AKIA[0-9A-Z]{16}/g,
    placeholder: 'ENCRYPTED_AWS_KEY'
  },
  {
    name: 'Generic API Key',
    regex: /["']?api[_-]?key["']?\s*[:=]\s*["']([a-zA-Z0-9]{16,})["']/gi,
    placeholder: 'ENCRYPTED_API_KEY'
  },
  {
    name: 'MongoDB Connection String',
    regex: /mongodb(\+srv)?:\/\/[a-zA-Z0-9-_.]+:[a-zA-Z0-9-_.]+@[a-zA-Z0-9-.]+/g,
    placeholder: 'ENCRYPTED_MONGODB_URI'
  }
];

/**
 * Scan a file for sensitive data and replace with encrypted versions
 * @param filePath Path to the file to scan
 * @param sensitivePatterns Patterns to look for (defaults to built-in patterns)
 * @returns Object containing encryptions mapping, replacements made, and file status
 */
export function scanAndEncryptFile(
  filePath: string,
  sensitivePatterns = SENSITIVE_PATTERNS
): { encrypted: Record<string, string>, replacementsCount: number, fileUpdated: boolean } {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return { encrypted: {}, replacementsCount: 0, fileUpdated: false };
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  const encrypted: Record<string, string> = {};
  let replacementsCount = 0;
  
  // Find and encrypt all sensitive data
  for (const pattern of sensitivePatterns) {
    let match;
    const regex = pattern.regex;
    
    while ((match = regex.exec(content)) !== null) {
      const sensitiveValue = match[0];
      
      // Skip if we've already encrypted this value
      if (encrypted[sensitiveValue]) {
        continue;
      }
      
      // Encrypt the sensitive data
      const encryptedValue = encryptionService.encrypt(sensitiveValue);
      encrypted[sensitiveValue] = encryptedValue;
      
      // Replace in content (format: PLACEHOLDER:ENCRYPTED_VALUE)
      const replacement = `${pattern.placeholder}:${encryptedValue}`;
      content = content.replace(sensitiveValue, replacement);
      replacementsCount++;
    }
  }
  
  // Save the updated content if changes were made
  if (replacementsCount > 0 && content !== originalContent) {
    fs.writeFileSync(filePath, content);
    return { encrypted, replacementsCount, fileUpdated: true };
  }
  
  return { encrypted, replacementsCount, fileUpdated: false };
}

/**
 * Decrypt placeholders in a file back to original values
 * @param filePath Path to the file to decrypt
 * @returns Number of decryptions made
 */
export function decryptFile(filePath: string): number {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return 0;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let decryptionCount = 0;
  
  // Find all placeholders with encrypted values
  for (const pattern of SENSITIVE_PATTERNS) {
    const placeholderRegex = new RegExp(`${pattern.placeholder}:([a-zA-Z0-9:]+)`, 'g');
    let match;
    
    while ((match = placeholderRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      const encryptedValue = match[1];
      
      try {
        // Decrypt the value
        const decryptedValue = encryptionService.decrypt(encryptedValue);
        
        // Replace the placeholder with the original value
        content = content.replace(fullMatch, decryptedValue);
        decryptionCount++;
      } catch (error) {
        console.error(`Failed to decrypt value: ${error}`);
      }
    }
  }
  
  // Save the updated content if changes were made
  if (decryptionCount > 0 && content !== originalContent) {
    fs.writeFileSync(filePath, content);
  }
  
  return decryptionCount;
}

/**
 * Scan a directory recursively for files that might contain sensitive data
 * @param dir Directory to scan
 * @param fileTypes File extensions to check (defaults to common text files)
 * @returns Array of files with sensitive data
 */
export function scanDirectory(
  dir: string,
  fileTypes = ['.md', '.txt', '.js', '.ts', '.json', '.yml', '.yaml', '.env']
): { file: string, sensitivesFound: number }[] {
  const results: { file: string, sensitivesFound: number }[] = [];
  
  // Function to scan a file and record results
  const scanFile = (filePath: string) => {
    try {
      const { replacementsCount } = scanAndEncryptFile(filePath);
      
      if (replacementsCount > 0) {
        results.push({ file: filePath, sensitivesFound: replacementsCount });
      }
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error);
    }
  };
  
  // Function to walk directory recursively
  const walkDir = (currentDir: string) => {
    const files = fs.readdirSync(currentDir);
    
    for (const file of files) {
      const filePath = path.join(currentDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and .git directories
        if (file !== 'node_modules' && file !== '.git') {
          walkDir(filePath);
        }
      } else if (fileTypes.some(ext => file.endsWith(ext))) {
        scanFile(filePath);
      }
    }
  };
  
  walkDir(dir);
  return results;
}

export default {
  scanAndEncryptFile,
  decryptFile,
  scanDirectory,
  SENSITIVE_PATTERNS
}; 