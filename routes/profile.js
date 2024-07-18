const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const User = require('../models/User');

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Create or update profile
router.post('/', auth, async (req, res) => {
  const { name, bio } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { name, bio },
      { new: true }
    );
    res.status(201).json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Upload profile image
router.post('/upload-image', auth, upload.single('profileImage'), async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profileImage: req.file.path },
      { new: true }
    );
    res.status(201).json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get current user's profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('contacts', 'username name profileImage').populate('blocked', 'username name profileImage');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get profile by user ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).populate('contacts', 'username name profileImage').populate('blocked', 'username name profileImage');
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Add a contact (send friend request)
router.post('/:userId/add-contact', auth, async (req, res) => {
  try {
    const sender = await User.findById(req.user.id);
    const recipient = await User.findById(req.params.userId);

    if (!recipient) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if friend request already exists
    const existingRequest = recipient.friendRequests.find(request => request.sender.toString() === sender._id.toString());

    if (existingRequest) {
      return res.status(400).json({ msg: 'Friend request already sent' });
    }

    recipient.friendRequests.push({ sender: sender._id });
    await recipient.save();

    res.json({ msg: 'Friend request sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Remove a contact
router.post('/:userId/remove-contact', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const contact = await User.findById(req.params.userId);

    if (!user || !contact) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Remove the contact from the user's friends list
    user.friends = user.friends.filter(friendId => friendId.toString() !== contact._id.toString());
    await user.save();

    // Remove the user from the contact's friends list
    contact.friends = contact.friends.filter(friendId => friendId.toString() !== user._id.toString());
    await contact.save();

    res.json({ msg: 'Contact removed', userFriends: user.friends, contactFriends: contact.friends });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Block a user
router.post('/:userId/block', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { blocked: req.params.userId } },
      { new: true }
    ).populate('blocked', 'username name profileImage');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Unblock a user
router.post('/:userId/unblock', auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { blocked: req.params.userId } },
      { new: true }
    ).populate('blocked', 'username name profileImage');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
