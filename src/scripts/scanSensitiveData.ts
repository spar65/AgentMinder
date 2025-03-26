#!/usr/bin/env node
import path from 'path';
import readline from 'readline';
import sensitiveDataScanner from '../utils/sensitiveDataScanner';

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
 * Scan specific files for sensitive data
 */
async function scanFiles(): Promise<void> {
  console.log('Sensitive Data Scanner - Scan Files');
  console.log('-----------------------------------');
  
  const filePaths = await askQuestion('Enter file paths to scan (comma-separated): ');
  
  if (!filePaths.trim()) {
    console.log('No files specified.');
    return;
  }
  
  const files = filePaths.split(',').map(f => f.trim());
  let totalSensitiveDataFound = 0;
  
  for (const file of files) {
    console.log(`\nScanning ${file}...`);
    
    try {
      const { replacementsCount, fileUpdated } = sensitiveDataScanner.scanAndEncryptFile(file);
      
      if (replacementsCount > 0) {
        console.log(`✓ Found and encrypted ${replacementsCount} sensitive items.`);
        if (fileUpdated) {
          console.log('✓ File updated with encrypted values.');
        }
        totalSensitiveDataFound += replacementsCount;
      } else {
        console.log('✓ No sensitive data found.');
      }
    } catch (error) {
      console.error(`Error scanning ${file}:`, error);
    }
  }
  
  console.log(`\nTotal sensitive items encrypted: ${totalSensitiveDataFound}`);
}

/**
 * Scan entire directory for sensitive data
 */
async function scanDirectory(): Promise<void> {
  console.log('Sensitive Data Scanner - Scan Directory');
  console.log('--------------------------------------');
  
  const directory = await askQuestion('Enter directory to scan (default: current directory): ');
  const dir = directory.trim() || process.cwd();
  
  console.log(`\nScanning ${dir} for sensitive data...`);
  
  try {
    const results = sensitiveDataScanner.scanDirectory(dir);
    
    if (results.length > 0) {
      console.log('\nSensitive data found and encrypted in the following files:');
      
      let totalSensitiveData = 0;
      results.forEach(result => {
        console.log(`- ${result.file}: ${result.sensitivesFound} items`);
        totalSensitiveData += result.sensitivesFound;
      });
      
      console.log(`\nTotal: ${results.length} files with ${totalSensitiveData} sensitive items encrypted.`);
    } else {
      console.log('\nNo sensitive data found in any files.');
    }
  } catch (error) {
    console.error('Error scanning directory:', error);
  }
}

/**
 * Decrypt a file that contains encrypted values
 */
async function decryptFile(): Promise<void> {
  console.log('Sensitive Data Scanner - Decrypt File');
  console.log('------------------------------------');
  
  const filePath = await askQuestion('Enter file path to decrypt: ');
  
  if (!filePath.trim()) {
    console.log('No file specified.');
    return;
  }
  
  try {
    const decryptionCount = sensitiveDataScanner.decryptFile(filePath);
    
    if (decryptionCount > 0) {
      console.log(`✓ Successfully decrypted ${decryptionCount} values in the file.`);
    } else {
      console.log('No encrypted values found in the file.');
    }
  } catch (error) {
    console.error(`Error decrypting ${filePath}:`, error);
  }
}

/**
 * Main function to run the script
 */
async function main(): Promise<void> {
  console.log('AgentMinder Sensitive Data Scanner');
  console.log('=================================');
  console.log('1. Scan specific files');
  console.log('2. Scan entire directory');
  console.log('3. Decrypt a file');
  
  const choice = await askQuestion('\nSelect an option (1-3): ');
  
  switch (choice) {
    case '1':
      await scanFiles();
      break;
    case '2':
      await scanDirectory();
      break;
    case '3':
      await decryptFile();
      break;
    default:
      console.log('Invalid option selected.');
  }
  
  rl.close();
}

// Run the script
main().catch(console.error); 