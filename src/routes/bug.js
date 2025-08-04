const express = require('express');
const router = express.Router();
const Bug = require('../models/Bug');
const Backlog = require("../models/Backlog");

router.post("/bugs", async (req, res) => {
  try {
    const bug = await Bug.create(req.body);
    await Backlog.findOneAndUpdate(
      { projectId: bug.projectId },
      { $push: { bugs: bug._id } }
    );
    res.status(201).json(bug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;
