const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided, authorization denied' });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || 'vip_invest_fallback_secret_key_123!';
    const decoded = jwt.verify(token, jwtSecret);
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// @route   GET /api/user/me
// @desc    Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/user/avatar
// @desc    Update user avatar
router.put('/avatar', authenticateToken, async (req, res) => {
  try {
    const { avatar } = req.body;
    
    if (!avatar) {
      return res.status(400).json({ message: 'Avatar image is required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.avatar = avatar;
    await user.save();

    res.json({ message: 'Avatar updated successfully', avatar: user.avatar });
  } catch (error) {
    console.error('Error updating avatar:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// Middleware to check if user is admin or super admin
const isAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied: Admin role required' });
  }
};

// @route   GET /api/user/all
// @desc    Get all users (Admin only)
router.get('/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/user/update/:id
// @desc    Update a user's details (Admin only)
router.put('/update/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { balance, plan, referrals, status } = req.body;
    const updateData = {};
    if (balance !== undefined) updateData.balance = Number(balance);
    if (plan !== undefined) updateData.plan = plan;
    if (referrals !== undefined) updateData.referrals = Number(referrals);
    if (status !== undefined) updateData.status = status;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Error updating user details:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
