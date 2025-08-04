// testEmployeeService.js
const { getEmployeeById } = require('./src/services/EmployeeFetchService');

// Replace this with a valid employee ID from your attendance software
const testEmployeeId = '6865128178adc279ba0c4c13';

(async () => {
  try {
    const employee = await getEmployeeById(testEmployeeId);
    console.log('Employee data:', employee);
  } catch (err) {
    console.error('Error during testing:', err.message);
  }
})();
