#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import encryptionService from '../utils/encryptionService';

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Define default sensitive files to backup
const DEFAULT_SENSITIVE_FILES = [
  '.env',
  '.env.local',
  '.env.development',
  '.env.test',
  '.env.production',
  '.encryption-key'
];

// Define backup location
const BACKUP_DIR = path.join(process.cwd(), 'secure-backups');
const BACKUP_FILE = path.join(BACKUP_DIR, 'sensitive-files-backup.enc');

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
 * Ensure the backup directory exists
 */
function ensureBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
}

/**
 * Create a secure backup of sensitive files
 * @param files Array of file paths to backup
 */
async function backupFiles(files: string[]): Promise<void> {
  console.log('Secure Backup - Creating Backup');
  console.log('-------------------------------');
  
  ensureBackupDir();
  
  const backupData: Record<string, string> = {};
  const successfulBackups: string[] = [];
  
  for (const file of files) {
    const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
    
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        backupData[file] = content;
        successfulBackups.push(file);
        console.log(`✓ Added ${file} to backup`);
      } else {
        console.log(`⚠ File ${file} does not exist, skipping`);
      }
    } catch (error) {
      console.error(`Error backing up ${file}:`, error);
    }
  }
  
  if (successfulBackups.length === 0) {
    console.log('No files were backed up.');
    return;
  }
  
  try {
    // Encrypt the backup data
    const encryptedBackup = encryptionService.encrypt(JSON.stringify(backupData));
    fs.writeFileSync(BACKUP_FILE, encryptedBackup);
    
    console.log(`\n✓ Successfully backed up ${successfulBackups.length} files to ${BACKUP_FILE}`);
    console.log('Make sure to keep your .encryption-key file safe as it is needed for restoration.');
  } catch (error) {
    console.error('Error creating encrypted backup:', error);
  }
}

/**
 * Restore files from a secure backup
 */
async function restoreBackup(): Promise<void> {
  console.log('Secure Backup - Restoring Files');
  console.log('-------------------------------');
  
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`Backup file not found: ${BACKUP_FILE}`);
    return;
  }
  
  try {
    const encryptedBackup = fs.readFileSync(BACKUP_FILE, 'utf8');
    const backupData = JSON.parse(encryptionService.decrypt(encryptedBackup)) as Record<string, string>;
    
    const fileCount = Object.keys(backupData).length;
    console.log(`Found backup with ${fileCount} files.`);
    
    for (const [file, content] of Object.entries(backupData)) {
      const confirmRestore = await askQuestion(`Restore ${file}? This will overwrite the existing file. (y/n): `);
      
      if (confirmRestore.toLowerCase() === 'y') {
        const filePath = path.isAbsolute(file) ? file : path.join(process.cwd(), file);
        const fileDir = path.dirname(filePath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(fileDir)) {
          fs.mkdirSync(fileDir, { recursive: true });
        }
        
        fs.writeFileSync(filePath, content);
        console.log(`✓ Restored ${file}`);
      }
    }
    
    console.log('\n✓ Restoration complete.');
  } catch (error) {
    console.error('Error restoring backup:', error);
  }
}

/**
 * List available backups
 */
function listBackups(): void {
  console.log('Secure Backup - Available Backups');
  console.log('--------------------------------');
  
  ensureBackupDir();
  
  try {
    if (!fs.existsSync(BACKUP_FILE)) {
      console.log('No backup file found.');
      return;
    }
    
    const stats = fs.statSync(BACKUP_FILE);
    const backupDate = stats.mtime.toLocaleString();
    console.log(`Backup found: ${path.basename(BACKUP_FILE)}`);
    console.log(`Created: ${backupDate}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB`);
    
    try {
      // Try to decrypt and show what's in the backup
      const encryptedBackup = fs.readFileSync(BACKUP_FILE, 'utf8');
      const backupData = JSON.parse(encryptionService.decrypt(encryptedBackup)) as Record<string, string>;
      const fileCount = Object.keys(backupData).length;
      
      console.log(`Contains ${fileCount} files:`);
      Object.keys(backupData).forEach(file => {
        console.log(`- ${file}`);
      });
    } catch (error) {
      console.error('Could not decrypt backup file. Make sure you have the correct encryption key.');
    }
  } catch (error) {
    console.error('Error listing backups:', error);
  }
}

/**
 * Main function to run the script
 */
async function main(): Promise<void> {
  console.log('AgentMinder Sensitive File Backup');
  console.log('================================');
  console.log('1. Create backup of sensitive files');
  console.log('2. Restore from backup');
  console.log('3. List available backups');
  
  const choice = await askQuestion('\nSelect an option (1-3): ');
  
  switch (choice) {
    case '1': {
      const defaultFilesStr = DEFAULT_SENSITIVE_FILES.join(', ');
      const customFiles = await askQuestion(`Files to backup (default: ${defaultFilesStr}): `);
      
      const filesToBackup = customFiles.trim() 
        ? customFiles.split(',').map(f => f.trim())
        : DEFAULT_SENSITIVE_FILES;
      
      await backupFiles(filesToBackup);
      break;
    }
    case '2':
      await restoreBackup();
      break;
    case '3':
      listBackups();
      break;
    default:
      console.log('Invalid option selected.');
  }
  
  rl.close();
}

// Run the script
main().catch(console.error); 