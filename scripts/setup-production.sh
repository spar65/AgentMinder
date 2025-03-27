#!/bin/bash

# Agent Minder Production Setup Script
# This script automates the setup of the Agent Minder application in a production environment

set -e  # Exit immediately if a command exits with a non-zero status
set -u  # Treat unset variables as an error

# Configuration variables (can be overridden with environment variables)
MONGODB_HOST=${MONGODB_HOST:-"localhost"}
MONGODB_PORT=${MONGODB_PORT:-"27017"}
MONGODB_ADMIN_USER=${MONGODB_ADMIN_USER:-"admin"}
MONGODB_ADMIN_PASSWORD=${MONGODB_ADMIN_PASSWORD:-"$(openssl rand -base64 12)"}
MONGODB_APP_USER=${MONGODB_APP_USER:-"agentminder"}
MONGODB_APP_PASSWORD=${MONGODB_APP_PASSWORD:-"$(openssl rand -base64 12)"}
MONGODB_DB_NAME=${MONGODB_DB_NAME:-"agent-minder-prod"}
APP_PORT=${APP_PORT:-"3000"}
JWT_SECRET=${JWT_SECRET:-"$(openssl rand -base64 32)"}
NODE_ENV=${NODE_ENV:-"production"}
LOG_LEVEL=${LOG_LEVEL:-"info"}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure we're in the project root directory
cd "$(dirname "$0")/.."

