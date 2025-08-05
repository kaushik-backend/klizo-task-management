const express = require('express');
const router = express.Router();
const Sprint = require('../models/Sprint');
const { body,param,validationResult } = require('express-validator');
const Project = require('../models/Project');
const Issue= require("../models/Issue");
const mongoose = require("mongoose");
const { getEmployeeById } = require('../services/EmployeeFetchService');
const { validateDates } = require('../utils/dateValidation');
const { setSuccessResponse } = require('../utils/sendResponse');
const { StatusCodes } = require('http-status-codes');



// Create Sprint Route
/**
 * @swagger
 * /sprints:
 *   post:
 *     summary: Create a new sprint for a project
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - name
 *               - startDate
 *               - endDate
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: The project ID the sprint belongs to
 *               name:
 *                 type: string
 *                 description: The name of the sprint
 *               startDate:
 *                 type: string
 *                 format: date-time
 *                 description: The start date of the sprint
 *               endDate:
 *                 type: string
 *                 format: date-time
 *                 description: The end date of the sprint
 *     responses:
 *       201:
 *         description: Sprint created successfully
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  [
    body('projectId').isMongoId().withMessage('Valid projectId is required'),
    body('name').notEmpty().withMessage('Sprint name is required'),
    body('startDate').isISO8601().withMessage('Start date should be in ISO8601 format'),
    body('endDate').isISO8601().withMessage('End date should be in ISO8601 format'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { projectId, name, startDate, endDate } = req.body;

    try {
       // Validate start and end date
      const dateError = validateDates(startDate, endDate);
      if (dateError) {
        return res.status(400).json({ success: false, message: dateError });
      }
      // Check if duplicate sprint name exists in the same project
      const existing = await Sprint.findOne({ name, projectId });
       if (existing) {
        return res.status(409).json({ message: 'Sprint name already exists in this project' });
       }


      // check if the sprint already exists
      const sprintExists = await Sprint.findOne({name});
      if(sprintExists){
        return res.status(409).json({success:false, message:"Sprint already exists"});
      }
      // check if the associated project exists
      const project = await Project.findById(projectId);
      if(!project || project.isDeleted){
        return res.status(404).json({success:false, message:"Project not exists"})
      }
      // Create the sprint
      const sprint = new Sprint({
        projectId,
        name,
        startDate,
        endDate,
      });

      await sprint.save();
      return setSuccessResponse(res,StatusCodes.CREATED,true,sprint,"Sprint created successfully");
    } catch (err) {
      console.error('Error creating sprint:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

/**
 * @swagger
 * /sprints/add-to-sprint/{issueId}:
 *   put:
 *     summary: Add an issue to a sprint and update its status to "to_do"
 *     tags:
 *       - Sprints
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the issue to add to the sprint
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sprintId
 *             properties:
 *               sprintId:
 *                 type: string
 *                 description: The ID of the sprint to which the issue will be added
 *     responses:
 *       200:
 *         description: Issue successfully added to the sprint
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Sprint'
 *       404:
 *         description: Issue or Sprint not found
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
 *         description: Server error while adding issue to sprint
 */
