// services/employeeService.js
const axios = require('axios');
require("dotenv").config()
const attendanceApiToken= process.env.ATTENDANCE_API_ACCESS_TOKEN;
const EMPLOYEE_SERVICE_BASE_URL = process.env.EMPLOYEE_SERVICE_BASE_URL; // e.g., http://localhost:4000/api

const token= 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2Rldi5uZXcuYXR0ZW5kYW5jZS5rbGl6b3MuY29tL2FwaS9sb2dpbiIsImlhdCI6MTc1MzM1MzcxMSwiZXhwIjoxNzUzNDQwMTExLCJuYmYiOjE3NTMzNTM3MTEsImp0aSI6ImhYeGpwOGJpVFVIODQ3MEUiLCJzdWIiOiI2ODgxZGMyM2QwZjg2ZDg1MGIwZGM2NTIiLCJwcnYiOiIyM2JkNWM4OTQ5ZjYwMGFkYjM5ZTcwMWM0MDA4NzJkYjdhNTk3NmY3IiwidGVuYW50X2lkIjoiNjg2Y2NlYjYxZDgyODk0NThkZDg4ZGVkIiwicm9sZV9pZCI6NH0.xjofmNxS6NrlwCvPDxjUMOXzhAaG3kd-LRfQ47Z1caQ'
async function getEmployees() {
  try {
   const response = await axios.get(`https://dev.new.attendance.klizos.com/api/get-employee-list`, {
      headers: {
        'Authorization': `Bearer ${attendanceApiToken}`  // Include the Bearer token in the headers
      }
    });
    console.log(response.data);
    return response.data;
  } catch (err) {
    console.error(`Error fetching employees`, err.message);
    throw new Error('Unable to fetch employee data');
  }
}

async function getEmployeeById(id) {
  console.log("========api token========",attendanceApiToken);
  try {
    const response = await axios.get(
      `https://dev.new.attendance.klizos.com/api/users/${id}`,
      {
        headers: {
          Authorization: `Bearer ${attendanceApiToken}`,
        },
      }
    );
    return response.data;
  } catch (err) {
    console.error(`Error fetching employee with ID ${id}:`, err.message);
    return null;
  }
}


module.exports = {
  getEmployees,
  getEmployeeById
};
