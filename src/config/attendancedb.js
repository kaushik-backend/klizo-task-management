// currently not using attendance db directly ----- to be used if needed later
const mongoose = require('mongoose');
const logger = require('../utils/logger');

let attendanceDbConnection; // To hold the Attendance DB connection

const connectToAttendanceDatabase = async () => {
  try {
    const mongoUri = process.env.ATTENDANCE_DB_URI; // Your attendance database URI
  
    logger.info('🔍 Connecting to Attendance MongoDB...');
    logger.info(`📡 Connection string: ${mongoUri.replace(/\/\/.*@/, '//***:***@')}`); // Hide credentials in logs
    
    // Validate connection string format
    if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
      throw new Error('Invalid MongoDB connection string format. Must start with mongodb:// or mongodb+srv://');
    }

    // Use `createConnection` for a separate connection instance
    attendanceDbConnection = mongoose.createConnection(mongoUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000, // Increased timeout
      socketTimeoutMS: 45000,
      readPreference: 'primaryPreferred', // Read-only preference for Attendance DB
    });

    // Block all write operations on this connection
    blockWriteOperations();

    attendanceDbConnection.on('error', (err) => {
      logger.error('❌ Attendance MongoDB connection error:', err);
    });

    attendanceDbConnection.on('disconnected', () => {
      logger.warn('⚠️ Attendance MongoDB disconnected');
    });

    attendanceDbConnection.on('reconnected', () => {
      logger.info('🔄 Attendance MongoDB reconnected');
    });

    logger.info('✅ Connected to Attendance MongoDB successfully');

    logger.info(`📊 Database: ${attendanceDbConnection.dbName}`);
    console.log("attendance-db name==========",` ${attendanceDbConnection.dbName}`)
    //  registerModels();
    
  } catch (error) {
    logger.error('❌ Failed to connect to Attendance MongoDB:', error.message);
    throw error;
  }
};

const registerModels = () => {
  // Access the already defined Employee model from the Attendance DB
  const Employee = attendanceDbConnection.model('Employee'); // This assumes the 'Employee' model already exists in the Attendance DB schema

  // Now you can use Employee model in your task-management module
  module.exports.Employee = Employee;
};

// Block write operations on the Attendance DB connection
const blockWriteOperations = () => {
  // Override save to prevent write
  attendanceDbConnection.model = (name, schema) => {
    const model = mongoose.model(name, schema);
    const originalSave = model.prototype.save;

    model.prototype.save = async function () {
      throw new Error('Write  from task-management module is blocked on the Attendance database.');
    };

    return model;
  };

  // Similarly, block other write operations like insertMany, update, etc.
  const originalInsertMany = attendanceDbConnection.collection.insertMany;
  attendanceDbConnection.collection.insertMany = async function () {
    throw new Error('Write operation is blocked on the Attendance database.');
  };

  const originalUpdate = attendanceDbConnection.collection.update;
  attendanceDbConnection.collection.update = async function () {
    throw new Error('Write operation is blocked on the Attendance database.');
  };

  const originalUpdateOne = attendanceDbConnection.collection.updateOne;
  attendanceDbConnection.collection.updateOne = async function () {
    throw new Error('Write operation is blocked on the Attendance database.');
  };

  const originalUpdateMany = attendanceDbConnection.collection.updateMany;
  attendanceDbConnection.collection.updateMany = async function () {
    throw new Error('Write operation is blocked on the Attendance database.');
  };
};

// Disconnect from the Attendance DB
const disconnectFromAttendanceDatabase = async () => {
  try {
    await attendanceDbConnection.close();
    logger.info('🔌 Disconnected from Attendance MongoDB');
  } catch (error) {
    logger.error('❌ Error disconnecting from Attendance MongoDB:', error);
  }
};

module.exports = {
  connectToAttendanceDatabase,
  disconnectFromAttendanceDatabase,
  registerModels
};
