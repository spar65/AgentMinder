# Agent Minder

Agent Minder is a comprehensive system for managing agents, handling payments, and providing business operations support.

## Features

- **Agent Management**: Track and manage agent information and activities
- **Payment Processing**: Secure payment system for agent commissions and client payments
- **Business Operations**: Support for various business requirements
- **API Integration**: RESTful API design for flexibility and integration

## Technology Stack

- **Backend**: Node.js with Express and TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Testing**: Jest for unit and integration testing
- **Code Quality**: ESLint and Prettier for code quality and formatting
- **CI/CD**: GitHub Actions for continuous integration and deployment
- **Documentation**: Swagger/OpenAPI for API documentation

## Getting Started

### Prerequisites

- Node.js (v16+)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository

   ```bash
   git clone https://github.com/yourusername/agent-minder.git
   cd agent-minder
   ```

2. Install dependencies

   ```bash
   npm install
   ```

3. Set up environment variables

   ```bash
   cp .env.example .env
   # Edit .env with your specific configuration
   ```

4. Run in development mode
   ```bash
   npm run dev
   ```

### Scripts

- `npm start` - Start the production server
- `npm run dev` - Start the development server with hot reloading
- `npm run build` - Build the TypeScript project
- `npm test` - Run the test suite
- `npm run lint` - Check code quality
- `npm run lint:fix` - Fix code quality issues automatically
- `npm run format` - Format code according to Prettier rules

## Development Best Practices

This project follows these development best practices:

1. **Type Safety**: TypeScript is used throughout the codebase for type safety
2. **Test-Driven Development**: Tests are written for all features
3. **Clean Code**: ESLint and Prettier enforce code quality and consistency
4. **Separation of Concerns**: Code is organized into layers (controllers, services, repositories)
5. **Security**: Environment variables for sensitive information, authentication middleware
6. **Documentation**: Code is documented with JSDoc comments, API documentation with Swagger

## Security and Secrets Management

This project includes a comprehensive security system for handling sensitive information like API keys and tokens:

1. **Encryption Service**: Uses AES-256-GCM encryption (industry standard) with a 256-bit key for strong security
2. **Secret Management**: Command-line utilities for managing encrypted secrets and scanning for sensitive data
3. **Key Management**: Encryption keys are stored locally and never committed to the repository
4. **Automatic Protection**: Pre-commit hooks automatically detect and encrypt sensitive data before code is pushed
5. **Secure Backups**: Tools for creating encrypted backups of sensitive configuration files

### Key Security Features

#### 1. Encryption for Sensitive Values

The system can identify and encrypt common sensitive values such as:

- GitHub tokens
- Figma tokens
- AWS access keys
- API keys
- Database connection strings

Encrypted values are stored in the format: `PLACEHOLDER:encrypted_value`, allowing them to be safely committed to the repository.

#### 2. Managing Secrets

To manage application secrets, use the built-in secrets manager:

```bash
npm run secrets
```

This tool allows you to:

- Generate new encrypted secrets for application use
- View existing decrypted secrets (locally only)
- Add or update secrets in the configuration

#### 3. Scanning and Encrypting Sensitive Data

To scan files for sensitive data and automatically encrypt it:

```bash
npm run scan
```

This tool allows you to:

- Scan specific files for sensitive tokens
- Scan entire directories recursively
- Encrypt any found sensitive data
- Decrypt files when needed locally

#### 4. Pre-commit Protection

The project includes a pre-commit hook that activates automatically when committing code:

- Scans all staged files for sensitive data
- Encrypts any found sensitive data
- Re-stages files with encrypted values

This ensures you never accidentally commit unencrypted sensitive information to GitHub.

#### 5. Backing Up Sensitive Files

To securely back up and restore sensitive files:

```bash
npm run backup
```

This tool allows you to:

- Create encrypted backups of sensitive files (.env, .encryption-key, etc.)
- Restore sensitive files from backups
- List available backups

### Decrypting Sensitive Data

When you need to use the original values of encrypted data:

1. To decrypt specific files:

   ```bash
   npm run scan
   ```

   Then select option 3 (Decrypt a file) and provide the file path.

2. To view application secrets:

   ```bash
   npm run secrets
   ```

   Then select option 2 (View existing secrets).

3. To restore from backup:
   ```bash
   npm run backup
   ```
   Then select option 2 (Restore from backup).

### Important Security Notes

1. **Encryption Key**: The `.encryption-key` file is critical - if lost, encrypted data cannot be recovered. Store a backup of this file in a secure location separate from your codebase.

2. **Files Not Automatically Backed Up**: The following files are NOT automatically backed up and should be separately secured:

   - Source code (use Git)
   - Large data files
   - Binary files
   - Node modules
   - Build artifacts

3. **Transferring to a New Machine**: When setting up on a new machine, you must securely transfer the `.encryption-key` file to decrypt any encrypted values.

4. **Emergency Recovery**: Create regular backups using the `npm run backup` command and store them securely offline or in an encrypted cloud storage service.

5. **Key Rotation**: For maximum security, consider rotating your encryption key periodically by generating a new key and re-encrypting all sensitive data.

## Project Structure

```
agent-minder/
├── src/
│   ├── config/          # App configuration
│   ├── controllers/     # API controllers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── utils/           # Utility functions
│   └── index.ts         # App entry point
├── tests/               # Test files
├── docs/                # Documentation
└── dist/                # Compiled JavaScript
```

## API Documentation

API documentation is available at `/api-docs` when the server is running.

## Contributing

1. Create a feature branch from the main branch
2. Make your changes with appropriate tests
3. Run tests and linters to ensure code quality
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

```

```
