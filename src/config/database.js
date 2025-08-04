const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectToDatabase = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/task-management';
    
    logger.info('🔍 Connecting to MongoDB...');
    logger.info(`📡 Connection string: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
    
    // Validate connection string format
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB connection string format. Must start with mongodb:// or mongodb+srv://');
    }
    
    await mongoose.connect(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
    });

    logger.info('✅ Connected to MongoDB successfully');
    logger.info(`📊 Database: ${mongoose.connection.db.databaseName}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('🔄 MongoDB reconnected');
    });

  } catch (error) {
    logger.error('❌ Failed to connect to MongoDB:', error.message);
    logger.error('🔍 Error details:', {
      name: error.name,
      code: error.code,
      message: error.message
    });
    
    // Provide helpful error messages
    if (error.name === 'MongoNetworkError') {
      logger.error('🔧 MongoDB is not running. Please start MongoDB:');
      logger.error('   Windows: Start MongoDB service');
      logger.error('   macOS: brew services start mongodb-community');
      logger.error('   Linux: sudo systemctl start mongod');
    } else if (error.name === 'MongoServerSelectionError') {
      logger.error('🔧 Cannot reach MongoDB server. Check:');
      logger.error('   1. MongoDB is running');
      logger.error('   2. Connection string is correct');
      logger.error('   3. Network connectivity');
    } else if (error.name === 'MongoParseError') {
      logger.error('🔧 Invalid MongoDB connection string. Check MONGODB_URI in .env file');
      logger.error('   Expected format: mongodb://localhost:27017/database_name');
      logger.error('   Or: mongodb+srv://username:password@cluster.mongodb.net/database_name');
    }
    
    // Don't exit immediately, let the application handle it
    throw error;
  }
};

const disconnectFromDatabase = async () => {
  try {
    await mongoose.disconnect();
    logger.info('🔌 Disconnected from MongoDB');
  } catch (error) {
    logger.error('❌ Error disconnecting from MongoDB:', error);
  }
};

module.exports = {
  connectToDatabase,
  disconnectFromDatabase
}; 