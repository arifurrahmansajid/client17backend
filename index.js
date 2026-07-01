require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const seedSuperAdmin = require('./utils/seedAdmin');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas successfully!');
    seedSuperAdmin();
  })
  .catch((err) => {
    console.error('Error connecting to MongoDB:', err);
  });

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/user', require('./routes/user'));

// Basic route
app.get('/', (req, res) => {
  res.send('VIP Investment API is running...');
});

// Server listener
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
