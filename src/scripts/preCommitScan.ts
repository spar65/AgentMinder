#!/usr/bin/env node
import { execSync } from 'child_process';
import sensitiveDataScanner from '../utils/sensitiveDataScanner';

/**
 * Get list of staged files from Git
 * @returns Array of file paths
 */
function getStagedFiles(): string[] {
  try {
    // Get list of staged files (both new and modified)
    const output = execSync('git diff --cached --name-only').toString();
    return output.split('\n').filter(Boolean);
  } catch (error) {
    console.error('Error getting staged files:', error);
    return [];
  }
}

/**
 * Scan a staged file for sensitive data and encrypt it
 * @param filePath Path to the file
 * @returns Whether sensitive data was found and encrypted
 */
function scanStagedFile(filePath: string): boolean {
  try {
    // Only scan text files that might contain sensitive data
    const textFileExtensions = ['.md', '.txt', '.js', '.ts', '.json', '.yml', '.yaml', '.env'];
    if (!textFileExtensions.some(ext => filePath.endsWith(ext))) {
      return false;
    }
    
    console.log(`Scanning ${filePath}...`);
    const { replacementsCount, fileUpdated } = sensitiveDataScanner.scanAndEncryptFile(filePath);
    
    if (replacementsCount > 0) {
      console.log(`❗ Found and encrypted ${replacementsCount} sensitive items in ${filePath}`);
      
      // If the file was updated, we need to re-stage it
      if (fileUpdated) {
        try {
          execSync(`git add ${filePath}`);
          console.log(`✓ Re-staged ${filePath} with encrypted values`);
        } catch (error) {
          console.error(`Error re-staging ${filePath}:`, error);
        }
      }
      
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error);
    return false;
  }
}

/**
 * Main function to scan all staged files
 */
function main() {
  console.log('Pre-commit Sensitive Data Scanner');
  console.log('=================================');
  
  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    console.log('No staged files found.');
    process.exit(0);
  }
  
  console.log(`Found ${stagedFiles.length} staged files.`);
  
  let sensitiveDataFound = false;
  
  for (const file of stagedFiles) {
    const foundSensitiveData = scanStagedFile(file);
    sensitiveDataFound = sensitiveDataFound || foundSensitiveData;
  }
  
  if (sensitiveDataFound) {
    console.log('\n✓ Sensitive data was found and encrypted successfully.');
    console.log('  Your commit can proceed safely with the encrypted values.');
  } else {
    console.log('\n✓ No sensitive data found in staged files.');
  }
}

// Run the script
main(); 