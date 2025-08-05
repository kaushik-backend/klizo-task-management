const express = require('express');
const router = express.Router();
const Issue = require('../models/Issue');
const { body,param,validationResult } = require('express-validator');
const { getEmployeeById } = require('../services/EmployeeFetchService');
const Project = require('../models/Project');
const {setSuccessResponse} = require("../utils/sendResponse");
const { StatusCodes } = require('http-status-codes');
const mongoose= require("mongoose");
const { upload, parseCSV } = require('../middleware/csvUploadMiddleware');
const uploadFiles = require('../middleware/uploadFiles');

// Create Issue Route
/**
 * @swagger
 * /issues:
 *   post:
 *     summary: Create a new issue (task, story, epic, subtask, bug)
 *     tags: [Issues]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:  # Switch to form-data for Swagger
 *           schema:
 *             type: object
 *             required:
 *               - projectId
 *               - title
 *               - description
 *               - type
 *               - assigneeId
 *               - reporterId
 *               - priority
 *               - priorityLevel
 *             properties:
 *               projectId:
 *                 type: string
 *                 description: The project ID to which the issue belongs
 *                 example: "608d1f23058f8a0a94aee52c"
 *               title:
 *                 type: string
 *                 description: The title of the issue
 *                 example: "Fix bug in task management module"
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue
 *                 example: "There is a bug in the task management module where tasks are not updating correctly."
 *               type:
 *                 type: string
 *                 enum: [task, story, epic, subtask, bug]
 *                 description: Type of the issue
 *                 example: "bug"
 *               parentTaskId:
 *                 type: string
 *                 nullable: true  # Allow null for parentTaskId
 *                 description: The ID of the parent task (optional, for subtasks)
 *                 example: "608d1f23058f8a0a94aee530"
 *               epicId:
 *                 type: string
 *                 nullable: true  # Allow null for epicId
 *                 description: The ID of the epic this issue belongs to (optional)
 *                 example: "608d1f23058f8a0a94aee531"
 *               assigneeId:
 *                 type: string
 *                 description: The ID of the employee assigned to this issue
 *                 example: "608d1f23058f8a0a94aee532"
 *               reporterId:
 *                 type: string
 *                 description: The ID of the employee reporting the issue
 *                 example: "608d1f23058f8a0a94aee533"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: Priority of the issue
 *                 example: "high"
 *               priorityLevel:
 *                 type: string
 *                 enum: [Critical, Major, Minor]
 *                 description: Priority level of the issue
 *                 example: "Minor"
 *     responses:
 *       201:
 *         description: Issue created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/definitions/Issue'
 *       400:
 *         description: Invalid input, validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       msg:
 *                         type: string
 *                       param:
 *                         type: string
 *                       location:
 *                         type: string
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
 * definitions:
 *   Issue:
 *     type: object
 *     properties:
 *       _id:
 *         type: string
 *         description: The unique identifier of the issue
 *         example: "60c72b2f9a7e4b2a9f1a2b45"
 *       projectId:
 *         type: string
 *         description: The project ID the issue is associated with
 *         example: "608d1f23058f8a0a94aee52c"
 *       title:
 *         type: string
 *         description: The title of the issue
 *         example: "Fix bug in task management module"
 *       description:
 *         type: string
 *         description: Detailed description of the issue
 *         example: "There is a bug in the task management module where tasks are not updating correctly."
 *       type:
 *         type: string
 *         description: Type of the issue (task, story, epic, subtask, bug)
 *         enum:
 *           - task
 *           - story
 *           - epic
 *           - subtask
 *           - bug
 *         example: "bug"
 *       parentTaskId:
 *         type: string
 *         description: The parent task ID if this issue is a subtask
 *         example: "608d1f23058f8a0a94aee530"
 *       epicId:
 *         type: string
 *         description: The epic ID this issue belongs to
 *         example: "608d1f23058f8a0a94aee531"
 *       assigneeId:
 *         type: string
 *         description: The assignee's employee ID
 *         example: "608d1f23058f8a0a94aee532"
 *       reporterId:
 *         type: string
 *         description: The reporter's employee ID
 *         example: "608d1f23058f8a0a94aee533"
 *       priority:
 *         type: string
 *         description: Priority of the issue
 *         enum:
 *           - low
 *           - medium
 *           - high
 *         example: "high"
 *       createdAt:
 *         type: string
 *         format: date-time
 *         description: Timestamp of when the issue was created
 *         example: "2022-03-29T10:15:30Z"
 *       updatedAt:
 *         type: string
 *         format: date-time
 *         description: Timestamp of when the issue was last updated
 *         example: "2022-03-29T10:15:30Z"
 */
