// routes/employeeSearch.js
const express = require('express');
const router = express.Router();
const { getEmployees } = require('../services/EmployeeFetchService'); 
const {Employee} = require("../config/attendancedb");


// testing attendance db 
router.get("/", async(req,res)=>{
    try{
      const employee = await Employee.find();
      return res.status(200).json({success:true,data:employee, message:"employees fetched"})
    }catch(err){
      console.error('error fetching employee',err);
    }
})

/**
 * @swagger
 * /user/search-employees:
 *   get:
 *     summary: Search employees by name or email
 *     tags: [Users]
 *     parameters:
 *       - name: query
 *         in: query
 *         description: Name or email of the employee to search for
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of employees matching the search query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       emp_id:
 *                         type: string
 *       400:
 *         description: Missing search query
 *       404:
 *         description: No matching employees found
 *       500:
 *         description: Server error
 */
router.get('/search-employees', async (req, res) => {
  const { query } = req.query; // The search query (name or desgn)-- email soon to be updated by attendance team
  
  if (!query) {
    return res.status(400).json({ success: false, message: 'Search query is required' });
  }

  try {
    // Fetch all employees from the Attendance Software project
    const employees = await getEmployees();

    // Filter employees by name or email (case-insensitive search)
    const filteredEmployees = employees.data.filter((employee) => {
      return (
        employee.name.toLowerCase().includes(query.toLowerCase()) ||
        employee.designation.toLowerCase().includes(query.toLowerCase())
      );
    });

    if (filteredEmployees.length === 0) {
      return res.status(404).json({ success: false, message: 'No employees found' });
    }

    return res.status(200).json({ success: true, data: filteredEmployees });
  } catch (err) {
    console.error('Error fetching employees:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
