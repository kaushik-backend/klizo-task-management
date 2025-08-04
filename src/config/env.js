const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Function to update .env file with a new token
function updateEnvFile(token) {
  const envFilePath = '.env';
  let envConfig = dotenv.parse(fs.readFileSync(envFilePath));

  // Update the ATTENDANCE_API_ACCESS_TOKEN key with the new token
  envConfig.ATTENDANCE_API_ACCESS_TOKEN = token;

  // Convert the object back into a string format and write it back to the .env file
  const newEnvContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  fs.writeFileSync(envFilePath, newEnvContent);
  console.log('Token updated in .env file');
}

module.exports = { updateEnvFile };
