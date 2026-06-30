const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Get all products (sorted by price ascending)
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ price: 1 });
    res.json({ success: true, products });
  } catch (err) {
    console.error("Fetch products error:", err);
    res.status(500).json({ success: false, message: 'Server error fetching products' });
  }
});

// Create a new product (For admin)
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Seed initial products
router.post('/seed', async (req, res) => {
  try {
    const count = await Product.countDocuments();
    if (count > 0) return res.json({ success: true, message: 'Products already seeded' });

    const seedData = [
      { name: "VIP1", price: 80, days: 720, daily: 20, total: 14400, active: true },
      { name: "VIP2", price: 160, days: 720, daily: 41, total: 29520, active: true },
      { name: "VIP3", price: 320, days: 720, daily: 85, total: 61200, active: true },
      { name: "VIP4", price: 500, days: 720, daily: 160, total: 115200, active: true },
      { name: "VIP5", price: 1000, days: 720, daily: 320, total: 230400, active: true },
      { name: "VIP6", price: 2000, days: 720, daily: 650, total: 468000, active: true },
      { name: "VIP7", price: 4000, days: 720, daily: 1420, total: 1028160, active: false },
      { name: "VIP8", price: 8000, days: 720, daily: 3000, total: 2160000, active: false },
      { name: "VIP9", price: 16000, days: 720, daily: 6400, total: 4608000, active: false },
      { name: "VIP10", price: 20000, days: 720, daily: 9000, total: 6480000, active: false },
    ];

    await Product.insertMany(seedData);
    res.status(201).json({ success: true, message: 'Seeded initial products' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
