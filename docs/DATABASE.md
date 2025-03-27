# Agent Minder Database Operations Guide

This guide covers database operations, maintenance procedures, and best practices for the Agent Minder application's MongoDB database.

## Database Architecture

Agent Minder uses MongoDB as its primary database. The data is organized into the following collections:

- **agents**: Stores information about agents including contact details and performance metrics
- **commissionCalculations**: Records commission calculations for transactions
- **commissionStructures**: Defines commission rates and rules for different agents
- **transactions**: Stores transaction data
- **performanceMetrics**: Tracks agent performance over time
- **paymentMethods**: Stores payment method information

## Database Connection

### Development Environment

In development, the application connects to a MongoDB instance using the connection string defined in the `.env` file:

```
MONGODB_URI=mongodb://localhost:27017/agent-minder-dev
```

### Test Environment

For testing, a separate database is used to prevent affecting development data:

```
MONGODB_URI=mongodb://localhost:27018/agent-minder-test
```

### Production Environment

In production, the application connects to a MongoDB instance using a connection string with authentication:

```
MONGODB_URI=mongodb://username:password@hostname:port/database?authSource=database
```

## Database Management Operations

### Connecting to the Database

#### Development Environment

```bash
# Connect to MongoDB shell
mongosh

# Select database
use agent-minder-dev
```

#### Production Environment

```bash
# Connect to MongoDB shell with authentication
mongosh "mongodb://username:password@hostname:port/database?authSource=database"
```

### Common Query Operations

Here are some common MongoDB operations for managing the application data:

#### Find All Agents

```javascript
db.agents.find();
```

#### Find a Specific Agent by Email

```javascript
db.agents.findOne({ email: 'agent@example.com' });
```

#### Update Agent Information

```javascript
db.agents.updateOne(
  { email: 'agent@example.com' },
  { $set: { name: 'New Name', phone: '555-123-4567' } },
);
```

#### Find Recent Commission Calculations

```javascript
db.commissionCalculations.find().sort({ createdAt: -1 }).limit(10);
```

#### Find Commission Structures for a Specific Agent

```javascript
db.commissionStructures.find({ agent: ObjectId('agent_id_here') });
```

### Backup and Restore

#### Creating a Manual Backup

```bash
# Create a backup of the production database
mongodump --uri="mongodb://username:password@hostname:port/database?authSource=database" --out=./backup/$(date +%Y%m%d)
```

#### Using the Backup Script

```bash
# Using the provided script
npm run backup:db
```

#### Restoring from a Backup

```bash
# Using the provided script
./scripts/restore-mongodb.sh <backup_filename>
```

#### Manual Restore

```bash
# Restore a specific backup
mongorestore --uri="mongodb://username:password@hostname:port/database?authSource=database" --nsInclude="database.*" --drop ./backup/20230101/database
```

## Database Maintenance

### Index Management

Indexes are created during initialization, but you can manually manage them:

#### View Current Indexes

```javascript
db.agents.getIndexes();
```

#### Create a New Index

```javascript
db.agents.createIndex({ lastName: 1 });
```

#### Remove an Index

```javascript
db.agents.dropIndex('lastName_1');
```

### Database Statistics

#### View Collection Statistics

```javascript
db.agents.stats();
```

#### View Database Statistics

```javascript
db.stats();
```

### Database User Management

#### Creating a New Database User

```javascript
db.createUser({
  user: 'new_user',
  pwd: 'secure_password',
  roles: [{ role: 'readWrite', db: 'agent-minder-prod' }],
});
```

#### Modifying User Roles

```javascript
db.updateUser('existing_user', {
  roles: [
    { role: 'readWrite', db: 'agent-minder-prod' },
    { role: 'dbAdmin', db: 'agent-minder-prod' },
  ],
});
```

#### Removing a User

```javascript
db.dropUser('user_to_remove');
```

## Data Migration

When performing schema changes or data migrations:

1. Create a backup before migration
2. Write a migration script using Mongoose or MongoDB native driver
3. Test the migration in a development environment
4. Schedule maintenance window for production migration
5. Apply the migration
6. Verify data integrity after migration

### Example Migration Script

Here's an example of a simple migration script to update the schema:

```javascript
// Migration script to add 'status' field to all transactions
const { MongoClient } = require('mongodb');

async function migrate() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    const transactions = db.collection('transactions');

    // Update all transactions without a status field
    const result = await transactions.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'completed' } },
    );

    console.log(`Migration completed. Updated ${result.modifiedCount} documents.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.close();
  }
}

