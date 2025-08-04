// testEmployeeService.js
const { getEmployees } = require('./src/services/EmployeeFetchService');

// Replace this with a valid employee ID from your attendance software
// const testEmployeeId = '685b9cbef4306c8fad01e0c3';

(async () => {
  try {
    const employee = await getEmployees();
    console.log('Employee data:', employee);
  } catch (err) {
    console.error('Error during testing:', err.message);
  }
})();
