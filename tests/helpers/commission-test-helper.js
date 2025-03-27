// Helper functions for commission structure testing
const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

/**
 * Creates a commission structure directly in MongoDB using native driver
 * This bypasses any Mongoose validation/timeout issues
 */
async function createCommissionStructureDirectly(mongoUri, structureData) {
  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000,
  });
  
  try {
    await client.connect();
    console.log('Connected directly to MongoDB for creating commission structure');
    
    const db = client.db('agent-minder-test');
    const collection = db.collection('commissionstructures');
    
    // Ensure we have a proper _id field as ObjectId
    if (structureData._id && typeof structureData._id === 'string') {
      structureData._id = new mongoose.Types.ObjectId(structureData._id);
    }
    
    // Add createdAt/updatedAt timestamps that Mongoose would normally add
    const now = new Date();
    const documentToInsert = {
      ...structureData,
      createdAt: now,
      updatedAt: now,
      __v: 0
    };
    
    console.log('Inserting commission structure directly:', documentToInsert);
    const result = await collection.insertOne(documentToInsert);
    console.log(`Commission structure created with ID: ${result.insertedId}`);
    
    return {
      success: true,
      _id: result.insertedId.toString()
    };
  } catch (error) {
    console.error('Error creating commission structure directly:', error);
    return {
      success: false,
      error
    };
  } finally {
    await client.close();
  }
}

/**
 * Creates a commission calculation directly in MongoDB using native driver
 * This bypasses any Mongoose validation/timeout issues
 */
async function createCommissionCalculationDirectly(mongoUri, calculationData) {
  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 60000,
    connectTimeoutMS: 60000,
    socketTimeoutMS: 60000,
  });
  
  try {
    await client.connect();
    console.log('Connected directly to MongoDB for creating commission calculation');
    
    const db = client.db('agent-minder-test');
    const collection = db.collection('commissioncalculations');
    
    // Ensure we have a proper _id field as ObjectId
    if (calculationData._id && typeof calculationData._id === 'string') {
      calculationData._id = new mongoose.Types.ObjectId(calculationData._id);
    }
    
    // Convert string references to ObjectIds
    if (calculationData.agent && typeof calculationData.agent === 'string') {
      calculationData.agent = new mongoose.Types.ObjectId(calculationData.agent);
    }
    
    if (calculationData.transaction && typeof calculationData.transaction === 'string') {
      calculationData.transaction = new mongoose.Types.ObjectId(calculationData.transaction);
    }
    
    if (calculationData.commissionStructure && typeof calculationData.commissionStructure === 'string') {
      calculationData.commissionStructure = new mongoose.Types.ObjectId(calculationData.commissionStructure);
    }
    
    // Add createdAt/updatedAt timestamps that Mongoose would normally add
    const now = new Date();
    const documentToInsert = {
      ...calculationData,
      createdAt: now,
      updatedAt: now,
      __v: 0
    };
    
    console.log('Inserting commission calculation directly:', documentToInsert);
    const result = await collection.insertOne(documentToInsert);
    console.log(`Commission calculation created with ID: ${result.insertedId}`);
    
    return {
      success: true,
      _id: result.insertedId.toString()
    };
  } catch (error) {
    console.error('Error creating commission calculation directly:', error);
    return {
      success: false,
      error
    };
  } finally {
    await client.close();
  }
}

module.exports = {
  createCommissionStructureDirectly,
  createCommissionCalculationDirectly
}; 