const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get user settings
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update email
router.put('/email', auth, async (req, res) => {
  const { email } = req.body;
  try {
    await User.findByIdAndUpdate(req.user.id, { email });
    res.json({ msg: 'Email updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update username
router.put('/username', auth, async (req, res) => {
  const { username } = req.body;
  try {
    await User.findByIdAndUpdate(req.user.id, { username });
    res.json({ msg: 'Username updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update password
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  console.log('Received data for password update:', req.body);
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ msg: 'Please provide current and new passwords' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Current password is incorrect' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    
    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// Update font size
router.put('/fontSize', auth, async (req, res) => {
  const { fontSize } = req.body;
  try {
    await User.findByIdAndUpdate(req.user.id, { fontSize });
    res.json({ msg: 'Font size updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
