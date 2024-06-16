const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Chatroom = require('../models/Chatroom');

// Create a new chatroom
router.post('/', auth, async (req, res) => {
  const { name } = req.body;
  try {
    const newChatroom = new Chatroom({ name });
    await newChatroom.save();
    res.status(201).json(newChatroom);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get all chatrooms
router.get('/', auth, async (req, res) => {
  try {
    const chatrooms = await Chatroom.find();
    res.json(chatrooms);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
