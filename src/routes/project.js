const express = require('express');
const router = express.Router();
const Project = require('../models/Project');
const Backlog = require('../models/Backlog');
const { getEmployeeById } = require('../services/EmployeeFetchService');
const { body,param, validationResult } = require('express-validator');
const Issue = require('../models/Issue');
const mongoose= require("mongoose");
const Sprint = require('../models/Sprint');
const { setSuccessResponse } = require('../utils/sendResponse');
const {StatusCodes} = require("http-status-codes");


/**
 * @swagger
 * /projects:
 *   post:
 *     summary: Create a new project with optional backlog
 *     tags: [Projects]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - ownerId
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               ownerId:
 *                 type: string
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *               status:
 *                 type: string
 *                 enum: [active, completed, archived]
 *               backlog:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [feature, bug, improvement]
 *                     priority:
 *                       type: string
 *                       enum: [low, medium, high]
 *     responses:
 *       201:
 *         description: Project created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Project created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     ownerId:
 *                       type: string
 *                     members:
 *                       type: array
 *                       items:
 *                         type: string
 *                     status:
 *                       type: string
 *                       enum: [active, completed, archived]
 *                     backlog:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [feature, bug, improvement]
 *                           priority:
 *                             type: string
 *                             enum: [low, medium, high]
 *       400:
 *         description: Invalid input or validation error
 *       401:
 *         description: Unauthorized - missing or invalid token
 *       500:
 *         description: Internal server error
 */
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('ownerId').isMongoId().withMessage('Valid ownerId is required'),
    body('members').isArray().withMessage('Members must be an array').optional(), // members should be an array, optional
    body('members.*').isMongoId().withMessage('Each memberId must be a valid ObjectId').optional(), // Each member ID in the array must be a valid ObjectId
    // Validate each memberId exists in the Employee collection
    body('members').custom(async (members = []) => {
      for (const memberId of members) {
        const employee = await getEmployeeById(memberId);
        if (!employee) {
          throw new Error(`Member with ID ${memberId} does not exist in the Employee database`);
        }
      }
      return true;
    }).optional()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, ownerId, members = [], status = 'active', backlog = [] } = req.body;
    try {
      // check for duplicate project
      const existingProject = await Project.findOne({name});
      if(existingProject){
         return res.status(409).json({
          success: false,
          message: 'Project already exists.',
        });
      }
      // Validate ownerId by fetching employee
      const employee = await getEmployeeById(ownerId);
      if (!employee || !employee.data || !employee.data.profile.emp_id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid ownerId. No matching employee found in attendance system.',
        });
      }

      // Create project
      const project = new Project({
        name,
        description,
        ownerId,
        members,
        status,
      });
      await project.save();

      // Handle backlog items 
      const backlogIds = [];
      for (let item of backlog) {
        const backlogItem = new Backlog({
          ...item,
          projectId: project._id,
        });
        await backlogItem.save();
        backlogIds.push(backlogItem._id);
      }

      // Update project with backlog references
      if (backlogIds.length > 0) {
        project.backlog = backlogIds;
        await project.save();
      }

      // return res.status(201).json({
      //   success: true,
      //   message: 'Project created successfully',
      //   data: project,
      // });
      return setSuccessResponse(res,StatusCodes.CREATED,true,project,"Project created successfully");

    } catch (err) {
       if (err.message.includes('Members with IDs')) {
        return res.status(400).json({ success: false, message: err.message });
      }
    // generic error
    console.error('Error updating project:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// get all projects
/**
 * @swagger
 * /projects:
 *   get:
 *     summary: Get all projects
 *     description: Fetches all projects with pagination, filtering, sorting, and optional search functionality. Includes project details along with employee information for project owner and members.
 *     tags:
 *       - Projects
 *     parameters:
 *       - in: query
 *         name: page
 *         description: The page number for pagination (defaults to 1)
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         description: The number of projects per page (defaults to 10)
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: search
 *         description: Search for projects by name or description (case-insensitive)
 *         required: false
 *         schema:
 *           type: string
 *       - in: query
 *         name: filter
 *         description: A JSON object to filter projects (e.g., {"status": "active"})
 *         required: false
 *         schema:
 *           type: string
 *           example: '{"status": "active"}'
 *       - in: query
 *         name: sort
 *         description: The field to sort the projects by (e.g., "name", "createdAt")
 *         required: false
 *         schema:
 *           type: string
 *           default: "name"
 *       - in: query
 *         name: sortOrder
 *         description: The order to sort the projects: "asc" for ascending, "desc" for descending
 *         required: false
 *         schema:
 *           type: string
 *           default: "asc"
 *     responses:
 *       200:
 *         description: List of projects
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
 *                       id:
 *                         type: string
 *                         description: The project ID
 *                         example: "60b8d1f8c1120b001c1d3b6a"
 *                       name:
 *                         type: string
 *                         description: The project name
 *                         example: "Project Alpha"
 *                       description:
 *                         type: string
 *                         description: The project description
 *                         example: "This is the description of Project Alpha"
 *                       owner:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: The ID of the owner
 *                             example: "60b8d1f8c1120b001c1d3b6b"
 *                           first_name:
 *                             type: string
 *                             description: The first name of the owner
 *                             example: "John"
 *                           last_name:
 *                             type: string
 *                             description: The last name of the owner
 *                             example: "Doe"
 *                           login_email:
 *                             type: string
 *                             description: The email address of the owner
 *                             example: "john.doe@example.com"
 *                           active_status:
 *                             type: boolean
 *                             description: The active status of the owner
 *                             example: true
 *                           role_id:
 *                             type: string
 *                             description: The role ID of the owner
 *                             example: "admin"
 *                           role:
 *                             type: string
 *                             description: The role of the owner
 *                             example: "Admin"
 *                       members:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               description: The ID of the member
 *                             first_name:
 *                               type: string
 *                               description: The first name of the member
 *                             last_name:
 *                               type: string
 *                               description: The last name of the member
 *                             login_email:
 *                               type: string
 *                               description: The email address of the member
 *                             active_status:
 *                               type: boolean
 *                               description: The active status of the member
 *                             role_id:
 *                               type: string
 *                               description: The role ID of the member
 *                             role:
 *                               type: string
 *                               description: The role of the member
 *                       status:
 *                         type: string
 *                         description: The project status
 *                         example: "active"
 *                       backlog:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               description: The backlog item ID
 *                               example: "60b8d1f8c1120b001c1d3b6c"
 *                       isDeleted:
 *                         type: boolean
 *                         description: Whether the project is deleted
 *                         example: false
 *                       createdAt:
 *                         type: string
 *                         description: The creation date of the project
 *                         example: "2025-07-29T07:15:50.012Z"
 *                       updatedAt:
 *                         type: string
 *                         description: The last updated date of the project
 *                         example: "2025-07-29T07:15:50.012Z"
 *                 count:
 *                   type: integer
 *                   description: The total number of projects
 *                   example: 100
 *                 totalPages:
 *                   type: integer
 *                   description: The total number of pages
 *                   example: 10
 *                 currentPage:
 *                   type: integer
 *                   description: The current page number
 *                   example: 1
 *                 next:
 *                   type: boolean
 *                   description: Whether there is a next page of results
 *                   example: true
 *       400:
 *         description: Invalid filter format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Invalid filter format"
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Project not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Server error"
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, 
      limit = 10, 
      search, 
      filter, 
      sort = 'name', 
      sortOrder = 'asc' 
    } = req.query;

    // Prepare filter object
    const projectFilter = {};
    projectFilter.isDeleted = false;

    // Add search functionality (search in name or description)
    if (search) {
      const searchRegex = new RegExp(search, 'i'); 
      projectFilter.$or = [
        { name: { $regex: searchRegex } },
        { description: { $regex: searchRegex } }
      ];
    }

    // Add filter functionality (parse the filter if provided)
    if (filter) {
      try {
        const parsedFilter = JSON.parse(filter); // Parse filter if it's passed as a JSON string
        Object.assign(projectFilter, parsedFilter); // Merge parsed filter with projectFilter
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid filter format' });
      }
    }

    // Prepare sorting object
    const sortObject = {};
    if (sort && sortOrder) {
      sortObject[sort] = sortOrder === 'desc' ? -1 : 1;
    }

    // Pagination
    const skip = (page - 1) * limit;
    const totalProjects = await Project.countDocuments(projectFilter); // Total project count for pagination
    const totalPages = Math.ceil(totalProjects / limit); // Total number of pages

    // Check if there's next page
    const hasNext = page < totalPages;

    // Fetch projects with the applied filters, pagination, and sorting
    const projects = await Project.find(projectFilter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortObject); 

    // Fetch employee details for the owner and members of each project
    const projectsWithEmployees = await Promise.all(projects.map(async (project) => {
      const owner = await getEmployeeById(project.ownerId);
      const members = await Promise.all(project.members.map(memberId => getEmployeeById(memberId)));
      
    
      return {
        id: project._id,
        name: project.name,
        description: project.description,
        owner: {
          id: project?.ownerId,
          first_name: owner?.data?.user.first_name,
          last_name: owner?.data?.user.last_name,
          login_email: owner?.data?.user.login_email,
          active_status: owner?.data?.user.active_status,
          role_id: owner?.data?.user.role_id,
          role: owner?.data?.user.role
        },
        members: members.map((member,index) => ({
          id: project.members[index],
          first_name: member?.data?.user.first_name,
          last_name: member?.data?.user.last_name,
          login_email: member?.data?.user.login_email,
          active_status: member?.data?.user.active_status,
          role_id: member?.data?.user.role_id,
          role: member?.data?.user.role
        })),
        status: project.status,
        backlog: project.backlog.map(item => ({
          id: item
        })),
        isDeleted: project.isDeleted,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      };
    }));

    return setSuccessResponse(res, StatusCodes.OK, true, {
      data: projectsWithEmployees,
      count: totalProjects,
      totalPages: totalPages,
      currentPage: page,
      next: hasNext
    }, 'Projects fetched successfully');
  } catch (err) {
    console.error('Error fetching projects:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// get projects by id
/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get a specific project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Project'
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', 
  [
   param('id')
  .exists().withMessage('Project ID is required') // Ensures the parameter exists
  .notEmpty().withMessage('Project ID cannot be empty') // Ensures it is not an empty value
  .custom((value) => mongoose.Types.ObjectId.isValid(value))
  .withMessage('Invalid project ID') // Checks if the value is a valid ObjectId
  ],
  async (req, res) => { 
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
  const { id } = req.params;

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if(project.isDeleted){
      return res.status(404).json({ success: false, message: 'Project not exists' });
    }

    // Fetch the owner details
    const owner = await getEmployeeById(project.ownerId);
    
    // Fetch the member details
    const members = await Promise.all(
      project.members.map(memberId => getEmployeeById(memberId))
    );

    //  include employee details in response
    const projectWithEmployees = {
      ...project.toObject(),
      owner: {
        id:project.ownerId,
        ...owner?.data?.user,
      }, 
     members: members.map((member, index) => ({
        id: project.members[index],  // Include member ID from the project's members array
        ...member?.data?.user,  // Include member details
      })),
    };

    return setSuccessResponse(res,StatusCodes.OK,true,projectWithEmployees,"Project fetched successfully");
  } catch (err) {
    console.error('Error fetching project:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// update project by id
/**
 * @swagger
 * /projects/{id}:
 *   put:
 *     summary: Update a project by ID, including optional member validation
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the project to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The new name of the project (optional)
 *               description:
 *                 type: string
 *                 description: The new description of the project (optional)
 *               status:
 *                 type: string
 *                 enum: [active, completed, archived]
 *                 description: The status of the project (optional)
 *               members:
 *                 type: array
 *                 items:
 *                   type: string
 *                   description: List of member IDs to validate (optional)
 *             required: []
 *     responses:
 *       200:
 *         description: Project updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Updated project details
 *       400:
 *         description: Invalid input or members not found in the Employee database
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: Project not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 */
router.put('/:id', 
[
    body('name').notEmpty().withMessage('Name is required'),
    body('description').isString().optional(),
    body('members').isArray().withMessage('Members must be an array').optional(), // members should be an array, optional
    body('members.*').isMongoId().withMessage('Each memberId must be a valid ObjectId').optional(), // Each member ID in the array must be a valid ObjectId
    // Validate each memberId exists in the Employee collection
    body('members').custom(async (members = []) => {
      const invalidMembers = [];
      for (const memberId of members) {
        const employee = await getEmployeeById(memberId);
        if (!employee) {
          invalidMembers.push(memberId);  // Collect invalid memberIds
        }
      }

      if (invalidMembers.length > 0) {
        return Promise.reject(`Members with IDs ${invalidMembers.join(", ")} do not exist in the Employee database.`);
      }

      return true;
    }).optional()
  ],
  async (req, res) => {
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

  const { id } = req.params;
  const { name, description, status, members } = req.body;

  try {
  //  // Fetch all the employees by their IDs to validate if the member IDs exist in the employee database
    const validMembers = await Promise.all(
      (members || []).map(async (memberId) => {  
    const employee = await getEmployeeById(memberId);
    return employee ? memberId : null;
  })
    );

  //   // Filter out invalid members (those who were not found)
    const invalidMembers = validMembers.filter(member => member === null);

    if (invalidMembers.length > 0) {
      throw new Error(`Members with IDs ${invalidMembers.join(", ")} do not exist in the Employee database.`);
    }

    const project = await Project.findById(id);
    if (!project || project.isDeleted) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if(name) project.name = name ;
    if(description) project.description = description;
    if(status) project.status = status ;
    if(members) project.members = members;

     project.updatedAt= Date.now();

    await project.save();
        return setSuccessResponse(res,StatusCodes.CREATED,true,project,"Project updated successfully")
  } catch (err) {
      if (err.message.includes('Members with IDs')) {
        return res.status(400).json({ success: false, message: err.message });
      }
    // generic error
    console.error('Error updating project:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// delete project
/**
 * @swagger
 * /projects/{id}:
 *   delete:
 *     summary: Soft delete a project by ID
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project marked as deleted successfully
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id',
  [
    param('id')
          .custom((value) => mongoose.Types.ObjectId.isValid(value))
          .withMessage('Invalid project ID'),
  ], 
  async (req, res) => {
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

  const { id } = req.params;

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    if(project.isDeleted){
      return res.status(500).json({success:false,message:"Project is already deleted"})
    }

    project.isDeleted = true;
    await project.save();

    // return res.status(200).json({ success: true, message: 'Project marked as deleted' });
    return setSuccessResponse(res,StatusCodes.CREATED,true,null,"Project deleted sucessfully");
  } catch (err) {
    console.error('Error deleting project:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// add or remove member from project
/**
 * @swagger
 * /projects/{id}/members:
 *   patch:
 *     summary: Add or remove members from a project
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               addMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *               removeMembers:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Members added or removed successfully
 *       404:
 *         description: Project not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/members', [
  // Validate that 'addMembers' is an array of valid ObjectId's
  body('addMembers')
    .optional()
    .isArray().withMessage('addMembers must be an array')
    .custom(async (members = []) => {
      const invalidMembers = [];
      const validMembers = [];

      // Validate each memberId for 'addMembers'
      for (const memberId of members) {
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
          invalidMembers.push(memberId);
        } else {
          const employee = await getEmployeeById(memberId);
          if (!employee) {
            invalidMembers.push(memberId);
          } else {
            validMembers.push(memberId);
          }
        }
      }

      // If there are invalid members, reject the promise
      if (invalidMembers.length > 0) {
        return Promise.reject(`Invalid member IDs: ${invalidMembers.join(", ")}`);
      }

      // Return valid members
      return validMembers;
    }),

  // Validate that 'removeMembers' is an array of valid ObjectId's
  body('removeMembers')
    .optional()
    .isArray().withMessage('removeMembers must be an array')
    .custom(async (members = []) => {
      const invalidMembers = [];
      const validMembers = [];

      // Validate each memberId for 'removeMembers'
      for (const memberId of members) {
        if (!mongoose.Types.ObjectId.isValid(memberId)) {
          invalidMembers.push(memberId);
        } else {
          const employee = await getEmployeeById(memberId);
          if (!employee) {
            invalidMembers.push(memberId);
          } else {
            validMembers.push(memberId);
          }
        }
      }

      // If there are invalid members, reject the promise
      if (invalidMembers.length > 0) {
        return Promise.reject(`Invalid member IDs: ${invalidMembers.join(", ")}`);
      }

      // Return valid members
      return validMembers;
    }),
  
  // Generic validation of the id parameter
  param('id').exists().withMessage('Project ID is required')
    .custom((value) => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid project ID')
],
async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { id } = req.params;
  const { addMembers = [], removeMembers = [] } = req.body;

  try {
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Add new members to the project
    if (addMembers.length > 0) {
      const existingMembers = addMembers.filter(member=>project.members.includes(member.toString()));
      if(existingMembers.length>0){
        console.warn(`Members ${existingMembers.join(", ")} already present in the project.`);
     return res.status(404).json({success:false, message:"member already present in db"})
      }
      project.members = [...new Set([...project.members, ...addMembers])]; 
    }

    // Remove members from the project 
    if (removeMembers.length > 0) {
      const nonExistingMembers = removeMembers.filter(member=>!project.members.includes(member.toString()));
       if (nonExistingMembers.length > 0) {
    console.warn(`Members ${nonExistingMembers.join(", ")} were not found in the project.`);
     return res.status(404).json({success:false, message:"can't remove, member not present in db"})
  }
      project.members = project.members.filter(member => !removeMembers.includes(member.toString()));
    }

    await project.save();
     let addOrRemLen = addMembers.length || removeMembers.length;
    // Return success response
    return setSuccessResponse(res, StatusCodes.CREATED, true, project, ` ${addOrRemLen} Member/Members added or removed successfully`);
  } catch (err) {
    // Catch specific errors from the validation
    if (err.message.includes('Invalid member IDs')) {
      return res.status(400).json({ success: false, message: err.message });
    }

    // Handle generic errors
    console.error('Error updating project:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


/**
 * @swagger
 * /projects/{projectId}/analytics:
 *   get:
 *     summary: Get analytics for a project
 *     description: Returns various analytics for a project including issues count, issue statuses, and time spent on issues.
 *     tags: [Projects]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         description: The ID of the project
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful analytics fetch
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalIssues:
 *                       type: number
 *                       example: 10
 *                     totalTimeSpent:
 *                       type: string
 *                       example: "15 hours 30 minutes"
 *                     issuesStatusBreakdown:
 *                       type: object
 *                       properties:
 *                         to_do:
 *                           type: number
 *                           example: 4
 *                         in_progress:
 *                           type: number
 *                           example: 5
 *                         done:
 *                           type: number
 *                           example: 1
 *                     activeSprints:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           sprintId:
 *                             type: string
 *                             example: "68875ff9aa69dbea8d0f2dc4"
 *                           sprintName:
 *                             type: string
 *                             example: "Sprint 1"
 *                           totalTimeSpent:
 *                             type: string
 *                             example: "5 hours 30 minutes"
 *       404:
 *         description: Project not found
 *       500:
 *         description: Server error
 */
router.get('/:projectId/analytics',async (req, res) => {
  const { projectId } = req.params;

  try {
    // Fetch all issues related to the project
    const issues = await Issue.find({ projectId:new mongoose.Types.ObjectId(projectId) });

    if (!issues.length) {
      return res.status(404).json({ success: false, message: 'No issues found for this project' });
    }

    // Fetch the sprint related to the project
    const sprint = await Sprint.findOne({ projectId:new mongoose.Types.ObjectId(projectId) });

    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found for this project' });
    }

    let totalTimeSpent = 0;
    let issuesStatus = { to_do: 0, in_progress: 0, done: 0 };

    // Loop through issues and accumulate time spent and status breakdown
    issues.forEach(issue => {
      // Find the timeLogs related to each issue in the sprint
      const issueTimeLogs = sprint.timeLogs.filter(log => log.issueId.toString() === issue._id.toString());
      
      issueTimeLogs.forEach(log => {
        if (log.startTime && log.endTime) {
          const start = new Date(log.startTime);
          const end = new Date(log.endTime);
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
            totalTimeSpent += end - start;
          }
        }
      });

      // Update issue status breakdown
      if (issue.status === 'to_do') issuesStatus.to_do++;
      if (issue.status === 'in_progress') issuesStatus.in_progress++;
      if (issue.status === 'done') issuesStatus.done++;
    });

    // Convert totalTimeSpent from milliseconds to hours and minutes
    const hours = Math.floor(totalTimeSpent / (1000 * 60 * 60)); 
    const minutes = Math.floor((totalTimeSpent % (1000 * 60 * 60)) / (1000 * 60)); 

    return res.status(200).json({
      success: true,
      data: {
        totalTimeSpentMs: totalTimeSpent,
        totalTimeSpent: `${hours} hours ${minutes} minutes`,
        issuesStatus, // Breakdown of issues by status
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
