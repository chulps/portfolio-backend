const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get notifications for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('notifications');
    res.json({ notifications: user.notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
