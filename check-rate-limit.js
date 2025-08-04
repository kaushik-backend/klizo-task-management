const axios = require('axios');

const checkRateLimit = async () => {
  try {
    console.log('🔍 Checking rate limit status...');
    
    const response = await axios.get('http://localhost:3000/health');
    console.log('✅ Server is running');
    console.log('📊 Health check response:', response.data);
    
    // Try a login request to see rate limit headers
    try {
      const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      console.log('✅ Login endpoint accessible');
    } catch (error) {
      if (error.response?.status === 429) {
        console.log('❌ Rate limited! Headers:', error.response.headers);
        console.log('💡 Wait 15 minutes or restart the server');
      } else if (error.response?.status === 400) {
        console.log('✅ Login endpoint working (expected 400 for wrong credentials)');
      } else {
        console.log('⚠️ Unexpected error:', error.response?.status);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
};

checkRateLimit(); 