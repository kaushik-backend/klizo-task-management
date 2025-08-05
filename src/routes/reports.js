const express = require("express");
const router = express.Router();
const Sprint = require("../models/Sprint");
const Issue = require("../models/Issue");
const Project = require("../models/Project");

router.get('/pie-chart', async (req, res) => {
  try {
    const { projectId } = req.query;
    
    const issues = await Issue.find({ project: projectId });
    
    const issueTypeCounts = issues.reduce((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1;
      return acc;
    }, {});

    res.json({ issueTypeCounts });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// velocity chart -- data needed
router.get('/velocity', async (req, res) => {
  try {
    const { projectId, numberOfSprints } = req.query;

    // Fetch sprints for the project
    const sprints = await Sprint.find({ projectId: projectId }).limit(numberOfSprints);
    
    const velocityData = sprints.map(async sprint => {
      const issues = await Issue.find({ sprint: sprint._id });
      const completedIssues = issues.filter(issue => issue.status === 'done');
      const plannedWork = issues.length;
      const completedWork = completedIssues.length;
      return { sprintName: sprint.name, plannedWork, completedWork };
    });

    res.json({ velocityData });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

//  created vs completed issues
router.get('/created-vs-resolved', async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;

    // Fetch created and resolved issues within the time frame
    const createdIssues = await Issue.find({
      projectId: projectId,
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });
    console.log("createdIssues=============",createdIssues);
    const resolvedIssues = await Issue.find({
      projectId: projectId,
      status: 'done',
      updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    });

    const resolvePercent =(resolvedIssues.length/createdIssues.length)*100+' %' ;
        console.log("resolvedIssues=============",resolvedIssues);
    res.json({
      createdIssuesCount: createdIssues.length,
      resolvedIssuesCount: resolvedIssues.length,
      resolvePercentage:resolvePercent,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Burndown chart route
router.get('/burndown', async (req, res) => {
  try {
    const { sprintId } = req.query;
    if (!sprintId) {
      return res.status(400).json({ message: "Sprint ID is required" });
    }

    // Fetch sprint data
    const sprint = await Sprint.findById(sprintId).populate("issues").populate("timeLogs");
    if (!sprint) {
      return res.status(404).json({ message: "Sprint not found" });
    }

    // Fetch issues related to the sprint
    const issues = sprint.issues;

    // Calculate burndown data
    const burndownData = await calculateBurndownData(issues, sprint);

    res.json({ burndownData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

async function calculateBurndownData(issues, sprint) {
  let totalWork = 0;
  let completedWork = 0;

  issues.forEach((issue) => {
    const timeSpent = issue.timeLogs.reduce((sum, log) => sum + log.timeSpent, 0);

    totalWork += timeSpent;

    if (issue.status === 'done') {
      completedWork += timeSpent;
    }
  });

  const remainingWork = totalWork - completedWork;

  const burndownData = {
    totalWork,
    completedWork,
    remainingWork,
    sprintStart: sprint.startDate,
    sprintEnd: sprint.endDate,
    timeSpentLogs: sprint.timeLogs,  
  };

  return burndownData;
}

// Efficiency endpoint for projects
// Calculate project efficiency using issues and sprints with timeLogs from Sprint model
router.get('/efficiency', async (req, res) => {
  try {
    const projects = await Project.find();

    let projectEfficiency = [];

    for (let project of projects) {
      const issues = await Issue.find({ projectId: project._id });
      const sprints = await Sprint.find({ projectId: project._id });

      let totalIssues = 0;
      let completedIssues = 0;
      let totalTimeSpent = 0;
      let totalSprintTime = 0;
      let totalCompletedTime = 0;

      // Iterate through each sprint of the project
      for (let sprint of sprints) {
        let sprintTime = (new Date(sprint.endDate) - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24);  // in days
        totalSprintTime += sprintTime;

        // Calculate time spent for issues in the sprint based on timeLogs in the sprint
        sprint.timeLogs.forEach((log) => {
          // Find the issue related to the current time log
          const issue = issues.find(issue => issue._id.toString() === log.issueId.toString());
          if (issue) {
            const timeSpent = log.timeSpent;
            totalTimeSpent += timeSpent;

            if (issue.status === 'done') {
              completedIssues++;
              totalCompletedTime += timeSpent;
            }
            totalIssues++;
          }
        });
      }

      // Efficiency Calculation
      const efficiency = calculateEfficiency(totalIssues, completedIssues, totalTimeSpent, totalSprintTime);

      projectEfficiency.push({
        projectId: project._id,
        projectName: project.name,
        efficiency,
      });
    }

    // Sort projects by efficiency (highest first)
    projectEfficiency.sort((a, b) => b.efficiency - a.efficiency);

    // Get most and least efficient projects
    const mostEfficient = projectEfficiency[0];
    const leastEfficient = projectEfficiency[projectEfficiency.length - 1];

    res.json({ mostEfficient, leastEfficient });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Helper function to calculate project efficiency based on time and completion
function calculateEfficiency(totalIssues, completedIssues, totalTimeSpent, totalSprintTime) {
  if (totalIssues === 0 || totalSprintTime === 0) return 0;  

  const completionRate = completedIssues / totalIssues;
  const timeEfficiency = totalTimeSpent / (totalSprintTime * 8);  // Assuming 8 hours/day for sprint time

  // Efficiency as a weighted average of completion rate and time efficiency
  const efficiency = (completionRate - timeEfficiency) * 100;

  return efficiency;
}

module.exports = router;