# Welcome message
echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}      Agent Minder Production Setup Script          ${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""

# Check for required tools
echo -e "${YELLOW}Checking for required tools...${NC}"
REQUIRED_TOOLS=("node" "npm" "docker" "docker-compose" "openssl")
MISSING_TOOLS=()

for tool in "${REQUIRED_TOOLS[@]}"; do
  if ! command -v "$tool" &> /dev/null; then
    MISSING_TOOLS+=("$tool")
  fi
done

if [ ${#MISSING_TOOLS[@]} -ne 0 ]; then
  echo -e "${RED}Error: The following required tools are missing:${NC}"
  for tool in "${MISSING_TOOLS[@]}"; do
    echo -e "${RED}- $tool${NC}"
  done
  echo -e "${RED}Please install them and try again.${NC}"
  exit 1
fi
echo -e "${GREEN}All required tools are installed.${NC}"
echo ""

# Create production environment file
echo -e "${YELLOW}Creating production environment file...${NC}"
cat > .env.production << EOL
NODE_ENV=${NODE_ENV}
PORT=${APP_PORT}
MONGODB_URI=mongodb://${MONGODB_APP_USER}:${MONGODB_APP_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DB_NAME}?authSource=${MONGODB_DB_NAME}
JWT_SECRET=${JWT_SECRET}
LOG_LEVEL=${LOG_LEVEL}
EOL
echo -e "${GREEN}Created .env.production file.${NC}"
echo ""

# Create Docker Compose file for production
echo -e "${YELLOW}Creating production Docker Compose file...${NC}"
cat > docker-compose.production.yml << EOL
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: agent-minder-mongodb-prod
    ports:
      - '${MONGODB_PORT}:27017'
    environment:
      - MONGO_INITDB_ROOT_USERNAME=${MONGODB_ADMIN_USER}
      - MONGO_INITDB_ROOT_PASSWORD=${MONGODB_ADMIN_PASSWORD}
    volumes:
      - mongodb_prod_data:/data/db
      - ./scripts/init-mongo-prod.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    restart: always
    healthcheck:
      test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s

  app:
    build:
      context: .
      dockerfile: Dockerfile.production
    container_name: agent-minder-app-prod
    ports:
      - '${APP_PORT}:${APP_PORT}'
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=${APP_PORT}
      - MONGODB_URI=mongodb://${MONGODB_APP_USER}:${MONGODB_APP_PASSWORD}@mongodb:27017/${MONGODB_DB_NAME}?authSource=${MONGODB_DB_NAME}
      - JWT_SECRET=${JWT_SECRET}
      - LOG_LEVEL=${LOG_LEVEL}
    depends_on:
      mongodb:
        condition: service_healthy
    restart: always

volumes:
  mongodb_prod_data:
EOL
echo -e "${GREEN}Created docker-compose.production.yml file.${NC}"
echo ""

# Create MongoDB initialization script
echo -e "${YELLOW}Creating MongoDB initialization script...${NC}"
mkdir -p scripts
cat > scripts/init-mongo-prod.js << EOL
// MongoDB initialization script for production

// Wait for MongoDB to start up
db.adminCommand('ping');

// Switch to the target database
db = db.getSiblingDB('${MONGODB_DB_NAME}');

// Create application user with appropriate permissions
db.createUser({
  user: '${MONGODB_APP_USER}',
  pwd: '${MONGODB_APP_PASSWORD}',
  roles: [
    { role: 'readWrite', db: '${MONGODB_DB_NAME}' },
    { role: 'dbAdmin', db: '${MONGODB_DB_NAME}' }
  ]
});

// Create collections with schema validation
db.createCollection('agents');
db.createCollection('commissionCalculations');
db.createCollection('commissionStructures');
db.createCollection('transactions');
db.createCollection('performanceMetrics');
db.createCollection('paymentMethods');

// Create indexes for better performance
db.agents.createIndex({ email: 1 }, { unique: true });
db.commissionCalculations.createIndex({ agent: 1 });
db.commissionCalculations.createIndex({ status: 1 });
db.transactions.createIndex({ reference: 1 });
db.transactions.createIndex({ agent: 1 });
db.transactions.createIndex({ client: 1 });
db.commissionStructures.createIndex({ agent: 1 });
db.commissionStructures.createIndex({ isDefault: 1 });
db.performanceMetrics.createIndex({ agent: 1, period: 1 });
db.paymentMethods.createIndex({ owner: 1, ownerType: 1 });

print('MongoDB initialization completed successfully.');
EOL
echo -e "${GREEN}Created MongoDB initialization script.${NC}"
echo ""

# Create Production Dockerfile
echo -e "${YELLOW}Creating production Dockerfile...${NC}"
cat > Dockerfile.production << EOL
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy application code
COPY . .

# Run linting
RUN npm run lint

# Build the TypeScript code
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Set environment variables
ENV NODE_ENV=production

# Expose the application port
EXPOSE ${APP_PORT}

# Set up healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 CMD wget --quiet --tries=1 --spider http://localhost:${APP_PORT}/api || exit 1

# Run the application
CMD ["node", "dist/index.js"]
EOL
echo -e "${GREEN}Created production Dockerfile.${NC}"
echo ""

# Update package.json with production scripts
echo -e "${YELLOW}Adding production scripts to package.json...${NC}"
# Use a temporary file to avoid issues with inline editing
node -e "
const fs = require('fs');
const path = require('path');
const packageJsonPath = path.join(process.cwd(), 'package.json');
const packageJson = require(packageJsonPath);

// Add production scripts
packageJson.scripts = {
  ...packageJson.scripts,
  'build:prod': 'tsc -p tsconfig.production.json',
  'start:prod': 'NODE_ENV=production node dist/index.js',
  'setup:prod': 'bash scripts/setup-production.sh',
  'deploy:prod': 'docker-compose -f docker-compose.production.yml up -d --build',
  'logs:prod': 'docker-compose -f docker-compose.production.yml logs -f',
  'stop:prod': 'docker-compose -f docker-compose.production.yml down',
  'backup:db': 'bash scripts/backup-mongodb.sh'
};

// Write the updated package.json
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
"
echo -e "${GREEN}Added production scripts to package.json.${NC}"
echo ""

# Create Database Backup Script
echo -e "${YELLOW}Creating database backup script...${NC}"
cat > scripts/backup-mongodb.sh << EOL
#!/bin/bash

# MongoDB Backup Script
# Backs up the Agent Minder MongoDB database

set -e  # Exit immediately if a command exits with a non-zero status

# Configuration variables (can be overridden with environment variables)
MONGODB_HOST=\${MONGODB_HOST:-"localhost"}
MONGODB_PORT=\${MONGODB_PORT:-"27017"}
MONGODB_USER=\${MONGODB_USER:-"\${MONGODB_APP_USER}"}
MONGODB_PASSWORD=\${MONGODB_PASSWORD:-"\${MONGODB_APP_PASSWORD}"}
MONGODB_DB_NAME=\${MONGODB_DB_NAME:-"agent-minder-prod"}
BACKUP_DIR=\${BACKUP_DIR:-"./backups"}
DATE_FORMAT=\$(date +%Y%m%d_%H%M%S)
BACKUP_FILENAME="\${MONGODB_DB_NAME}_\${DATE_FORMAT}.gz"

# Ensure backup directory exists
mkdir -p "\${BACKUP_DIR}"

# Perform the backup
echo "Backing up MongoDB database '\${MONGODB_DB_NAME}' to \${BACKUP_DIR}/\${BACKUP_FILENAME}..."
mongodump --host=\${MONGODB_HOST} --port=\${MONGODB_PORT} \\
  --username=\${MONGODB_USER} --password=\${MONGODB_PASSWORD} \\
  --authenticationDatabase=\${MONGODB_DB_NAME} \\
  --db=\${MONGODB_DB_NAME} --archive="\${BACKUP_DIR}/\${BACKUP_FILENAME}" --gzip

# Check if backup was successful
if [ \$? -eq 0 ]; then
  echo "Backup completed successfully."
  echo "Backup file: \${BACKUP_DIR}/\${BACKUP_FILENAME}"
  
  # Cleanup old backups (keep last 7 days)
  find "\${BACKUP_DIR}" -name "\${MONGODB_DB_NAME}_*.gz" -type f -mtime +7 -delete
  echo "Cleaned up backups older than 7 days."
else
  echo "Backup failed."
  exit 1
fi
EOL
chmod +x scripts/backup-mongodb.sh
echo -e "${GREEN}Created database backup script.${NC}"
echo ""

# Create tsconfig.production.json
echo -e "${YELLOW}Creating production TypeScript configuration...${NC}"
cat > tsconfig.production.json << EOL
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "sourceMap": false,
    "removeComments": true
  },
  "exclude": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "tests"
  ]
}
EOL
echo -e "${GREEN}Created production TypeScript configuration.${NC}"
echo ""

