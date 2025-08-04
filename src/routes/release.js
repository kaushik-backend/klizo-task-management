const express = require('express');
const router = express.Router();
const Release = require('../models/Release');

router.post('/', async (req, res) => {
  try {
    const release = await Release.create(req.body);
    return res.status(201).json({ success: true, data: release });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
