const axios = require('axios');

// Axios instance for API requests to the attendance service
const apiClient = axios.create({
  baseURL: 'https://dev.new.attendance.klizos.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the token to the Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = process.env.ATTENDANCE_API_ACCESS_TOKEN;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

module.exports = apiClient;