// Add Issue to Sprint
router.put('/add-to-sprint/:issueId',
  [
    param('issueId')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid issue ID'),

    body('sprintId')
      .notEmpty().withMessage('sprintId is required')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid sprint ID'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

  const { issueId } = req.params;
  const { sprintId } = req.body;

  try {
    // Find the sprint
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // Find the issue
    const issue = await Issue.findById(issueId);
    if (!issue || issue.isDeleted) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    // Check if issue is already in this sprint
      if (sprint.issues.includes(issue._id)) {
        return res.status(409).json({ success: false, message: 'This Issue already added to this sprint' });
      }

    // Check if issue is already in another active sprint
      const isInOtherSprint = await Sprint.findOne({
        _id: { $ne: sprintId },
        status: 'active',
        issues: issue._id,
      });

      if (isInOtherSprint) {
        return res.status(409).json({ success: false, message: 'Issue is already part of another active sprint' });
      }

    // Add the issue to the sprint's issues array
    sprint.issues.push(issue._id);
    issue.status = 'to_do';  // Change issue status to "To Do" when it's added to the sprint
    await sprint.save();
    await issue.save();

    return setSuccessResponse(res,StatusCodes.CREATED,true,sprint,"Issue added to the sprint and status updated to to_do");
  } catch (err) {
    console.error('Error adding issue to sprint:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Start Sprint (Change status of Sprint(active) and Issues(to_do))
/**
 * @swagger
 * /sprints/start-sprint/{sprintId}:
 *   put:
 *     summary: Start a sprint and update all associated issue statuses to "to_do"
 *     tags:
 *       - Sprints
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the sprint to be started
 *     responses:
 *       200:
 *         description: Sprint successfully started and issues updated
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
 *                   example: Sprint started and issues updated
 *       404:
 *         description: Sprint not found or already active
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
 *                   example: Sprint not found or already started
 *       500:
 *         description: Server error while starting sprint
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
 *                   example: Server error
 */
router.put('/start-sprint/:sprintId', 
  [
    param('sprintId')
    .custom((value)=>mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid sprint ID')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if(!errors.isEmpty()){
      return res.status(422).json({success:false, errors:errors.array()});
    }
  const { sprintId } = req.params;

  try {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint || sprint.status !== 'planned' ) {
      return res.status(404).json({ success: false, message: 'Sprint not found or already started' });
    }

    // Update sprint status to 'active'
    sprint.status = 'active';
    await sprint.save();

    // Update all issues status to 'to_do' when sprint starts
    await Issue.updateMany(
      { _id: { $in: sprint.issues } },
      { status: 'to_do' }
    );

    return setSuccessResponse(res,StatusCodes.CREATED,true,sprint,"sprint started and issues updated")
  } catch (err) {
    console.error('Error starting sprint:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// end sprint --- dont allow to end sprint until time-log stops (change status to completed)
/**
 * @swagger
 * /sprints/end-sprint/{sprintId}:
 *   post:
 *     summary: End a sprint and mark associated issues
 *     description: Marks the sprint as completed and updates the status of issues in the sprint.
 *     tags:
 *       - Sprints
 *     parameters:
 *       - name: sprintId
 *         in: path
 *         description: The ID of the sprint to be ended
 *         required: true
 *         type: string
 *         format: objectId
 *     responses:
 *       200:
 *         description: Sprint completed successfully and issues updated
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
 *                   example: Sprint completed and issues updated
 *       400:
 *         description: Sprint already completed or other bad request error
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
 *                   example: Sprint is already completed
 *       404:
 *         description: Sprint not found
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
 *                   example: Sprint not found
 *       500:
 *         description: Internal server error
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
 *                   example: Server error
 */
router.post('/end-sprint/:sprintId',
  [
    param('sprintId')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid sprint ID'),
  ],
  async (req, res) => {
  const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
  const { sprintId } = req.params;
  try {
    const sprint = await Sprint.findById(sprintId).populate('timeLogs.issueId');
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    if (sprint.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Sprint is already completed' });
    }
    
     // Check if any of the timeLogs don't have an endTime set
    const incompleteTimeLogs = sprint.timeLogs.some(log => !log.endTime);
    
    if (incompleteTimeLogs) {
      return res.status(400).json({
        success: false,
        message: 'Cannot end sprint as there are unfinished time logs. Please complete all tasks.'
      });
    }
    // Mark the sprint as completed
    sprint.status = 'completed';
    sprint.updatedAt = Date.now();
    await sprint.save();

    // Update the issues associated with this sprint
    await Issue.updateMany(
      { _id: { $in: sprint.issues } },
      [
        {
          $set: {
            status: {
              $cond: {
                if: { $eq: ['$status', 'in_progress'] }, 
                then: 'done',
                else: {
                  $cond: {
                    if: { $eq: ['$status', 'to_do'] }, 
                    then: 'backlog',
                    else: 'done',
                  },
                },
              },
            },
          },
        },
      ]
    );

    // return res.status(200).json({ success: true, message: 'Sprint completed and issues updated' });
      return setSuccessResponse(res,StatusCodes.CREATED,"Sprint completed and issues updated");
  } catch (err) {
    console.error('Error ending sprint:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// POST /sprints/:sprintId/time-log/stop
/**
 * @swagger
 * /sprints/time-log/stop:
 *   post:
 *     tags:
 *       - Sprints
 *     summary: Stop time logging on an issue
 *     description: Stops the active time log for the assignee and updates total time spent in the issue.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sprintId
 *               - assigneeId
 *             properties:
 *               sprintId:
 *                 type: string
 *                 example: "688381f6ab4b55d6f0afdd91"
 *               assigneeId:
 *                 type: string
 *                 example: "686f9952b4c828abca3c51f4"
 *     responses:
 *       200:
 *         description: Time log stopped and issue updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 timeSpentInMs:
 *                   type: number
 *       404:
 *         description: No active time log found
 *       500:
 *         description: Internal server error
 */
router.post('/time-log/stop',[
   body('sprintId')
      .notEmpty().withMessage('sprintId is required')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid sprint ID'),
   body('assigneeId')
      .notEmpty().withMessage('assigneeId is required')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid assignee ID'),
], async (req, res) => {
   const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
  const { sprintId, assigneeId } = req.body;

  try {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    const log = sprint.timeLogs.find(
      log => log.assigneeId.toString() === assigneeId && !log.endTime
    );

    if (!log) {
      // return res.status(404).json({ success: false, message: 'No active time log found' });
      return setSuccessResponse(res,StatusCodes.NOT_FOUND,false,null,"No active time-log found");
    }

    // Stop timer
    log.endTime = new Date();
    const timeSpent = new Date(log.endTime) - new Date(log.startTime); // in ms
    log.timeSpent= timeSpent;

    // Update totalTimeSpent in Issue
    const issue = await Issue.findById(log.issueId);
    if (issue) {
      issue.totalTimeSpent = (issue.totalTimeSpent || 0) + timeSpent;
      await issue.save();
    }

    await sprint.save();
    
    return setSuccessResponse(res,StatusCodes.CREATED,true,{timeSpentInMs:timeSpent},"Time log stopped");
  } catch (error) {
    console.error('Error stopping time log:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// Get Issues by Sprint
/**
 * @swagger
 * /sprints/{sprintId}/issues:
 *   get:
 *     summary: Get issues of a specific sprint
 *     description: Fetches all issues associated with a sprint by its ID
 *     tags:
 *       - Sprints
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         description: The ID of the sprint to fetch issues for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of issues in the sprint
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
 *                       _id:
 *                         type: string
 *                         description: The issue ID
 *                       title:
 *                         type: string
 *                         description: The title of the issue
 *                       description:
 *                         type: string
 *                         description: The description of the issue
 *                       status:
 *                         type: string
 *                         description: The current status of the issue
 *                       assigneeId:
 *                         type: string
 *                         description: The ID of the user assigned to the issue
 *       404:
 *         description: Sprint not found
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
 *                   example: Sprint not found
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
 *                   example: Server error
 */
router.get('/:sprintId/issues', async (req, res) => {
  const { sprintId } = req.params;
  const {
    page = 1,
    limit = 10,
    search,
    filter,
    sort = 'createdAt', 
    startDate, // yyyy-mm-dd
    endDate, // yyyy-mm-dd
    sortOrder = 'asc',
  } = req.query;

  try {
    // Fetch sprint by sprintId
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // Get the issueIds from the sprint document
    const issueIds = sprint.issues;

    // Define the base filter for the issues
    const issueFilter = { _id: { $in: issueIds } };

    // Implement search functionality
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      issueFilter.$or = [
        { title: { $regex: searchRegex } },
        { description: { $regex: searchRegex } },
      ];
    }

    // Handle additional filters passed by the user
    if (filter) {
      try {
        const parsedFilter = JSON.parse(filter);
        Object.assign(issueFilter, parsedFilter);
      } catch (err) {
        return res.status(400).json({ success: false, message: 'Invalid filter format' });
      }
    }

     // Handle date range filter
    if (startDate || endDate) {
      // Validate and convert startDate and endDate to Date objects
      if (startDate && !Date.parse(startDate)) {
        return res.status(400).json({ success: false, message: 'Invalid startDate format' });
      }
      if (endDate && !Date.parse(endDate)) {
        return res.status(400).json({ success: false, message: 'Invalid endDate format' });
      }

      const dateFilter = {};
      if (startDate) {
        dateFilter.$gte = new Date(startDate); 
      }
      if (endDate) {
        dateFilter.$lte = new Date(endDate); 
      }
      
      issueFilter.createdAt = dateFilter;
    }

    // Prepare sorting object
    const sortObject = {};
    if (sort && sortOrder) {
      sortObject[sort] = sortOrder === 'desc' ? -1 : 1; // sort descending or ascending based on user input
    }

    // Pagination logic
    const skip = (page - 1) * limit;
    const totalIssues = await Issue.countDocuments(issueFilter); // Get total issue count based on issueFilter
    const totalPages = Math.ceil(totalIssues / limit); // Calculate total pages
    const hasNext = page < totalPages; // Check if there's a next page

    // Fetch issues with pagination, sorting, and filtering
    const issues = await Issue.find(issueFilter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortObject);

    // Fetch additional details like assignee, reporter, and project for each issue
    const detailedIssues = await Promise.all(issues.map(async (issue) => {
      const assignee = await getEmployeeById(issue.assigneeId); // Assuming you have a function `getEmployeeById`
      const reporter = await getEmployeeById(issue.reporterId); // Same for reporter
      const project = await Project.findById(issue.projectId);

      return {
        ...issue.toObject(),
        assignee: {
          id: issue.assigneeId,
          name: assignee?.data?.user?.first_name+' '+assignee?.data?.user?.last_name
        },
        reporter: {
          id: issue.reporterId,
          name: reporter?.data?.user?.first_name+' '+reporter?.data?.user?.last_name
        },
        project: {
          id: project._id,
          name: project.name, 
        },
      };
    }));

    // Respond with paginated and enriched issues
    return res.status(200).json({
      success: true,
      data: detailedIssues,
      count: totalIssues,
      totalPages,
      currentPage: page,
      next: hasNext,
    });
  } catch (err) {
    console.error('Error fetching sprint issues:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add Time Log to Sprint
router.post('/time-log/:sprintId', async (req, res) => {
  const { sprintId } = req.params;
  const { assigneeId, issueId, timeSpent, startTime, endTime } = req.body;

  try {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    const issue = await Issue.findById(issueId);
    if (!issue) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    const timeLog = {
      assigneeId,
      issueId,
      timeSpent,
      startTime,
      endTime,
    };

    sprint.timeLogs.push(timeLog);
    await sprint.save();

    return res.status(200).json({ success: true, data: timeLog });
  } catch (err) {
    console.error('Error logging time:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get Time Logs for Sprint
/**
 * @swagger
 * /sprints/{sprintId}/time-logs:
 *   get:
 *     summary: Get time logs for a specific sprint
 *     description: Fetches all time logs associated with a sprint by its ID.
 *     tags:
 *       - Sprints
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         description: The ID of the sprint to fetch time logs for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of time logs for the sprint
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
 *                       _id:
 *                         type: string
 *                         description: The time log ID
 *                       assigneeId:
 *                         type: string
 *                         description: The ID of the user assigned to the time log
 *                       issueId:
 *                         type: string
 *                         description: The ID of the associated issue
 *                       startTime:
 *                         type: string
 *                         format: date-time
 *                         description: The start time of the task
 *                       endTime:
 *                         type: string
 *                         format: date-time
 *                         description: The end time of the task
 *                       timeSpent:
 *                         type: integer
 *                         description: The total time spent on the task (in milliseconds)
 *       404:
 *         description: Sprint not found
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
 *                   example: Sprint not found
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
 *                   example: Server error
 */
router.get('/:sprintId/time-logs', async (req, res) => {
  const { sprintId } = req.params;

  try {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    return res.status(200).json({ success: true, data: sprint.timeLogs });
  } catch (err) {
    console.error('Error fetching time logs:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /sprints/:sprintId/time-log/start (change issue status to in_progress)
/**
 * @swagger
 * /sprints/{sprintId}/time-log/start:
 *   post:
 *     tags:
 *       - Sprints
 *     summary: Start time logging on an issue
 *     description: Starts a time log for an assignee working on an issue. Prevents multiple active logs for the same assignee.
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the sprint
 *         example: "688381f6ab4b55d6f0afdd91"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - issueId
 *               - assigneeId
 *             properties:
 *               issueId:
 *                 type: string
 *                 example: "6883827aab4b55d6f0afddad"
 *               assigneeId:
 *                 type: string
 *                 example: "686f9952b4c828abca3c51f4"
 *     responses:
 *       200:
 *         description: Time log started successfully
 *       400:
 *         description: Active time log already exists or invalid sprint
 *       404:
 *         description: Sprint not found
 *       500:
 *         description: Internal server error
 */
router.post('/:sprintId/time-log/start', 
  [
    param('sprintId')
      .custom((value) => mongoose.Types.ObjectId.isValid(value))
      .withMessage('Invalid sprint ID'),
     body('issueId').isMongoId().withMessage('Valid issueId is required'),
     body('assigneeId').isMongoId().withMessage('Valid assigneeId is required'),
  ],
  async (req, res) => { 
   const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
  const { sprintId } = req.params;
  const { issueId, assigneeId } = req.body;
 
  if (!mongoose.isValidObjectId(sprintId)) {
    return res.status(400).json({ success: false, message: 'Invalid sprint ID' });
  }
  try {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) return res.status(404).json({ success: false, message: 'Sprint not found' });

    if (sprint.status !== 'active') {
  return res.status(400).json({ success: false, message: 'Sprint is not active' });
  }

    // check if issue exists
     const issue = await Issue.findOne({_id:issueId});
     if(!issue || issue.isDeleted){
      return res.status(404).json({success:false, message:"Issue not exists"});
     }
   // check if user exists
  
    const user = await getEmployeeById(assigneeId);
    if(!user){
       return res.status(404).json({success:false, message:"assignee not exists in attendance-db"});
    }

    if (!issue.assigneeId.equals(assigneeId)) {
      return res.status(400).json({
        success: false,
        message: 'Assignee ID does not match the assigned user for this issue'
      });
    }
    // Check if user has any active log across all issues
    const activeLog = sprint.timeLogs.find(
      log => log.assigneeId.equals(assigneeId) && !log.endTime
    );

    if (activeLog) {
      return res.status(400).json({
        success: false,
        message: 'User already has an active time log on another issue'
      });
    }

    sprint.timeLogs.push({
      issueId,
      assigneeId,
      startTime: new Date()
    });

    await sprint.save();
    issue.status='in_progress';
    await issue.save();

    res.status(200).json({ success: true, message: 'Time log started' });

  } catch (err) {
    console.error('Start time log error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * @swagger
 * /sprints/{sprintId}/total-time:
 *   get:
 *     summary: Get total time spent on a specific sprint
 *     description: Fetches the total time spent on a sprint by calculating the difference between `startTime` and `endTime` for all associated time logs.
 *     tags:
 *       - Sprints
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         description: The ID of the sprint to fetch total time for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Total time spent on the sprint
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
 *                     totalTimeMs:
 *                       type: integer
 *                       description: Total time spent in milliseconds
 *                       example: 123456789
 *                     actualSprintTime:
 *                       type: string
 *                       description: Total time in hours and minutes
 *                       example: "12 hours 34 minutes"
 *       404:
 *         description: Sprint not found or no time logs found for the sprint
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
 *                   example: "Sprint not found" or "No time logs found for this sprint"
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
router.get("/:sprintId/total-time", async (req, res) => {
  const { sprintId } = req.params;
  try {
    const sprint = await Sprint.findById(sprintId);
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    // Fetch associated time-logs for this sprint
    const timeLogs = sprint.timeLogs; 

    // Check if any time logs exist
    if (timeLogs.length === 0) {
      return res.status(404).json({ success: false, message: 'No time logs found for this sprint' });
    }

    let totalTime = 0;

    // calculate total time
    timeLogs.forEach(log => {
      if (log.startTime && log.endTime) {
        const start = new Date(log.startTime);
        const end = new Date(log.endTime);
        
        // Check if both startTime and endTime are valid
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const timeDifference = end - start;
          totalTime += timeDifference;
        }
      }
    });

    // Convert total time to hours and minutes
    const hours = Math.floor(totalTime / (1000 * 60 * 60)); 
    const minutes = Math.floor((totalTime % (1000 * 60 * 60)) / (1000 * 60)); 

    return res.status(200).json({
      success: true,
      data: {
        totalTimeMs: totalTime,
        actualSprintTime: `${hours} hours ${minutes} minutes`,
      },
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/:sprintId/analytics', async (req, res) => {
  const { sprintId } = req.params; 

  try {
    const sprint = await Sprint.findById(sprintId).populate('issues');
    if (!sprint) {
      return res.status(404).json({ success: false, message: 'Sprint not found' });
    }

    if (!sprint.issues.length) {
      return res.status(404).json({ success: false, message: 'No issues found for this sprint' });
    }

    let totalTimeSpent = 0;
    let issuesStatus = { to_do: 0, in_progress: 0, done: 0 };

    sprint.issues.forEach(issue => {
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

    const hours = Math.floor(totalTimeSpent / (1000 * 60 * 60)); 
    const minutes = Math.floor((totalTimeSpent % (1000 * 60 * 60)) / (1000 * 60)); 

    return res.status(200).json({
      success: true,
      data: {
        totalTimeSpentMs: totalTimeSpent,
        totalTimeSpent: `${hours} hours ${minutes} minutes`,
        issuesStatus, 
      },
    });
  } catch (err) {
    console.error('Error fetching sprint analytics:', err.message);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// list sprint issues gorupBy status

router.get('/:sprintId/issues-by-status', async (req, res) => {
  try {
    const { sprintId } = req.params;

    // Fetch the sprint and populate the issues
    const sprint = await Sprint.findById(sprintId).populate('issues');
    if (!sprint) {
      return res.status(404).json({ message: 'Sprint not found' });
    }

    // Get the issues related to the sprint
    const issues = sprint.issues;

    // Aggregate issues grouped by their status
    const issuesGroupedByStatus = await Issue.aggregate([
      {
        $match: {
          _id: { $in: issues.map(issue => issue._id) }, // Filter issues by sprint issues
        }
      },
      {
        $group: {
          _id: '$status', // Group by status
          count: { $sum: 1 }, // Count the number of issues for each status
          issues: { $push: '$title' } // Push issue titles into the "issues" array (optional)
        }
      },
      {
        $sort: { _id: 1 } // Optional: Sort by status
      }
    ]);

    // Return the grouped issues by status
    res.json(issuesGroupedByStatus);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// get sprint issues grouped by status 
router.get("/board/:sprintId", async(req,res)=>{
  try{
   const { sprintId } = req.params;

    const issues = await Issue.find({ sprint: sprintId })
      .populate("assignee", "name email")
      .populate("reporter", "name email");

    const grouped = {
      "To Do": [],
      "In Progress": [],
      Done: [],
    };

    for (const issue of issues) {
      grouped[issue.status]?.push(issue);
    }

    res.json(grouped);
  }catch(err){
       res.status(500).json({ error: err.message });
  }
})

module.exports = router;
