# Agent Minder Production Setup Guide

This guide provides comprehensive instructions for setting up, deploying, monitoring, and maintaining the Agent Minder application in a production environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Initial Setup](#initial-setup)
- [Deployment](#deployment)
- [Database Management](#database-management)
- [Monitoring](#monitoring)
- [Maintenance](#maintenance)
- [Security Considerations](#security-considerations)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Ensure you have the following installed on your production server:

- Docker and Docker Compose (version 1.27+)
- Node.js (v16+) and npm
- MongoDB Tools (for backups and restores)
- OpenSSL (for generating secure credentials)
- Mail command (optional, for notifications)

## Initial Setup

### 1. Initialize the Production Environment

Run the production setup script:

```bash
npm run setup:prod
```

This script will:

- Check for required tools and dependencies
- Create necessary Docker configuration files
- Generate secure passwords and credentials
- Set up environment variables in `.env.production`
- Create database initialization scripts
- Generate Dockerfile and docker-compose configuration
- Create maintenance and monitoring scripts
- Generate production TypeScript configuration
- Update package.json with production scripts

During setup, the system will automatically generate:

- MongoDB admin credentials
- MongoDB application credentials
- JWT secret for API authentication
- All necessary configuration files

A summary of generated credentials will be displayed at the end of the setup and also saved to `production-credentials.txt`. **IMPORTANT**: Securely store these credentials and then delete this file.

### 2. Customizing Configuration

If you need to customize the default configuration, you can set the following environment variables before running the setup script:

```bash
# Example of customizing the setup
export MONGODB_HOST="mongodb.example.com"
export MONGODB_PORT="27017"
export MONGODB_ADMIN_USER="admin"
export MONGODB_ADMIN_PASSWORD="your-secure-password"
export APP_PORT="8080"
export JWT_SECRET="your-jwt-secret"
npm run setup:prod
```

### 3. Environment-Specific Configuration

For environment-specific configuration, you can modify the `.env.production` file after it's generated. This file contains sensitive configuration and should not be committed to version control.

## Deployment

### 1. Deploy the Application

After completing the setup, deploy the application using:

```bash
npm run deploy:prod
```

This will:

- Build the Docker images
- Create and start the containers
- Set up the MongoDB database
- Initialize database collections and indexes
- Start the application server

### 2. Verify Deployment

Check the logs to verify the deployment:

```bash
npm run logs:prod
```

### 3. Run Health Check

Verify that all services are running correctly:

```bash
./scripts/health-check.sh
```

This will check:

- API endpoints
- API documentation availability
- MongoDB connection
- Docker container status
- System resource usage (disk space, memory)

### 4. Managing the Application

- **View logs**: `npm run logs:prod`
- **Stop the application**: `npm run stop:prod`
- **Restart the application**: `npm run stop:prod && npm run deploy:prod`

## Database Management

### Backup Management

The setup creates a robust backup system for your MongoDB database.

#### Creating Backups

To create a backup:

```bash
npm run backup:db
```

By default, backups are stored in the `./backups` directory and are automatically rotated (keeping the last 7 days).

You can customize the backup configuration by setting environment variables:

```bash
# Example of customizing backup configuration
export MONGODB_HOST="localhost"
export MONGODB_PORT="27017"
export MONGODB_USER="agentminder"
export MONGODB_PASSWORD="your-password"
export MONGODB_DB_NAME="agent-minder-prod"
export BACKUP_DIR="/path/to/backup/directory"
npm run backup:db
```

#### Automating Backups

For automated regular backups, set up a cron job:

```bash
# Backup database daily at 2 AM
0 2 * * * cd /path/to/agent-minder && npm run backup:db >> /var/log/agent-minder-backup.log 2>&1
```

#### Restoring from Backup

To restore a database from backup:

```bash
./scripts/restore-mongodb.sh <backup_filename>
```

If you don't specify a path, the script will look in the default `./backups` directory.

Running the restore script without parameters will list available backups:

```bash
./scripts/restore-mongodb.sh
```

## Monitoring

### Health Monitoring

The setup includes a health check script that can be run manually or automatically to check the health of your application.

#### Manual Health Check

```bash
./scripts/health-check.sh
```

#### Automated Monitoring

For continuous monitoring, use the monitoring script with a cron job:

```bash
# Check health every 15 minutes
*/15 * * * * cd /path/to/agent-minder && ./scripts/monitor.sh >> /var/log/agent-minder-monitor.log 2>&1
```

The monitoring script will:

- Check API endpoints
- Verify database connectivity
- Monitor Docker container health
- Check system resources
- Send email notifications when issues are detected

#### Customizing Monitoring

You can customize the monitoring configuration by setting environment variables:

```bash
# Example of customizing monitoring configuration
export APP_HOST="app.example.com"
export APP_PORT="8080"
export NOTIFICATION_EMAIL="alerts@example.com"
export DISK_THRESHOLD="85"  # Send alert when disk usage exceeds 85%
export MEMORY_THRESHOLD="80"  # Send alert when memory usage exceeds 80%
./scripts/monitor.sh
```

### Log Management

Application logs are available through Docker:

```bash
npm run logs:prod
```

For persistent log storage, consider configuring Docker to use a logging driver that stores logs externally.

## Maintenance

### Updating the Application

To update the application:

1. Pull the latest code:

   ```bash
   git pull origin main
   ```

2. Rebuild and redeploy:
   ```bash
   npm run deploy:prod
   ```

### Scaling

For vertical scaling, adjust the resources allocated to your Docker containers in the `docker-compose.production.yml` file.

For horizontal scaling, consider:

1. Setting up a load balancer
2. Configuring MongoDB replication
3. Using Docker Swarm or Kubernetes for container orchestration

## Security Considerations

### Network Security

- Configure a firewall to restrict access to only necessary ports
- Use HTTPS with a valid SSL certificate
- Consider using a reverse proxy (like Nginx) in front of the application

### Database Security

- The MongoDB container is configured with authentication enabled
- Database credentials are stored in the `.env.production` file
- Regular backups are essential for data security

### Secret Management

- Credentials are generated securely during setup
- JWT secret is used for API authentication
- Consider using a dedicated secrets management system for production environments

## Troubleshooting

### Common Issues

#### Application Not Starting

Check the logs for errors:

```bash
npm run logs:prod
```

#### Database Connection Issues

1. Verify that the MongoDB container is running:

   ```bash
   docker ps | grep agent-minder-mongodb
   ```

2. Check MongoDB logs:

   ```bash
   docker logs agent-minder-mongodb-prod
   ```

3. Verify connection string in `.env.production`

#### Database Restore Failing

1. Ensure MongoDB is running
2. Check that the backup file exists and is not corrupted
3. Verify that you have the correct credentials

### Getting Help

If you encounter issues not covered in this guide:

1. Check the application logs
2. Review the MongoDB documentation
3. Consult the Docker documentation
4. File an issue in the project repository with detailed information about the problem

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Node.js Documentation](https://nodejs.org/en/docs/)
