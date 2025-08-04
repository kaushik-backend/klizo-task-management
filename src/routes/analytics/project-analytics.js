const express = require("express");
const router= express.Router();

router.get('/:projectId/analytics', async (req, res) => {
  const { projectId } = req.params;

  try {
    const projectAnalytics = await Issue.aggregate([
      { $match: { projectId: mongoose.Types.ObjectId(projectId) } },
      { $unwind: "$timeLogs" },
      {
        $group: {
          _id: "$projectId",
          totalTimeSpent: { $sum: "$timeLogs.timeSpent" },
          totalIssues: { $count: {} },
          completedIssues: {
            $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] }
          },
          inProgressIssues: {
            $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] }
          }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      data: projectAnalytics
    });
  } catch (err) {
    console.error('Error fetching project analytics:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports= router;
