require('dotenv').config();

console.log('🔍 Debugging Environment Variables...');
console.log('=====================================');

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI);
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('REDIS_URL:', process.env.REDIS_URL);

console.log('\n🔍 Testing MongoDB Connection...');
console.log('================================');

const mongoose = require('mongoose');

async function testConnection() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/klizo_monitor';
    console.log('Using URI:', mongoUri);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log('✅ MongoDB connection successful!');
    console.log('Database:', mongoose.connection.db.databaseName);
    
    await mongoose.disconnect();
    console.log('🔌 Disconnected');
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
  }
}

testConnection(); 