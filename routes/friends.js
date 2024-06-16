const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Friend = require('../models/Friend');

// Add a friend
router.post('/', auth, async (req, res) => {
  const { email } = req.body;
  try {
    const newFriend = new Friend({
      userId: req.user.id,
      friendEmail: email,
    });
    await newFriend.save();
    res.status(201).json(newFriend);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all friends
router.get('/', auth, async (req, res) => {
  try {
    const friends = await Friend.find({ userId: req.user.id });
    res.json(friends);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
