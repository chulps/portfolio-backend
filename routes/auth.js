const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const crypto = require('crypto');

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

// Send reset password email
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
    console.log(`Received request for password reset for email: ${email}`);

    try {
        const user = await User.findOne({ email });
        console.log(`User found: ${user}`);

        if (!user) {
            console.log('User with this email does not exist');
            return res.status(400).json({ msg: 'User with this email does not exist' });
        }

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        console.log(`Generated token: ${token}`);

        const resetUrl = `${process.env.RESET_PASSWORD_URL}/#/reset-password/${token}`;
        console.log(`Reset URL: ${resetUrl}`);

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password Reset',
            text: `Click this link to reset your password: ${resetUrl}`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
                return res.status(500).send('Error sending email');
            } else {
                console.log('Email sent:', info.response);
                res.json({ msg: 'Password reset email sent' });
            }
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).send('Server Error');
    }
});

// Register a new user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ msg: 'Invalid email format' });
        }

        // Validate password strength
        if (password.length < 8) {
            return res.status(400).json({ msg: 'Password must be at least 8 characters long' });
        }

        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'Email already exists' });
        }

        user = await User.findOne({ username });
        if (user) {
            return res.status(400).json({ msg: 'Username already exists' });
        }

        user = new User({
            username,
            email,
            password,
        });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                profileImage: user.profileImage,
            },
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5 days' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});



// Login a user
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    console.log('Received login request with email:', email, 'and password:', password);

    try {
        let user = await User.findOne({ email });
        console.log('Found user:', user);

        if (!user) {
            console.log('User not found');
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        console.log('Password match:', isMatch);

        if (!isMatch) {
            console.log('Password does not match');
            return res.status(400).json({ msg: 'Invalid email or password' });
        }

        const payload = {
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                profileImage: user.profileImage,
            },
        };

        const isProfileComplete = !!(user.name && user.bio && user.profileImage);

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5 days' },
            (err, token) => {
                if (err) {
                    console.error('Error generating token:', err.message);
                    throw err;
                }
                console.log('Generated token:', token);
                res.json({ token, isProfileComplete });
            }
        );
    } catch (err) {
        console.error('Error during login:', err.message);
        res.status(500).send('Server Error');
    }
});

// Check if username exists
router.post('/check-username', async (req, res) => {
    const { username } = req.body;
    try {
      const user = await User.findOne({ username });
      if (user) {
        return res.json({ exists: true });
      } else {
        return res.json({ exists: false });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });
  
  // Check if email exists
  router.post('/check-email', async (req, res) => {
    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      if (user) {
        return res.json({ exists: true });
      } else {
        return res.json({ exists: false });
      }
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

// Reset password route
router.post('/reset-password/:token', async (req, res) => {
    const { password } = req.body;

    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_SECRET);
        console.log(`Decoded token: ${JSON.stringify(decoded)}`);
        const user = await User.findById(decoded.id);
        console.log(`User found: ${user}`);

        if (!user) {
            return res.status(400).json({ msg: 'Password reset token is invalid or has expired' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        console.log(`Hashed password: ${hashedPassword}`);
        user.password = hashedPassword;
        await user.save();

        res.status(200).json({ msg: 'Password has been reset' });
    } catch (err) {
        console.error('Error during password reset:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
