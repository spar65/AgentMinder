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

### Production Scripts

- `npm run setup:prod` - Set up the production environment and generate configuration files
- `npm run deploy:prod` - Build and deploy the application using Docker
- `npm run logs:prod` - View application logs from Docker containers
- `npm run stop:prod` - Stop the production containers
- `npm run backup:db` - Create a backup of the MongoDB database
- `npm run build:prod` - Build the TypeScript project for production

## Production Deployment

For production deployment, we've created comprehensive scripts to automate the process:

### Setting Up Production Environment

1. Run the production setup script:

   ```bash
   npm run setup:prod
   ```

   This will:

   - Create necessary Docker configuration files
   - Generate secure passwords and credentials
   - Set up environment variables
   - Create database initialization scripts

2. Deploy the application:

   ```bash
   npm run deploy:prod
   ```

   This will build and start the application and MongoDB containers as defined in docker-compose.production.yml.

### Database Management

To create a backup of the MongoDB database:

```bash
npm run backup:db
```

To restore a backup:

```bash
./scripts/restore-mongodb.sh <backup_filename>
```

### Health Monitoring

Check the health of your production environment:

```bash
./scripts/health-check.sh
```

For more details, see [PRODUCTION_SETUP.md](PRODUCTION_SETUP.md).

## Development Best Practices

This project follows these development best practices:

1. **Type Safety**: TypeScript is used throughout the codebase for type safety
2. **Test-Driven Development**: Tests are written for all features
3. **Clean Code**: ESLint and Prettier enforce code quality and consistency
4. **Separation of Concerns**: Code is organized into layers (controllers, services, repositories)
5. **Security**: Environment variables for sensitive information, authentication middleware
6. **Documentation**: Code is documented with JSDoc comments, API documentation with Swagger

## Logging System

The application uses a comprehensive logging system built with Winston, providing structured logging across all components:

### Key Logging Features

1. **Structured Logging**: All logs include contextual metadata for easier debugging and analysis
2. **Log Levels**: Different log levels (info, warn, error, debug) for appropriate filtering
3. **Centralized Configuration**: Logging is configured centrally and used consistently
4. **Database Operation Logging**: All database operations are automatically logged via Mongoose plugins
5. **Request/Response Logging**: API requests and responses are logged with timing information
6. **Error Tracing**: Errors include detailed stack traces in development mode

For complete documentation on the logging system, see [Logging Documentation](docs/Logging.md).

### Mongoose Logger Plugin

All database models utilize a custom Mongoose plugin that logs:

- Document creation
- Document updates
- Find operations
- Delete operations

The logs include collection names, operation types, document IDs, and any error information, making it easier to track database interactions and troubleshoot issues.

### Using the Logger

To log information in your own code:

```typescript
import { loggerService } from '../utils/logger';

// Log an informational message
loggerService.info('User registered successfully', { userId: user._id });

// Log a warning
loggerService.warn('Rate limit approaching', { ip: req.ip, requestCount: 95 });

// Log an error with stack trace
loggerService.error('Payment processing failed', {
  error,
  userId: user._id,
  amount: payment.amount,
});
```

### Log Rotation and Storage

Logs are automatically rotated to prevent overwhelming disk usage:

- Daily rotation with date-based filenames
- Maximum file size limits
- Compression of older logs
- Automatic cleanup of logs older than 30 days

Log files are stored in the `logs/` directory.

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
│   ├── API.md           # API documentation
│   ├── DATABASE.md      # Database guide
│   ├── Logging.md       # Logging system documentation
│   └── Security.md      # Security information
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

## Testing with Docker MongoDB

We use a real MongoDB database running in Docker for our tests to ensure reliable and consistent test results.

### Prerequisites

- Docker and Docker Compose installed on your machine

### Starting the Database

```bash
# Start the MongoDB containers
npm run docker:up

# Verify the database connection
npm run db:test
```

### Running Tests

```bash
# Run tests with the database already running
npm test

# Or to start Docker, test the connection and run tests in one command
npm run test:with-db
```

### Managing Docker Containers

```bash
# Start the containers (if they already exist)
npm run docker:start

# Stop the containers (keeping the data)
npm run docker:stop

# Stop and remove the containers
npm run docker:down

# View Docker logs
npm run docker:logs
```

The test MongoDB runs on port 27018 so it doesn't conflict with any local MongoDB instance. Test data is automatically cleared between test runs.

```

```