# Create a production setup instructions file
echo -e "${YELLOW}Creating production setup instructions...${NC}"
cat > PRODUCTION_SETUP.md << EOL
# Agent Minder Production Setup Instructions

This document provides instructions for setting up the Agent Minder application in a production environment.

## Prerequisites

Ensure you have the following installed:
- Docker and Docker Compose
- Node.js (v16+) and npm
- MongoDB Tools (for backups)

## Setup Steps

1. **Initialize the production environment:**

   \`\`\`bash
   npm run setup:prod
   \`\`\`

   This will create all the necessary configuration files and scripts for production deployment.

2. **Deploy the application:**

   \`\`\`bash
   npm run deploy:prod
   \`\`\`

   This will build and start the application and MongoDB containers as defined in docker-compose.production.yml.

3. **View logs:**

   \`\`\`bash
   npm run logs:prod
   \`\`\`

4. **Stop the application:**

   \`\`\`bash
   npm run stop:prod
   \`\`\`

## Database Backups

To create a backup of the MongoDB database:

\`\`\`bash
npm run backup:db
\`\`\`

Backups are stored in the \`./backups\` directory and are automatically rotated (keeping the last 7 days).

## Environment Variables

The following environment variables can be customized:

- \`MONGODB_HOST\`: MongoDB host (default: "localhost")
- \`MONGODB_PORT\`: MongoDB port (default: "27017")
- \`MONGODB_ADMIN_USER\`: MongoDB admin username (default: "admin")
- \`MONGODB_ADMIN_PASSWORD\`: MongoDB admin password (auto-generated if not provided)
- \`MONGODB_APP_USER\`: Application database user (default: "agentminder")
- \`MONGODB_APP_PASSWORD\`: Application database password (auto-generated if not provided)
- \`MONGODB_DB_NAME\`: Database name (default: "agent-minder-prod")
- \`APP_PORT\`: Application port (default: "3000")
- \`JWT_SECRET\`: Secret for JWT tokens (auto-generated if not provided)
- \`NODE_ENV\`: Node environment (default: "production")
- \`LOG_LEVEL\`: Logging level (default: "info")

## Security Notes

- The auto-generated passwords and JWT secret are stored in the .env.production file.
- For maximum security, you should change these credentials after initial setup and store them securely.
- Make sure to restrict access to the MongoDB port (27017) in your firewall settings.
- Consider setting up HTTPS using a reverse proxy (like Nginx) in front of the application.
EOL
echo -e "${GREEN}Created production setup instructions.${NC}"
echo ""

# Make scripts executable
chmod +x scripts/setup-production.sh
echo -e "${GREEN}Made scripts executable.${NC}"

# Summary and next steps
echo -e "${BLUE}====================================================${NC}"
echo -e "${GREEN}Production setup script completed successfully!${NC}"
echo -e "${BLUE}====================================================${NC}"
echo ""
echo -e "${YELLOW}MongoDB credentials:${NC}"
echo -e "  Admin User: ${MONGODB_ADMIN_USER}"
echo -e "  Admin Password: ${MONGODB_ADMIN_PASSWORD}"
echo -e "  App User: ${MONGODB_APP_USER}"
echo -e "  App Password: ${MONGODB_APP_PASSWORD}"
echo ""
echo -e "${YELLOW}Application settings:${NC}"
echo -e "  Database: ${MONGODB_DB_NAME}"
echo -e "  Port: ${APP_PORT}"
echo -e "  JWT Secret: ${JWT_SECRET:0:10}... (truncated)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo -e "1. Review the generated files and adjust if necessary"
echo -e "2. Deploy the application: ${GREEN}npm run deploy:prod${NC}"
echo -e "3. Check the application logs: ${GREEN}npm run logs:prod${NC}"
echo ""
echo -e "${YELLOW}For more details, see ${GREEN}PRODUCTION_SETUP.md${NC}"

# Save credentials to a secure file (this should be deleted after setup)
echo -e "${YELLOW}Saving credentials to production-credentials.txt...${NC}"
cat > production-credentials.txt << EOL
# AGENT MINDER PRODUCTION CREDENTIALS
# WARNING: Store this information securely and delete this file after setup!

MongoDB Admin User: ${MONGODB_ADMIN_USER}
MongoDB Admin Password: ${MONGODB_ADMIN_PASSWORD}
MongoDB App User: ${MONGODB_APP_USER}
MongoDB App Password: ${MONGODB_APP_PASSWORD}
JWT Secret: ${JWT_SECRET}
EOL
chmod 600 production-credentials.txt
echo -e "${GREEN}Credentials saved to production-credentials.txt${NC}"
echo -e "${RED}WARNING: Delete this file after securely storing the credentials!${NC}"

exit 0 