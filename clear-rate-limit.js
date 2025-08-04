const rateLimit = require('express-rate-limit');

// This script helps clear rate limiting for testing
console.log('Rate limiting information:');
console.log('- Login: 50 attempts per 15 minutes in development');
console.log('- Register: 20 attempts per hour in development');
console.log('- Global: 10,000 requests per 15 minutes in development');
console.log('');
console.log('To clear rate limits, restart the server or wait for the time window to expire.');
console.log('Current environment:', process.env.NODE_ENV || 'development');

// If you need to test immediately, you can:
// 1. Restart the server
// 2. Use a different IP address
// 3. Wait for the rate limit window to expire 