router.post(
  '/',
  uploadFiles,
  [
  // Validate form fields
    body('projectId').isMongoId().withMessage('Valid projectId is required'),
    body('title').notEmpty().withMessage('Title is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('type').isIn(['task', 'story', 'epic', 'subtask', 'bug']).withMessage('Invalid issue type'),
    body('priority').isIn(['low', 'medium', 'high']).withMessage('Invalid priority'),
    body('assigneeId').isMongoId().withMessage('Valid assigneeId is required'),
    body('reporterId').isMongoId().withMessage('Valid reporterId is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    // Convert empty strings to null directly in req.body
    if (req.body.parentTaskId === "") req.body.parentTaskId = null;
    if (req.body.epicId === "") req.body.epicId = null;

    const { projectId, title, description, type, parentTaskId, epicId, assigneeId, reporterId, priority,priorityLevel } = req.body;

    try {
        // check for duplicate issues
        const existingIssue = await Issue.findOne({title:title,projectId:projectId});
        if(existingIssue){
          return res.status(409).json({success:false, message:"Issue already exists for the same project"});
        }
        // check if project exists
        const project= await Project.findById(projectId);
        if(!project){
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        // prevent same assigneeId and reporterId insertion
        if(assigneeId===reporterId){
           return res.status(400).json({success:false, message:"assigneeId and reporterId can't be same"});
        }

        // check if assignee exists
        const assignee = await getEmployeeById(assigneeId);
        if(!assignee){
            return res.status(404).json({success:false,message:'assignee not exists'});
        }

        // check if repoter exists
        const repoter = await getEmployeeById(reporterId);
        if(!repoter){
            return res.status(404).json({success:false,message:'reporter not found'});
        }

        // Check if Parent Task exists (only if it's a subtask)
      if (parentTaskId) {
        const parentTask = await Issue.findById(parentTaskId);
        if (!parentTask) {
          return res.status(404).json({ success: false, message: 'Parent task not found' });
        }
      }

      // Check if Epic exists (only if it's a story or subtask)
      if (epicId) {
        const epic = await Issue.findById(epicId);
        if (!epic) {
          return res.status(404).json({ success: false, message: 'Epic not found' });
        }
      }

       const lastIssue = await Issue.find({ projectId }).sort({ issueNumber: -1 }).limit(1);
    const nextIssueNumber = lastIssue.length > 0 ? lastIssue[0].issueNumber + 1 : 1;

    // handle file attachments
    const attachmentUrls = req.files ? req.files.map(file => file.path) : [];
      const issue = new Issue({
        projectId,
        title,
        description,
        type,
        issueNumber: nextIssueNumber, 
        parentTaskId,
        epicId,
        assigneeId,
        reporterId,
        priority,
        priorityLevel,
        attachments: attachmentUrls,
      });

      issue.key = `${project.name.slice(0, 3).toUpperCase()}-${issue.issueNumber}`;
      await issue.save();

      return setSuccessResponse(res,StatusCodes.CREATED,true,issue,"Issue created successfully");
    } catch (err) {
      console.error('Error creating issue:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

// bulk upload issues
/**
 * @swagger
 * /issues/bulk-create:
 *   post:
 *     summary: Bulk create issues from CSV file
 *     description: Upload a CSV file containing multiple issues to create them in bulk.
 *     tags:
 *       - Issues
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV file with issue details (projectId, title, description, etc.)
 *     responses:
 *       201:
 *         description: Issues created successfully
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
 *                   example: "Issues created successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       projectId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type:
 *                         type: string
 *                       assigneeId:
 *                         type: string
 *                       reporterId:
 *                         type: string
 *                       priority:
 *                         type: string
 *                       status:
 *                         type: string
 *       400:
 *         description: Invalid or missing file or invalid data in CSV
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
 *                   example: "No file uploaded"
 *       404:
 *         description: Project, assignee, reporter, or other references not found
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
 *                   example: "Project with ID 123 not found"
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
 *                   example: "Server error"
 */
router.post("/bulk-create", upload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Parse the CSV file to get issue data
    const issues = await parseCSV(req.file.path);
    // console.log("========issues from CSV=============", issues);

    const createdIssues = [];
    
    for (const issueData of issues) {
      const {
        projectId,
        title,
        description,
        type,
        assigneeId,
        reporterId,
        priority,
        status,
        labels = [],
        attachments = [],
        votes = 0,
        watchers = [],
        timeSpent = 0,
        parentId = null,
        priorityLevel = 'Major',
        progress = 0,
      } = issueData;

      // Validate project
      const project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: `Project with ID ${projectId} not found` });
      }

      // Check if assignee and reporter exist and are not the same
      const assignee = await getEmployeeById(assigneeId);
      if (!assignee || !assignee.data || !assignee.data.profile.emp_id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid assigneeId. No matching employee found in attendance system.',
        });
      }

      const reporter = await getEmployeeById(reporterId);
      if (!reporter || !reporter.data || !reporter.data.profile.emp_id) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reporterId. No matching employee found in attendance system.',
        });
      }

      if (assigneeId === reporterId) {
        return res.status(400).json({ success: false, message: "Assignee and Reporter cannot be the same" });
      }

      // Get the latest issue number for the project
      const latestIssue = await Issue.findOne({ projectId }).sort({ issueNumber: -1 }).exec();
      const issueNumber = latestIssue ? latestIssue.issueNumber + 1 : 1; // Start at 1 if no issues exist

      // Generate the issue key based on the project and issue number
      const projectKey = project.name.slice(0, 3).toUpperCase();  // Example: "PRO"
      const key = `${projectKey}-${issueNumber}`;

      // Create new issue based on CSV data and generate key
      const issue = new Issue({
        key, // Assign dynamically generated key
        projectId,
        title,
        description,
        type,
        assigneeId,
        reporterId,
        priority,
        status,
        labels,
        attachments,
        votes,
        watchers,
        timeSpent,
        parentId,
        priorityLevel,
        progress,
        issueNumber,
      });

      await issue.save();
      createdIssues.push(issue);
    }

    return res.status(201).json({
      success: true,
      message: "Issues created successfully",
      data: createdIssues,
    });
  } catch (err) {
    console.error("Error during bulk issue creation:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get Issues by Project Route
/**
 * @swagger
 * /issues/{projectId}:
 *   get:
 *     summary: Get all issues for a specific project
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         description: The ID of the project to fetch issues for
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of issues for the project
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
 *                       projectId:
 *                         type: string
 *                       title:
 *                         type: string
 *                       description:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: ['task', 'story', 'epic', 'subtask', 'bug']
 *                       status:
 *                         type: string
 *                         enum: ['backlog', 'to_do', 'in_progress', 'done']
 *                       assigneeId:
 *                         type: string
 *                       reporterId:
 *                         type: string
 *                       priority:
 *                         type: string
 *                         enum: ['low', 'medium', 'high']
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       404:
 *         description: No issues found for the project
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
 *                   example: No issues found for the project
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
router.get('/:projectId', async (req, res) => {
  const { projectId } = req.params;
  const {
    page=1,
    limit=10,
    search,
    filter,
    sort='createdAT',
    sortOrder='asc'
  } = req.query

  try {
    // Find all issues linked to the project (task, story, epic, subtask, bug)
    // const issues = await Issue.find({ projectId });

    // if (!issues || issues.length === 0) {
    //   return res.status(404).json({ success: false, message: 'No issues found for the project' });
    // }

    //  prepare filter object
    const issueFilter = {projectId};
     issueFilter.isDeleted = false;

    if(search){
      const searchRegex= new RegExp(search,'i');
      issueFilter.$or=[
        {title:{$regex:searchRegex}},
        {description:{$regex:searchRegex}}
      ]
    }

    // Handle additional filters
    if (filter) {
      try {
        const parsedFilter = JSON.parse(filter);  
        Object.assign(issueFilter, parsedFilter);  
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
    const totalIssues = await Issue.countDocuments(issueFilter); 
    const totalPages = Math.ceil(totalIssues / limit);  

    // Check if there's next page
    const hasNext = page < totalPages;

    // Fetch issues with applied filters, pagination, and sorting
    const issues = await Issue.find(issueFilter)
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortObject);

    // Fetch assignee and reporter details and include them in the response
    const issuesWithUserDetails = await Promise.all(issues.map(async (issue) => {
      const assignee = await getEmployeeById(issue.assigneeId);
      const reporter = await getEmployeeById(issue.reporterId);
      const project = await Project.findById(projectId);

      return {
        ...issue.toObject(),
        assignee: {
          id: issue.assigneeId,
          name: assignee?.data?.user?.first_name + ' ' + assignee?.data?.user?.last_name,
        },
        reporter: {
          id: issue.reporterId,
          name: reporter?.data?.user?.first_name + ' ' + reporter?.data?.user?.last_name,
        },
        project: {
          id: issue.projectId,
          name: project.name,
        },
      };
    }));

    if(totalIssues<1){
         return res.status(404).json({success:false,message:"No issues to show"})
    }

    return res.status(200).json({
      success: true,
      data: issuesWithUserDetails,
      count: totalIssues,
      totalPages,
      currentPage: page,
      next: hasNext,
    });
  } catch (err) {
    console.error('Error fetching issues:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


/**
 * @swagger
 * /issues/{issueId}:
 *   put:
 *     summary: Update an issue's details
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the issue to be updated
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: The title of the issue
 *               description:
 *                 type: string
 *                 description: Detailed description of the issue
 *               status:
 *                 type: string
 *                 enum: ['backlog', 'to_do', 'in_progress', 'done']
 *                 description: Current status of the issue
 *               priority:
 *                 type: string
 *                 enum: ['low', 'medium', 'high']
 *                 description: The priority of the issue
 *               assigneeId:
 *                 type: string
 *                 description: The ID of the employee assigned to the issue
 *               reporterId:
 *                 type: string
 *                 description: The ID of the employee who reported the issue
 *               parentTaskId:
 *                 type: string
 *                 description: The ID of the parent task (only for subtasks)
 *               epicId:
 *                 type: string
 *                 description: The ID of the epic to which the issue belongs (only for stories and subtasks)
 *     responses:
 *       200:
 *         description: Issue updated successfully
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
 *                     _id:
 *                       type: string
 *                       description: The issue's unique ID
 *                     title:
 *                       type: string
 *                       description: The updated title of the issue
 *                     description:
 *                       type: string
 *                       description: The updated description of the issue
 *                     status:
 *                       type: string
 *                       description: The updated status of the issue
 *                     priority:
 *                       type: string
 *                       description: The updated priority of the issue
 *                     assigneeId:
 *                       type: string
 *                       description: The updated assignee ID
 *                     reporterId:
 *                       type: string
 *                       description: The updated reporter ID
 *                     parentTaskId:
 *                       type: string
 *                       description: The updated parent task ID (if applicable)
 *                     epicId:
 *                       type: string
 *                       description: The updated epic ID (if applicable)
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Timestamp when the issue was last updated
 *       400:
 *         description: Invalid input, required fields missing or invalid
 *       404:
 *         description: Issue not found for the provided ID
 *       500:
 *         description: Server error while updating the issue
 */
router.put('/:issueId', async (req, res) => {
  const { issueId } = req.params;
  const { title, description, status, priority, assigneeId, reporterId, parentTaskId, epicId } = req.body;

  try {
    const issue = await Issue.findById(issueId);
    if (!issue || issue.isDeleted) {
      return res.status(404).json({ success: false, message: 'Issue not found' });
    }

    if (title) issue.title = title;
    if (description) issue.description = description;
    if (status) issue.status = status;
    if (priority) issue.priority = priority;
    if (assigneeId) issue.assigneeId = assigneeId;
    if (reporterId) issue.reporterId = reporterId;
    if (parentTaskId) issue.parentTaskId = parentTaskId;
    if (epicId) issue.epicId = epicId;

    issue.updatedAt = Date.now();

    await issue.save();

    return res.status(200).json({ success: true, data: issue });
  } catch (err) {
    console.error('Error updating issue:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Soft Delete Issue Route
/**
 * @swagger
 * /issues/{issueId}:
 *   delete:
 *     summary: Soft delete an issue
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: issueId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Issue soft deleted successfully
 *       404:
 *         description: Issue not found
 *       500:
 *         description: Server error
 */
router.delete('/:issueId',
  [
     param('issueId')
          .custom((value) => mongoose.Types.ObjectId.isValid(value))
          .withMessage('Invalid issue ID'),
  ],
   async (req, res) => {
     const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }
  const { issueId } = req.params;

  try {
    // Find the issue by its ID and update isDeleted field
     const issue = await Issue.findById(issueId);
     if(!issue){
      return res.status(404).json({ success: false, message: 'Issue not found' });
     }

     if(issue.isDeleted){
      return res.status(404).json({ success: false, message: 'Issue already deleted' });
     }
     issue.isDeleted= true;
     await issue.save();
    return res.status(200).json({ success: true, message: 'Issue soft deleted successfully' });
  } catch (err) {
    console.error('Error deleting issue:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// route for updating issue status ( for drag and drop)
// Update the status of an issue
/**
 * @swagger
 * /issues/{issueId}/status:
 *   put:
 *     summary: Update the status of an issue
 *     tags: [Issues]
 *     parameters:
 *       - in: path
 *         name: issueId
 *         schema:
 *           type: string
 *         required: true
 *         description: The issue ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [to_do, in_progress, done]
 *     responses:
 *       200:
 *         description: Issue status updated successfully
 *       400:
 *         description: Invalid status
 *       404:
 *         description: Issue not found
 */
router.put('/:issueId/status', async (req, res) => {
  const { issueId } = req.params;
  const { status } = req.body; // example----> to_do, in_progress, done

  try {
    const issue = await Issue.findById(issueId);
    if (!issue || issue.isDeleted) {
      return res.status(404).json({ success: false, message: 'Issue deleted or not found' });
    }

    const validStatuses = ['to_do', 'in_progress', 'done'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    issue.status = status;
    await issue.save();

    return res.status(200).json({ success: true, message: 'Issue status updated' });
  } catch (err) {
    console.error('Error updating issue status:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
