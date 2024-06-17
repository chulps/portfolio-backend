const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get friends and friend requests
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('friends friendRequests.sender', 'username email');
    res.json({
      friends: user.friends,
      friendRequests: user.friendRequests,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Send a friend request
router.post('/send-request', auth, async (req, res) => {
  const { email } = req.body;
  try {
    const recipient = await User.findOne({ email });
    if (!recipient) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const existingRequest = recipient.friendRequests.find(
      (req) => req.sender.toString() === req.user.id
    );

    if (existingRequest) {
      return res.status(400).json({ msg: 'Friend request already sent' });
    }

    recipient.friendRequests.push({ sender: req.user.id });
    await recipient.save();
    res.json({ msg: 'Friend request sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Accept a friend request
router.post('/accept-request', auth, async (req, res) => {
  const { senderId } = req.body;
  try {
    const user = await User.findById(req.user.id);
    const sender = await User.findById(senderId);

    if (!sender) {
      return res.status(404).json({ msg: 'User not found' });
    }

    user.friendRequests = user.friendRequests.filter(
      (req) => req.sender.toString() !== senderId
    );

    user.friends.push(senderId);
    sender.friends.push(req.user.id);

    await user.save();
    await sender.save();

    res.json({ msg: 'Friend request accepted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Reject a friend request
router.post('/reject-request', auth, async (req, res) => {
  const { senderId } = req.body;
  try {
    const user = await User.findById(req.user.id);

    user.friendRequests = user.friendRequests.filter(
      (req) => req.sender.toString() !== senderId
    );

    await user.save();

    res.json({ msg: 'Friend request rejected' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
