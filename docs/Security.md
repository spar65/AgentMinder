# Security Documentation

## Security Architecture Overview

AgentMinder incorporates a layered security approach to protect sensitive information throughout the application lifecycle:

1. **Data Encryption**: AES-256-GCM encryption with key rotation capability
2. **Automatic Detection**: Pattern-based scanning for sensitive information
3. **Git Integration**: Pre-commit hooks to prevent accidental exposure
4. **Backup System**: Secure, encrypted backup and recovery mechanisms
5. **Access Controls**: Role-based permissions for sensitive operations

## Encryption System

### Technical Specifications

- **Algorithm**: AES-256-GCM (Galois/Counter Mode)
- **Key Size**: 256-bit (32 bytes)
- **Implementation**: Node.js native crypto module
- **Format**: `iv:authTag:encryptedData` for individual values
- **Storage**: Local key file (`.encryption-key`) - never committed to version control

### How It Works

1. A random encryption key is generated on first use
2. The key is stored locally in `.encryption-key`
3. When sensitive data is detected, it is:
   - Encrypted using the key
   - Replaced with a formatted placeholder
   - The original file is updated with the encrypted version
4. When decryption is needed, the process is reversed

Example transformation:

```
// Original
const githubToken = "github_pat_a1b2c3d4e5f6";

// Encrypted
const githubToken = "ENCRYPTED_GITHUB_TOKEN:a1b2c3:d4e5f6:encrypted_data_here";
```

## Sensitive Data Scanner

The system can detect the following types of sensitive information:

| Type         | Pattern                                                            | Example                         |
| ------------ | ------------------------------------------------------------------ | ------------------------------- |
| GitHub Token | `github_pat_[a-zA-Z0-9_]{22,}`                                     | github_pat_abcdef123456         |
| Figma Token  | `figd_[a-zA-Z0-9_-]{40,}`                                          | figd_abcdef123456-789012-345678 |
| AWS Key      | `AKIA[0-9A-Z]{16}`                                                 | AKIAIOSFODNN7EXAMPLE            |
| MongoDB URI  | `mongodb(\+srv)?://[a-zA-Z0-9-_.]+:[a-zA-Z0-9-_.]+@[a-zA-Z0-9-.]+` | mongodb://user:pass@host        |
| API Keys     | `["']?api[_-]?key["']?\s*[:=]\s*["']([a-zA-Z0-9]{16,})["']`        | "api_key": "abcdef123456"       |

Custom patterns can be added in `src/utils/sensitiveDataScanner.ts`.

## Secrets Management

The secrets management system allows you to:

1. **Store Application Secrets**: Database credentials, API keys, etc.
2. **Access Secrets at Runtime**: Via the secrets API
3. **Rotate Secrets**: Update secrets without code changes

### Usage

```typescript
// Import the secrets manager
import secrets from './src/config/secrets';

// Get a specific secret
const apiKey = secrets.get('API_KEY');

// Get all secrets
const allSecrets = secrets.getAll();
```

## Command-line Tools

### Secret Manager

```bash
npm run secrets
```

Options:

1. Generate new encrypted secrets
2. View existing secrets
3. Exit

### Sensitive Data Scanner

```bash
npm run scan
```

Options:

1. Scan specific files
2. Scan entire directory
3. Decrypt a file

### Backup Utility

```bash
npm run backup
```

Options:

1. Create backup
2. Restore from backup
3. List available backups

## Git Integration

The pre-commit hook automatically:

1. Identifies staged files that may contain sensitive data
2. Scans these files for sensitive patterns
3. Encrypts any found sensitive data
4. Re-stages the files with encrypted values

This process is transparent to the user and ensures no sensitive data is committed to the repository in plain text.

## Working with Encrypted Data

### Decrypting Files Locally

When you need to work with the original values:

```bash
npm run scan
# Choose option 3 (Decrypt a file)
# Enter the file path
```

This will decrypt the file **only on your local machine**. Never commit the decrypted version.

### Viewing Encrypted Secrets

```bash
npm run secrets
# Choose option 2 (View existing secrets)
```

### When to Decrypt

Decrypt files locally when:

- Debugging issues related to authentication or API access
- Making changes that require the actual token values
- Testing integrations locally

Always re-encrypt before committing.

## Security Best Practices

1. **Backup Your Encryption Key**: Store a copy of `.encryption-key` in a secure location
2. **Regular Backups**: Run `npm run backup` regularly and store the encrypted backups securely
3. **Key Rotation**: Periodically generate a new encryption key and re-encrypt all sensitive data
4. **Limited Access**: Restrict access to encryption keys to only essential team members
5. **Secure Transfer**: When sharing the codebase, never include the encryption key in the same communication channel

## Emergency Procedures

### Lost Encryption Key

If the encryption key is lost:

1. Check for backups of the `.encryption-key` file
2. Restore from the most recent backup that includes `.encryption-key`
3. If no backup exists, all encrypted data must be replaced

### Compromised Tokens

If a token is compromised:

1. Immediately revoke the compromised token with the service provider
2. Generate a new token
3. Update the encrypted token in the application
4. Commit and deploy the changes

## Implementation Details

The security system consists of the following components:

- `src/utils/encryptionService.ts`: Core encryption/decryption functionality
- `src/utils/sensitiveDataScanner.ts`: Pattern detection and file processing
- `src/config/secrets.ts`: Application secrets management
- `src/scripts/secretManager.ts`: CLI tool for secrets management
- `src/scripts/scanSensitiveData.ts`: CLI tool for scanning files
- `src/scripts/sensitiveBackup.ts`: CLI tool for backup/restore
- `src/scripts/preCommitScan.ts`: Pre-commit hook for Git
- `.husky/pre-commit`: Git hook configuration

All components are thoroughly tested with Jest.
