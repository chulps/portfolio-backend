const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Chatroom = require('../models/Chatroom');

// Search endpoint
router.get('/', async (req, res) => {
  const { query } = req.query;

  try {
    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }, // Added name search
      ],
    }).select('username email profileImage name');

    const chatrooms = await Chatroom.find({
      isPublic: true,
      name: { $regex: query, $options: 'i' },
    }).select('name');

    res.json({ users, chatrooms });
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
