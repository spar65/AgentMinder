import fs from 'fs';
import path from 'path';
import sensitiveDataScanner, { scanAndEncryptFile, decryptFile, scanDirectory } from '../../../src/utils/sensitiveDataScanner';
import encryptionService from '../../../src/utils/encryptionService';

// Mock dependencies
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  readdirSync: jest.fn(),
  statSync: jest.fn()
}));

jest.mock('../../../src/utils/encryptionService', () => ({
  encrypt: jest.fn(text => `encrypted_${text}`),
  decrypt: jest.fn(text => text.replace('encrypted_', '')),
  encryptConfig: jest.fn(),
  decryptConfig: jest.fn()
}));

describe('sensitiveDataScanner', () => {
  const testFilePath = 'test-file.md';
  const testFileContent = `
    This is a test file with a GitHub token: github_pat_abc123def456
    And here's a Figma token: figd_abcdefgh12345678ijklmnop
    And an AWS key: AKIAIOSFODNN7EXAMPLE
  `;

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(testFileContent);
  });

  describe('scanAndEncryptFile', () => {
    it('should scan and encrypt sensitive data in a file', () => {
      const result = scanAndEncryptFile(testFilePath);

      expect(fs.readFileSync).toHaveBeenCalledWith(testFilePath, 'utf8');
      expect(encryptionService.encrypt).toHaveBeenCalledTimes(3);
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Check if content was modified and tokens were encrypted
      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toBe(testFilePath);
      expect(writeCall[1]).toContain('ENCRYPTED_GITHUB_TOKEN:encrypted_github_pat_abc123def456');
      expect(writeCall[1]).toContain('ENCRYPTED_FIGMA_TOKEN:encrypted_figd_abcdefgh12345678ijklmnop');
      expect(writeCall[1]).toContain('ENCRYPTED_AWS_KEY:encrypted_AKIAIOSFODNN7EXAMPLE');
      
      expect(result.replacementsCount).toBe(3);
      expect(result.fileUpdated).toBe(true);
    });

    it('should return without modifications if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const result = scanAndEncryptFile('non-existent-file.md');
      
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(encryptionService.encrypt).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(result.replacementsCount).toBe(0);
      expect(result.fileUpdated).toBe(false);
    });

    it('should not modify file if no sensitive data is found', () => {
      const cleanContent = 'This file has no sensitive data.';
      (fs.readFileSync as jest.Mock).mockReturnValue(cleanContent);
      
      const result = scanAndEncryptFile(testFilePath);
      
      expect(fs.readFileSync).toHaveBeenCalledWith(testFilePath, 'utf8');
      expect(encryptionService.encrypt).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(result.replacementsCount).toBe(0);
      expect(result.fileUpdated).toBe(false);
    });
  });

  describe('decryptFile', () => {
    it('should decrypt encrypted values in a file', () => {
      const encryptedContent = `
        This file has an ENCRYPTED_GITHUB_TOKEN:encrypted_github_pat_123456 that should be decrypted.
        And an ENCRYPTED_FIGMA_TOKEN:encrypted_figd_abcdef123 as well.
      `;
      (fs.readFileSync as jest.Mock).mockReturnValue(encryptedContent);
      
      const decryptionCount = decryptFile(testFilePath);
      
      expect(fs.readFileSync).toHaveBeenCalledWith(testFilePath, 'utf8');
      expect(encryptionService.decrypt).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalled();
      
      // Check if content was modified and tokens were decrypted
      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
      expect(writeCall[0]).toBe(testFilePath);
      expect(writeCall[1]).toContain('github_pat_123456');
      expect(writeCall[1]).toContain('figd_abcdef123');
      
      expect(decryptionCount).toBe(2);
    });

    it('should return zero if file does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      
      const decryptionCount = decryptFile('non-existent-file.md');
      
      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(encryptionService.decrypt).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(decryptionCount).toBe(0);
    });

    it('should not modify file if no encrypted values are found', () => {
      const cleanContent = 'This file has no encrypted values.';
      (fs.readFileSync as jest.Mock).mockReturnValue(cleanContent);
      
      const decryptionCount = decryptFile(testFilePath);
      
      expect(fs.readFileSync).toHaveBeenCalledWith(testFilePath, 'utf8');
      expect(encryptionService.decrypt).not.toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
      expect(decryptionCount).toBe(0);
    });
  });

  describe('scanDirectory', () => {
    beforeEach(() => {
      // Mock directory structure
      (fs.readdirSync as jest.Mock).mockReturnValue(['file1.md', 'file2.ts', 'subdir']);
      (fs.statSync as jest.Mock).mockImplementation((path) => ({
        isDirectory: () => path.endsWith('subdir')
      }));
      
      // For recursive call to subdirectory
      (fs.readdirSync as jest.Mock).mockReturnValueOnce(['file1.md', 'file2.ts', 'subdir']);
      (fs.readdirSync as jest.Mock).mockReturnValueOnce(['file3.md']);
    });

    it('should scan all files in a directory recursively', () => {
      const testDir = '/test/dir';
      
      // Mock that only one file has sensitive data
      const scanResults = [
        { replacementsCount: 2, fileUpdated: true },
        { replacementsCount: 0, fileUpdated: false },
        { replacementsCount: 1, fileUpdated: true }
      ];
      
      let scanCallIndex = 0;
      jest.spyOn(sensitiveDataScanner, 'scanAndEncryptFile').mockImplementation(() => {
        return {
          encrypted: {},
          ...scanResults[scanCallIndex++]
        };
      });
      
      const results = scanDirectory(testDir);
      
      expect(fs.readdirSync).toHaveBeenCalledWith(testDir);
      expect(sensitiveDataScanner.scanAndEncryptFile).toHaveBeenCalledTimes(3);
      
      // Two files should have sensitive data
      expect(results.length).toBe(2);
      expect(results[0].sensitivesFound).toBe(2);
      expect(results[1].sensitivesFound).toBe(1);
    });

    it('should only scan files with specified extensions', () => {
      const testDir = '/test/dir';
      const fileTypes = ['.md']; // Only scan markdown files
      
      // Mock scan results
      jest.spyOn(sensitiveDataScanner, 'scanAndEncryptFile').mockReturnValue({
        encrypted: {},
        replacementsCount: 1, 
        fileUpdated: true
      });
      
      scanDirectory(testDir, fileTypes);
      
      // Should only scan the .md files (file1.md and file3.md)
      expect(sensitiveDataScanner.scanAndEncryptFile).toHaveBeenCalledTimes(2);
      
      // Check that it was called with the right files
      expect(sensitiveDataScanner.scanAndEncryptFile).toHaveBeenCalledWith(expect.stringContaining('file1.md'));
      expect(sensitiveDataScanner.scanAndEncryptFile).toHaveBeenCalledWith(expect.stringContaining('file3.md'));
      expect(sensitiveDataScanner.scanAndEncryptFile).not.toHaveBeenCalledWith(expect.stringContaining('file2.ts'));
    });
  });

  describe('SENSITIVE_PATTERNS', () => {
    it('should match GitHub token pattern correctly', () => {
      const pattern = sensitiveDataScanner.SENSITIVE_PATTERNS.find(p => p.name === 'GitHub Token');
      expect(pattern).toBeDefined();
      
      const regex = pattern!.regex;
      
      // Test matches
      expect('github_pat_abc123def456xyz789').toMatch(regex);
      expect('github_pat_123456789abcdefghijklmnopqrstuvwxyz').toMatch(regex);
      
      // Test non-matches
      expect('github_pt_too_short').not.toMatch(regex);
      expect('notgithub_pat_123456').not.toMatch(regex);
    });

    it('should match Figma token pattern correctly', () => {
      const pattern = sensitiveDataScanner.SENSITIVE_PATTERNS.find(p => p.name === 'Figma Token');
      expect(pattern).toBeDefined();
      
      const regex = pattern!.regex;
      
      // Test matches
      expect('figd_abcdefghijklmnopqrstuvwxyz123456789ABC').toMatch(regex);
      expect('figd_123456-abcdef-789012-defghi-345678-jklmno').toMatch(regex);
      
      // Test non-matches
      expect('figd_tooshort').not.toMatch(regex);
      expect('notfigd_abcdefghijklmnopqrstuvwxyz').not.toMatch(regex);
    });

    it('should match AWS key pattern correctly', () => {
      const pattern = sensitiveDataScanner.SENSITIVE_PATTERNS.find(p => p.name === 'AWS Key');
      expect(pattern).toBeDefined();
      
      const regex = pattern!.regex;
      
      // Test matches
      expect('AKIAIOSFODNN7EXAMPLE').toMatch(regex);
      expect('AKIA0123456789ABCDEF').toMatch(regex);
      
      // Test non-matches
      expect('AKIA12345').not.toMatch(regex); // Too short
      expect('BKIAIOSFODNN7EXAMPLE').not.toMatch(regex); // Doesn't start with AKIA
    });
  });
}); 