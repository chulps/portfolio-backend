const express = require('express');
const User = require('../models/User'); // Adjusted path
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check for existing user
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).send({ error: 'Username already exists.' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = new User({ username, password: hashedPassword });
    await user.save();

    res.status(201).send({ message: 'User created' });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).send({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Using environment variable
    res.send({ token });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;
