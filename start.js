#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logError(message) {
  log(`ERROR: ${message}`, 'red');
}

function logSuccess(message) {
  log(`SUCCESS: ${message}`, 'green');
}

function logInfo(message) {
  log(`INFO: ${message}`, 'blue');
}

function logWarning(message) {
  log(`WARNING: ${message}`, 'yellow');
}

// Check if .env file exists
function checkEnvironment() {
  const envPath = path.join(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    logError('.env file not found!');
    logInfo('Please create a .env file with the following variables:');
    log(`
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/attendance_monitor
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload Configuration
MAX_FILE_SIZE=100mb
UPLOAD_PATH=./uploads

# Logging Configuration
LOG_LEVEL=info
LOG_FILE=./logs/app.log
    `, 'cyan');
    process.exit(1);
  }
  
  logSuccess('Environment configuration found');
}

// Check if node_modules exists
function checkDependencies() {
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  
  if (!fs.existsSync(nodeModulesPath)) {
    logWarning('node_modules not found. Installing dependencies...');
    return installDependencies();
  }
  
  logSuccess('Dependencies found');
  return Promise.resolve();
}

// Install dependencies
function installDependencies() {
  return new Promise((resolve, reject) => {
    logInfo('Running npm install...');
    
    const npm = spawn('npm', ['install'], {
      stdio: 'inherit',
      shell: true
    });
    
    npm.on('close', (code) => {
      if (code === 0) {
        logSuccess('Dependencies installed successfully');
        resolve();
      } else {
        logError(`npm install failed with code ${code}`);
        reject(new Error('Dependency installation failed'));
      }
    });
    
    npm.on('error', (error) => {
      logError(`Failed to start npm install: ${error.message}`);
      reject(error);
    });
  });
}

// Check if MongoDB is running
function checkMongoDB() {
  return new Promise((resolve) => {
    // Silently check MongoDB connection without logging warnings
    const mongoCheck = spawn('node', ['-e', `
      const mongoose = require('mongoose');
      mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/attendance_monitor')
        .then(() => {
          console.log('MongoDB connection successful');
          process.exit(0);
        })
        .catch(err => {
          console.error('MongoDB connection failed:', err.message);
          process.exit(1);
        });
    `], {
      stdio: 'pipe',
      shell: true,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    let output = '';
    mongoCheck.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    mongoCheck.stderr.on('data', (data) => {
      output += data.toString();
    });
    
    mongoCheck.on('close', (code) => {
      if (code === 0) {
        logSuccess('MongoDB connection verified');
      }
      // Silently resolve regardless of connection status
      resolve();
    });
  });
}

// Create necessary directories
function createDirectories() {
  const directories = [
    'uploads',
    // 'uploads/screenshots',
    // 'uploads/recordings',
    'logs'
  ];
  
  directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      logInfo(`Created directory: ${dir}`);
    }
  });
  
  logSuccess('Directory structure verified');
}

// Start the application
function startApplication() {
  logInfo('Starting Task Management Module...');
  
  const app = spawn('node', ['src/app.js'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV || 'development' }
  });
  
  app.on('close', (code) => {
    if (code !== 0) {
      logError(`Application exited with code ${code}`);
      process.exit(code);
    }
  });
  
  app.on('error', (error) => {
    logError(`Failed to start application: ${error.message}`);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    logInfo('Received SIGINT, shutting down gracefully...');
    app.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    logInfo('Received SIGTERM, shutting down gracefully...');
    app.kill('SIGTERM');
  });
}

// Main startup function
async function main() {
  try {
    log('🚀 Starting Task Management module', 'bright');
    log('=====================================', 'bright');
    
    // Check environment
    checkEnvironment();
    
    // Check and install dependencies
    await checkDependencies();
    
    // Create directories
    createDirectories();
    
    // Check MongoDB (optional)
    await checkMongoDB();
    
    // Start application
    startApplication();
    
  } catch (error) {
    logError(`Startup failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the startup
if (require.main === module) {
  main();
}

module.exports = { main }; 