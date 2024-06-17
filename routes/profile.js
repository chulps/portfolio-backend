const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const Profile = require('../models/Profile');

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
    console.log("Request user:", req.user); // Add this line to log the user from the request
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { name, bio },
      { new: true, upsert: true }
    );
    res.status(201).json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Upload profile image
router.post('/upload-image', auth, upload.single('profileImage'), async (req, res) => {
  try {
    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { profileImage: req.file.path },
      { new: true }
    );
    res.status(201).json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Get profile
router.get('/', auth, async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });
    res.json(profile);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
