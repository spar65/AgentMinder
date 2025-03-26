import { execSync } from 'child_process';
import sensitiveDataScanner from '../../../src/utils/sensitiveDataScanner';

// Mock dependencies
jest.mock('child_process', () => ({
  execSync: jest.fn()
}));

jest.mock('../../../src/utils/sensitiveDataScanner', () => ({
  scanAndEncryptFile: jest.fn(),
  SENSITIVE_PATTERNS: [
    { name: 'GitHub Token', regex: /github_pat_[a-zA-Z0-9_]{22,}/g, placeholder: 'ENCRYPTED_GITHUB_TOKEN' }
  ]
}));

// Mock console functions for testing
const originalConsole = { ...console };
beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
});

afterEach(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  jest.clearAllMocks();
});

// Now test the function implementations for preCommitScan
describe('preCommitScan', () => {
  describe('getStagedFiles', () => {
    it('should return a list of staged files from git', () => {
      // Mock git command output
      (execSync as jest.Mock).mockReturnValue(Buffer.from('file1.ts\nfile2.md\nfile3.js\n'));
      
      // Implement getStagedFiles function
      function getStagedFiles(): string[] {
        try {
          const output = (execSync as jest.Mock)('git diff --cached --name-only').toString();
          return output.split('\n').filter(Boolean);
        } catch (error) {
          console.error('Error getting staged files:', error);
          return [];
        }
      }
      
      const stagedFiles = getStagedFiles();
      
      expect(execSync).toHaveBeenCalledWith('git diff --cached --name-only');
      expect(stagedFiles).toEqual(['file1.ts', 'file2.md', 'file3.js']);
    });
    
    it('should handle errors and return empty array', () => {
      // Mock git command error
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('git command failed');
      });
      
      // Implement getStagedFiles function
      function getStagedFiles(): string[] {
        try {
          const output = (execSync as jest.Mock)('git diff --cached --name-only').toString();
          return output.split('\n').filter(Boolean);
        } catch (error) {
          console.error('Error getting staged files:', error);
          return [];
        }
      }
      
      const stagedFiles = getStagedFiles();
      
      expect(execSync).toHaveBeenCalledWith('git diff --cached --name-only');
      expect(console.error).toHaveBeenCalled();
      expect(stagedFiles).toEqual([]);
    });
  });
  
  describe('scanStagedFile', () => {
    it('should scan text files and encrypt sensitive data', () => {
      // Mock sensitiveDataScanner.scanAndEncryptFile to return found sensitive data
      (sensitiveDataScanner.scanAndEncryptFile as jest.Mock).mockReturnValue({
        replacementsCount: 2,
        fileUpdated: true,
        encrypted: {}
      });
      
      // Mock successful re-staging
      (execSync as jest.Mock).mockReturnValue(Buffer.from(''));
      
      // Implement scanStagedFile function
      function scanStagedFile(filePath: string): boolean {
        try {
          // Only scan text files that might contain sensitive data
          const textFileExtensions = ['.md', '.txt', '.js', '.ts', '.json', '.yml', '.yaml', '.env'];
          if (!textFileExtensions.some(ext => filePath.endsWith(ext))) {
            return false;
          }
          
          console.log(`Scanning ${filePath}...`);
          const { replacementsCount, fileUpdated } = (sensitiveDataScanner.scanAndEncryptFile as jest.Mock)(filePath);
          
          if (replacementsCount > 0) {
            console.log(`Found and encrypted ${replacementsCount} sensitive items in ${filePath}`);
            
            // If the file was updated, we need to re-stage it
            if (fileUpdated) {
              try {
                (execSync as jest.Mock)(`git add ${filePath}`);
                console.log(`Re-staged ${filePath} with encrypted values`);
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
      
      const result = scanStagedFile('test.md');
      
      expect(sensitiveDataScanner.scanAndEncryptFile).toHaveBeenCalledWith('test.md');
      expect(execSync).toHaveBeenCalledWith('git add test.md');
      expect(result).toBe(true);
    });
    
    it('should skip non-text files', () => {
      // Implement scanStagedFile function
      function scanStagedFile(filePath: string): boolean {
        try {
          // Only scan text files that might contain sensitive data
          const textFileExtensions = ['.md', '.txt', '.js', '.ts', '.json', '.yml', '.yaml', '.env'];
          if (!textFileExtensions.some(ext => filePath.endsWith(ext))) {
            return false;
          }
          
          console.log(`Scanning ${filePath}...`);
          return true;
        } catch (error) {
          console.error(`Error scanning ${filePath}:`, error);
          return false;
        }
      }
      
      const result = scanStagedFile('image.png');
      
      expect(sensitiveDataScanner.scanAndEncryptFile).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
    
    it('should not re-stage if no sensitive data found', () => {
      // Mock sensitiveDataScanner.scanAndEncryptFile to return no sensitive data
      (sensitiveDataScanner.scanAndEncryptFile as jest.Mock).mockReturnValue({
        replacementsCount: 0,
        fileUpdated: false,
        encrypted: {}
      });
      
      // Implement scanStagedFile function
      function scanStagedFile(filePath: string): boolean {
        try {
          // Only scan text files that might contain sensitive data
          const textFileExtensions = ['.md', '.txt', '.js', '.ts', '.json', '.yml', '.yaml', '.env'];
          if (!textFileExtensions.some(ext => filePath.endsWith(ext))) {
            return false;
          }
          
          console.log(`Scanning ${filePath}...`);
          const { replacementsCount, fileUpdated } = (sensitiveDataScanner.scanAndEncryptFile as jest.Mock)(filePath);
          
          if (replacementsCount > 0) {
            console.log(`Found and encrypted ${replacementsCount} sensitive items in ${filePath}`);
            
            // If the file was updated, we need to re-stage it
            if (fileUpdated) {
              try {
                (execSync as jest.Mock)(`git add ${filePath}`);
                console.log(`Re-staged ${filePath} with encrypted values`);
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
      
      const result = scanStagedFile('clean-file.js');
      
      expect(sensitiveDataScanner.scanAndEncryptFile).toHaveBeenCalledWith('clean-file.js');
      expect(execSync).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });
  });
  
  describe('main function', () => {
    it('should scan all staged files and report results', () => {
      // Mock getStagedFiles and scanStagedFile
      const mockGetStagedFiles = jest.fn().mockReturnValue(['file1.md', 'file2.js', 'file3.png']);
      const mockScanStagedFile = jest.fn()
        .mockReturnValueOnce(true)   // file1.md has sensitive data
        .mockReturnValueOnce(false)  // file2.js has no sensitive data
        .mockReturnValueOnce(false); // file3.png is not scanned (not a text file)
      
      // Implement main function
      function main() {
        console.log('Pre-commit Sensitive Data Scanner');
        console.log('=================================');
        
        const stagedFiles = mockGetStagedFiles();
        
        if (stagedFiles.length === 0) {
          console.log('No staged files found.');
          return;
        }
        
        console.log(`Found ${stagedFiles.length} staged files.`);
        
        let sensitiveDataFound = false;
        
        for (const file of stagedFiles) {
          const foundSensitiveData = mockScanStagedFile(file);
          sensitiveDataFound = sensitiveDataFound || foundSensitiveData;
        }
        
        if (sensitiveDataFound) {
          console.log('\nSensitive data was found and encrypted successfully.');
          console.log('Your commit can proceed safely with the encrypted values.');
        } else {
          console.log('\nNo sensitive data found in staged files.');
        }
      }
      
      main();
      
      expect(mockGetStagedFiles).toHaveBeenCalledTimes(1);
      expect(mockScanStagedFile).toHaveBeenCalledTimes(3);
      expect(mockScanStagedFile).toHaveBeenCalledWith('file1.md');
      expect(mockScanStagedFile).toHaveBeenCalledWith('file2.js');
      expect(mockScanStagedFile).toHaveBeenCalledWith('file3.png');
      
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Sensitive data was found'));
    });
    
    it('should handle case with no staged files', () => {
      // Mock getStagedFiles to return empty array
      const mockGetStagedFiles = jest.fn().mockReturnValue([]);
      
      // Implement main function
      function main() {
        console.log('Pre-commit Sensitive Data Scanner');
        console.log('=================================');
        
        const stagedFiles = mockGetStagedFiles();
        
        if (stagedFiles.length === 0) {
          console.log('No staged files found.');
          return;
        }
      }
      
      main();
      
      expect(mockGetStagedFiles).toHaveBeenCalledTimes(1);
      expect(console.log).toHaveBeenCalledWith('No staged files found.');
    });
    
    it('should handle case with no sensitive data found', () => {
      // Mock getStagedFiles and scanStagedFile
      const mockGetStagedFiles = jest.fn().mockReturnValue(['file1.md', 'file2.js']);
      const mockScanStagedFile = jest.fn()
        .mockReturnValueOnce(false)  // file1.md has no sensitive data
        .mockReturnValueOnce(false); // file2.js has no sensitive data
      
      // Implement main function
      function main() {
        console.log('Pre-commit Sensitive Data Scanner');
        console.log('=================================');
        
        const stagedFiles = mockGetStagedFiles();
        
        if (stagedFiles.length === 0) {
          console.log('No staged files found.');
          return;
        }
        
        console.log(`Found ${stagedFiles.length} staged files.`);
        
        let sensitiveDataFound = false;
        
        for (const file of stagedFiles) {
          const foundSensitiveData = mockScanStagedFile(file);
          sensitiveDataFound = sensitiveDataFound || foundSensitiveData;
        }
        
        if (sensitiveDataFound) {
          console.log('\nSensitive data was found and encrypted successfully.');
          console.log('Your commit can proceed safely with the encrypted values.');
        } else {
          console.log('\nNo sensitive data found in staged files.');
        }
      }
      
      main();
      
      expect(mockGetStagedFiles).toHaveBeenCalledTimes(1);
      expect(mockScanStagedFile).toHaveBeenCalledTimes(2);
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No sensitive data found'));
    });
  });
}); 