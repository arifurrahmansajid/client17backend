require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb+srv://admin:admin@cluster0.abcde.mongodb.net/vip-platform");
  await Product.updateMany({}, { image: 'https://images.unsplash.com/photo-1542385151-efd9000785a0?q=80&w=300&auto=format&fit=crop' });
  console.log('Images updated successfully');
  process.exit(0);
}

fix().catch(console.error);