migrate();
```

## Performance Optimization

### Query Optimization

1. Use appropriate indexes for frequent queries
2. Limit the fields returned in queries using projection
3. Use pagination for large result sets
4. Consider using aggregation pipeline for complex queries

## Database Logging

The application includes a comprehensive database operation logging system through a custom Mongoose plugin.

### Mongoose Logger Plugin

The Mongoose logger plugin automatically logs all database operations across all models:

- Document creation (save)
- Document updates
- Find operations
- Delete operations

This logging provides a complete audit trail of database interactions and helps with debugging and performance monitoring.

### How It Works

1. Each model in the system includes the plugin:

   ```typescript
   // Example from Agent model
   import { mongooseLogger } from '../utils/mongooseLogger';

   // Define schema
   const agentSchema = new Schema<IAgent>(
     {
       // Schema definition
     },
     { timestamps: true },
   );

   // Add logging plugin
   agentSchema.plugin(mongooseLogger);
   ```

2. The plugin hooks into Mongoose middleware to log operations:

   - pre/post save
   - pre/post findOne/findMany
   - pre/post update/updateOne/updateMany
   - pre/post delete/deleteOne/deleteMany

3. Logs include important metadata:
   - Operation type (create, update, find, delete)
   - Collection name
   - Document ID(s)
   - Query filters (for find operations)
   - Update data (for update operations)
   - Execution time
   - Errors (when operations fail)

### Example Logs

```
[2023-07-15T13:25:45.123Z] INFO: Document saved successfully {"service":"agent-minder","collection":"agents","documentId":"60d21b4667d0d8992e610c85"}

[2023-07-15T13:30:12.456Z] INFO: Documents found {"service":"agent-minder","collection":"commissionCalculations","filter":{"agent":"60d21b4667d0d8992e610c85","status":"pending"},"count":5}

[2023-07-15T13:32:30.789Z] ERROR: Error saving document {"service":"agent-minder","collection":"transactions","documentId":"60d21b4667d0d8992e610c99","errorMessage":"Validation failed"}
```

### Benefits of Database Logging

1. **Troubleshooting**: Quickly identify failed operations and their causes
2. **Performance Monitoring**: Track slow queries and optimize them
3. **Audit Trail**: Maintain a record of all data changes for compliance
4. **Security**: Detect unusual or unauthorized access patterns
5. **Development**: Understand application behavior and data flow

### Accessing Logs

Database logs are stored along with application logs in the `logs/` directory, with separate files based on log level:

- `error.log` - Contains all error-level database operation logs
- `combined.log` - Contains all database operation logs

For production systems, log aggregation tools like ELK Stack (Elasticsearch, Logstash, Kibana) or Graylog can be used to centralize and analyze logs.

## Monitoring and Alerting

### Monitoring Database Performance

Use the monitoring script to check database health:

```bash
./scripts/monitor.sh
```

### Setting Up Database Alerts

The monitoring script already includes alerts for:

- Database connectivity issues
- High disk usage
- High memory usage

You can customize alert thresholds by modifying the script.

## Troubleshooting

### Common Issues and Solutions

#### Slow Queries

1. Check if appropriate indexes exist
2. Review query patterns and optimize
3. Use MongoDB's explain feature to analyze query performance:
   ```javascript
   db.agents.find({ email: /example.com$/ }).explain('executionStats');
   ```

#### Connection Issues

1. Verify network connectivity
2. Check authentication credentials
3. Ensure MongoDB service is running
4. Check for connection limits or firewall restrictions

#### Data Consistency Issues

1. Use MongoDB's validation features for schema enforcement
2. Implement application-level validation
3. Consider using transactions for operations that modify multiple documents

## Best Practices

1. **Regular Backups**: Maintain daily backups and test restore procedures regularly
2. **Index Management**: Regularly review and optimize indexes
3. **Schema Design**: Follow MongoDB schema design best practices
4. **Authentication**: Always use authentication in production
5. **Monitoring**: Set up proactive monitoring and alerts
6. **Version Control**: Use version control for database migration scripts
7. **Testing**: Test all database changes in a non-production environment first

## Additional Resources

- [MongoDB Documentation](https://docs.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB University](https://university.mongodb.com/) - Free courses on MongoDB
- [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) - Managed MongoDB service for production deployment
