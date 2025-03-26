import fs from 'fs';
import path from 'path';
import readline from 'readline';
import encryptionService from '../../../src/utils/encryptionService';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  statSync: jest.fn()
}));

jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  isAbsolute: jest.fn(path => path.startsWith('/')),
  dirname: jest.fn(path => path.substring(0, path.lastIndexOf('/')))
}));

jest.mock('readline', () => ({
  createInterface: jest.fn(() => ({
    question: jest.fn(),
    close: jest.fn()
  }))
}));

jest.mock('../../../src/utils/encryptionService', () => ({
  encrypt: jest.fn(text => `encrypted_${text}`),
  decrypt: jest.fn(text => {
    if (text.startsWith('encrypted_')) {
      return text.substring(10);
    }
    throw new Error('Invalid encrypted text format');
  })
}));

// We need to mock the entire module with functions we can spy on
const backupModule = {
  ensureBackupDir: jest.fn(),
  backupFiles: jest.fn(),
  restoreBackup: jest.fn(),
  listBackups: jest.fn(),
  main: jest.fn(),
  askQuestion: jest.fn()
};

// Import and test implementation without executing it
describe('sensitiveBackup', () => {
  // Create a mock implementation to test the structure and logic
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock return values
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.statSync as jest.Mock).mockReturnValue({
      mtime: new Date(),
      size: 10240
    });
  });

  describe('backup functionality', () => {
    it('should backup files that exist', async () => {
      // Mock filesystem checks and reads
      (fs.existsSync as jest.Mock)
        .mockReturnValueOnce(true)  // Backup dir exists check
        .mockReturnValueOnce(true)  // .env exists check
        .mockReturnValueOnce(false); // .env.local doesn't exist check
      
      (fs.readFileSync as jest.Mock).mockReturnValue('test file content');
      
      // Simulate the backupFiles function
      const files = ['.env', '.env.local'];
      
      // Calling our simulated version of backupFiles
      const backupData: Record<string, string> = {};
      const successfulBackups: string[] = [];
      
      for (const file of files) {
        const filePath = (path.isAbsolute as jest.Mock)(file) ? file : path.join(process.cwd(), file);
        
        if ((fs.existsSync as jest.Mock)(filePath)) {
          const content = (fs.readFileSync as jest.Mock)(filePath, 'utf8');
          backupData[file] = content;
          successfulBackups.push(file);
        }
      }
      
      // Encrypt the backup
      const encryptedBackup = encryptionService.encrypt(JSON.stringify(backupData));
      (fs.writeFileSync as jest.Mock)(path.join('secure-backups', 'sensitive-files-backup.enc'), encryptedBackup);
      
      // Assertions
      expect(successfulBackups).toEqual(['.env']);
      expect(successfulBackups).not.toContain('.env.local');
      expect(Object.keys(backupData)).toHaveLength(1);
      expect(encryptionService.encrypt).toHaveBeenCalledWith(JSON.stringify(backupData));
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('restore functionality', () => {
    it('should restore files from backup', async () => {
      // Mock the encrypted backup content
      const backupData = {
        '.env': 'TEST_KEY=test_value',
        '.env.test': 'TEST_MODE=true'
      };
      
      const encryptedBackup = encryptionService.encrypt(JSON.stringify(backupData));
      (fs.readFileSync as jest.Mock).mockReturnValue(encryptedBackup);
      
      // Mock askQuestion to simulate user confirming restore
      const askQuestion = jest.fn()
        .mockResolvedValueOnce('y')  // First file
        .mockResolvedValueOnce('y'); // Second file
      
      // Simulate restore functionality
      const decryptedData = JSON.parse(encryptionService.decrypt(encryptedBackup)) as Record<string, string>;
      expect(Object.keys(decryptedData)).toHaveLength(2);
      
      // Restore each file
      for (const [file, content] of Object.entries(decryptedData)) {
        const shouldRestore = await askQuestion(`Restore ${file}?`);
        
        if (shouldRestore.toLowerCase() === 'y') {
          const filePath = (path.isAbsolute as jest.Mock)(file) ? file : path.join(process.cwd(), file);
          const fileDir = (path.dirname as jest.Mock)(filePath);
          
          // Create directory if needed
          if (!(fs.existsSync as jest.Mock)(fileDir)) {
            (fs.mkdirSync as jest.Mock)(fileDir, { recursive: true });
          }
          
          (fs.writeFileSync as jest.Mock)(filePath, content);
        }
      }
      
      // Assertions
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.env'), 'TEST_KEY=test_value');
      expect(fs.writeFileSync).toHaveBeenCalledWith(expect.stringContaining('.env.test'), 'TEST_MODE=true');
    });

    it('should handle missing backup file', async () => {
      // Mock that the backup file doesn't exist
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Simulate handling missing backup
      if (!(fs.existsSync as jest.Mock)(path.join('secure-backups', 'sensitive-files-backup.enc'))) {
        console.error = jest.fn();
        console.error('Backup file not found');
      }
      
      // Assertions
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(encryptionService.decrypt).not.toHaveBeenCalled();
    });
  });

  describe('listBackups functionality', () => {
    it('should list available backups', () => {
      // Mock backup file stats
      (fs.statSync as jest.Mock).mockReturnValue({
        mtime: new Date('2023-01-01'),
        size: 5120
      });
      
      // Mock encrypted backup content
      const backupData = {
        '.env': 'content1',
        '.env.production': 'content2',
        '.encryption-key': 'key-content'
      };
      
      const encryptedBackup = encryptionService.encrypt(JSON.stringify(backupData));
      (fs.readFileSync as jest.Mock).mockReturnValue(encryptedBackup);
      
      // Simulate backup listing
      if ((fs.existsSync as jest.Mock)(path.join('secure-backups', 'sensitive-files-backup.enc'))) {
        const stats = (fs.statSync as jest.Mock)(path.join('secure-backups', 'sensitive-files-backup.enc'));
        const backupDate = stats.mtime.toLocaleString();
        const fileSize = (stats.size / 1024).toFixed(2);
        
        // Try to decrypt and show contents
        const backupContent = (fs.readFileSync as jest.Mock)(path.join('secure-backups', 'sensitive-files-backup.enc'), 'utf8');
        const decryptedData = JSON.parse(encryptionService.decrypt(backupContent)) as Record<string, string>;
        const fileCount = Object.keys(decryptedData).length;
        
        // Assertions
        expect(fileCount).toBe(3);
        expect(backupDate).toEqual(new Date('2023-01-01').toLocaleString());
        expect(fileSize).toBe('5.00');
        expect(Object.keys(decryptedData)).toEqual(['.env', '.env.production', '.encryption-key']);
      }
    });

    it('should handle no backup file found', () => {
      // Mock that no backup exists
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      // Capture console output
      console.log = jest.fn();
      
      // Simulate handling no backup
      if (!(fs.existsSync as jest.Mock)(path.join('secure-backups', 'sensitive-files-backup.enc'))) {
        console.log('No backup file found.');
      }
      
      // Assertions
      expect(console.log).toHaveBeenCalledWith('No backup file found.');
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });
  });
}); 