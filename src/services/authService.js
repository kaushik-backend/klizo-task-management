const axios = require('axios');
const {jwtDecode} = require('jwt-decode');
const { updateEnvFile } = require('../config/env');

// Function to get a new token by sending a login request
async function getNewToken() {
  try {
    const response = await axios.post('https://dev.new.attendance.klizos.com/api/login', {
      email: 'kaushik@klizos.com',
      password: 'Kaushik@2025',
    });

    const token = response.data.token;  // Assuming the token is in the 'token' field
    console.log('New token received:', token);

    // Update the .env file with the new token
    updateEnvFile(token);
  } catch (error) {
    console.error('Error getting new token:', error);
  }
}

// Function to decode the JWT token and get its expiration time
function getTokenExpirationTime(token) {
  const decoded = jwtDecode(token);
  return decoded.exp * 1000;  // Convert exp to milliseconds
}

// Function to check and refresh the token if expired
function checkAndRefreshToken() {
  const token = process.env.ATTENDANCE_API_ACCESS_TOKEN;
  const expirationTime = getTokenExpirationTime(token);
  const currentTime = Date.now();

  // If the token has expired (or is about to expire), refresh it
  if (currentTime > expirationTime) {
    console.log('Token has expired, refreshing...');
    getNewToken();
  } else {
    console.log('Token is still valid.');
  }
}

// Check the token every 30 minutes (or adjust the frequency as needed)
setInterval(checkAndRefreshToken, 30 * 60 * 1000);  // 30 minutes

module.exports = { getNewToken, checkAndRefreshToken };
