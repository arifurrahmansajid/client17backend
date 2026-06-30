const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ phoneNumber });
    if (!user) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid phone number or password' });
    }

    // Create JWT payload
    const payload = {
      user: {
        id: user._id,
        role: user.role
      }
    };

    // Use a default secret if not provided in .env
    const jwtSecret = process.env.JWT_SECRET || 'vip_invest_fallback_secret_key_123!';

    // Sign Token
    jwt.sign(
      payload,
      jwtSecret,
      { expiresIn: '7d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user._id,
            phoneNumber: user.phoneNumber,
            role: user.role
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

module.exports = router;
