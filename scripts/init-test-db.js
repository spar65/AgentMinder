// This script initializes the test database with proper authentication
const { MongoClient } = require('mongodb');

async function initTestDb() {
  console.log('Initializing test database...');
  
  // Connect to MongoDB as admin
  const adminUri = 'mongodb://testadmin:testpassword@localhost:27018/admin?authSource=admin';
  const client = new MongoClient(adminUri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB test instance');
    
    // Create test database
    const db = client.db('agent-minder-test');
    
    try {
      // Drop any existing test database collections to start clean
      const collections = await db.listCollections().toArray();
      for (const collection of collections) {
        await db.collection(collection.name).drop();
        console.log(`Dropped collection: ${collection.name}`);
      }
    } catch (err) {
      // Ignore errors if collections don't exist
      console.log('No collections to drop or error dropping collections:', err.message);
    }
    
    // Create a test user for the agent-minder-test database with full permissions
    try {
      const result = await db.command({
        createUser: 'testdbuser',
        pwd: 'testdbpassword',
        roles: [
          { role: 'readWrite', db: 'agent-minder-test' },
          { role: 'dbAdmin', db: 'agent-minder-test' },
          { role: 'userAdmin', db: 'agent-minder-test' }
        ]
      });
      console.log('Test user created or updated:', result);
    } catch (error) {
      if (error.code === 51003) {
        console.log('User already exists, updating user...');
        try {
          // Update user if it already exists
          await db.command({
            updateUser: 'testdbuser',
            pwd: 'testdbpassword',
            roles: [
              { role: 'readWrite', db: 'agent-minder-test' },
              { role: 'dbAdmin', db: 'agent-minder-test' },
              { role: 'userAdmin', db: 'agent-minder-test' }
            ]
          });
          console.log('User updated successfully');
        } catch (updateError) {
          console.error('Error updating user:', updateError);
        }
      } else {
        console.error('Error creating user:', error);
      }
    }
    
    // Create some collections to ensure the database is initialized
    await db.createCollection('agents');
    await db.createCollection('commissionCalculations');
    await db.createCollection('commissionStructures');
    
    console.log('Test collections created');
    console.log('Test database initialized successfully');
  } catch (error) {
    console.error('Error initializing test database:', error);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed');
  }
}

initTestDb(); 