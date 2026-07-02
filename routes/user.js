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

const Transaction = require('../models/Transaction');

// @route   GET /api/user/income
// @desc    Get all income records (Admin only)
router.get('/income', authenticateToken, isAdmin, async (req, res) => {
  try {
    const records = await Transaction.find({ type: 'income' }).sort({ createdAt: -1 });
    // Map description to source for backwards compatibility with the frontend
    const mapped = records.map(r => ({
      _id: r._id,
      userPhone: r.userPhone,
      source: r.description,
      amount: r.amount,
      createdAt: r.createdAt
    }));
    res.json(mapped);
  } catch (error) {
    console.error('Error fetching income records:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/user/stats
// @desc    Get admin dashboard overview statistics (Admin only)
router.get('/stats', authenticateToken, isAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activePlans = await User.countDocuments({ plan: { $ne: 'None' } });

    // Calculate deposits (sum of type='deposit' and status='approved')
    const deposits = await Transaction.aggregate([
      { $match: { type: 'deposit', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalDeposits = deposits.length > 0 ? deposits[0].total : 0;

    // Calculate withdrawals (sum of type='withdraw' and status='approved')
    const withdrawals = await Transaction.aggregate([
      { $match: { type: 'withdraw', status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalWithdrawals = withdrawals.length > 0 ? withdrawals[0].total : 0;

    // Calculate daily income (sum of yields today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daily = await Transaction.aggregate([
      { $match: { type: 'income', createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const dailyIncome = daily.length > 0 ? daily[0].total : 0;

    const netRevenue = totalDeposits - totalWithdrawals;

    // Get 10 recent transactions
    const recentTransactions = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalDeposits,
        totalWithdrawals,
        dailyIncome,
        activePlans,
        netRevenue
      },
      recentTransactions
    });
  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/user/transactions
// @desc    Get all transactions (Admin only)
router.get('/transactions', authenticateToken, isAdmin, async (req, res) => {
  try {
    const transactions = await Transaction.find().sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/user/my-transactions
// @desc    Get logged-in user's transactions
router.get('/my-transactions', authenticateToken, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/user/deposits
// @desc    Get all deposits (Admin only)
router.get('/deposits', authenticateToken, isAdmin, async (req, res) => {
  try {
    const list = await Transaction.find({ type: 'deposit' }).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/user/deposit/:id
// @desc    Approve or reject a deposit request (Admin only)
router.put('/deposit/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.type !== 'deposit') {
      return res.status(400).json({ success: false, message: 'Transaction is not a deposit' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Deposit has already been processed' });
    }

    transaction.status = status;
    await transaction.save();

    // If approved, add the amount to user's balance
    if (status === 'approved') {
      const user = await User.findById(transaction.userId);
      if (user) {
        user.balance += transaction.amount;
        await user.save();
      }
    }

    res.json({ success: true, message: `Deposit request ${status} successfully!`, transaction });
  } catch (error) {
    console.error('Update deposit status error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/user/deposit
// @desc    Submit a deposit request (User)
router.post('/deposit', authenticateToken, async (req, res) => {
  try {
    const { amount, method } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid deposit amount' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Create a pending deposit transaction
    const depositTrx = new Transaction({
      userId: user._id,
      userPhone: user.phoneNumber,
      type: 'deposit',
      amount: Number(amount),
      status: 'pending',
      description: `Deposit - ${method || 'Bank Transfer'}`
    });
    await depositTrx.save();

    res.status(201).json({
      success: true,
      message: 'Deposit request submitted successfully! Pending review.',
      transaction: depositTrx
    });
  } catch (error) {
    console.error('Submit deposit error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   GET /api/user/my-deposits
// @desc    Get logged-in user's deposits
router.get('/my-deposits', authenticateToken, async (req, res) => {
  try {
    const list = await Transaction.find({ userId: req.user.id, type: 'deposit' }).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error('Error fetching user deposits:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   GET /api/user/withdrawals
// @desc    Get all withdrawals (Admin only)
router.get('/withdrawals', authenticateToken, isAdmin, async (req, res) => {
  try {
    const list = await Transaction.find({ type: 'withdraw' }).sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    console.error('Error fetching withdrawals:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// @route   PUT /api/user/withdraw/:id
// @desc    Approve or reject a withdrawal request (Admin only)
router.put('/withdraw/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (status !== 'approved' && status !== 'rejected') {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const transaction = await Transaction.findById(req.params.id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }

    if (transaction.type !== 'withdraw') {
      return res.status(400).json({ success: false, message: 'Transaction is not a withdrawal' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Withdrawal has already been processed' });
    }

    transaction.status = status;
    await transaction.save();

    // If rejected, refund the deducted amount back to user balance
    if (status === 'rejected') {
      const user = await User.findById(transaction.userId);
      if (user) {
        user.balance += Math.abs(transaction.amount);
        await user.save();
      }
    }

    res.json({ success: true, message: `Withdrawal request ${status} successfully!`, transaction });
  } catch (error) {
    console.error('Update withdrawal status error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// @route   POST /api/user/withdraw
// @desc    Submit a withdrawal request (User)
router.post('/withdraw', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.balance < Number(amount)) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Deduct from balance immediately
    user.balance -= Number(amount);
    await user.save();

    // Create a pending withdrawal transaction (store as negative amount in ledger)
    const withdrawTrx = new Transaction({
      userId: user._id,
      userPhone: user.phoneNumber,
      type: 'withdraw',
      amount: -Number(amount),
      status: 'pending',
      description: 'Withdrawal Request'
    });
    await withdrawTrx.save();

    res.status(201).json({
      success: true,
      message: 'Withdrawal request submitted successfully! Pending review.',
      balance: user.balance
    });
  } catch (error) {
    console.error('Submit withdrawal error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
