const express = require('express');
const router = express.Router();
const Backlog = require('../models/Backlog');

router.post('/', async (req, res) => {
  try {
    const backlog = await Backlog.create(req.body);
    return res.status(201).json({ success: true, data: backlog });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
