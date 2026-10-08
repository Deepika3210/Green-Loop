require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('./models/User');
const Product = require('./models/Product');
const WasteLog = require('./models/WasteLog');

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'green_loop_secret_change_this_later';

/* =========================================================
   DATABASE CONNECTION
========================================================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Connected');
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
  });

/* =========================================================
   BASIC ROUTE
========================================================= */

app.get('/', (req, res) => {
  res.json({
    message: 'Green Loop Backend is running',
  });
});

/* =========================================================
   AUTHENTICATION - SIGNUP
========================================================= */

app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'Password must contain at least 6 characters',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Email already registered',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'user',
      points: 0,
    });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
      }
    );

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        rewardHistory: user.rewardHistory || [],
      },
    });
  } catch (error) {
    console.error('Signup error:', error);

    res.status(500).json({
      message: 'Signup failed',
      error: error.message,
    });
  }
});

/* =========================================================
   AUTHENTICATION - LOGIN
========================================================= */

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: 'Invalid email or password',
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      JWT_SECRET,
      {
        expiresIn: '7d',
      }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        rewardHistory: user.rewardHistory || [],
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    res.status(500).json({
      message: 'Login failed',
      error: error.message,
    });
  }
});

/* =========================================================
   GET ALL PRODUCTS
========================================================= */

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    res.json(products);
  } catch (error) {
    console.error('Products error:', error);

    res.status(500).json({
      message: 'Unable to fetch products',
      error: error.message,
    });
  }
});

/* =========================================================
   SCAN PRODUCT
========================================================= */

app.post('/scan-product', async (req, res) => {
  try {
    const rawBarcode = req.body.barcode;

    const barcode = String(rawBarcode || '')
      .trim()
      .replace(/\D/g, '');

    console.log('Scanned barcode:', barcode);

    if (!barcode) {
      return res.status(400).json({
        message: 'Barcode is required',
      });
    }

    const product = await Product.findOne({
      barcode: barcode,
    });

    if (!product) {
      console.log('Product not found:', barcode);

      return res.status(404).json({
        message: 'Product Not Found',
        scannedBarcode: barcode,
      });
    }

    console.log('Product found:', product.brand);

    res.json(product);
  } catch (error) {
    console.error('Scan product error:', error);

    res.status(500).json({
      message: 'Unable to scan product',
      error: error.message,
    });
  }
});

/* =========================================================
   GET USER
========================================================= */

app.get('/user/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      '-password'
    );

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);

    res.status(500).json({
      message: 'Unable to fetch user',
      error: error.message,
    });
  }
});

/* =========================================================
   UPDATE USER PROFILE
========================================================= */

app.patch('/user/:id', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.params.id },
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Email already belongs to another account',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      {
        name: name.trim(),
        email: normalizedEmail,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    res.json({
      message: 'Profile updated successfully',
      user,
    });
  } catch (error) {
    console.error('Update user error:', error);

    res.status(500).json({
      message: 'Unable to update profile',
      error: error.message,
    });
  }
});

/* =========================================================
   SUBMIT WASTE / RECYCLING
========================================================= */

app.post('/submit-waste', async (req, res) => {
  try {
    const {
      user_id,
      product_id,
      quantity,
      total_weight,
    } = req.body;

    if (!user_id || !product_id || !quantity) {
      return res.status(400).json({
        message: 'user_id, product_id and quantity are required',
      });
    }

    const qty = Number(quantity);

    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({
        message: 'Quantity must be at least 1',
      });
    }

    const user = await User.findById(user_id);
    const product = await Product.findById(product_id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (!product) {
      return res.status(404).json({
        message: 'Product not found',
      });
    }

    const calculatedWeight =
      Number(total_weight) ||
      Number(product.weight || 0) * qty;

    const pointsEarned =
      Number(product.points || 0) * qty;

    const waste = await WasteLog.create({
      user_id: user._id,
      product_id: product._id,
      quantity: qty,
      total_weight: calculatedWeight,
      points_earned: pointsEarned,
      status: 'Verified',
    });

    user.points =
      Number(user.points || 0) + pointsEarned;

    await user.save();

    res.status(201).json({
      message: 'Recycling submitted successfully',
      waste,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        rewardHistory: user.rewardHistory || [],
      },
    });
  } catch (error) {
    console.error('Submit waste error:', error);

    res.status(500).json({
      message: 'Unable to submit recycling',
      error: error.message,
    });
  }
});

/* =========================================================
   GET RECYCLING HISTORY
========================================================= */

app.get('/history/:user_id', async (req, res) => {
  try {
    const history = await WasteLog.find({
      user_id: req.params.user_id,
    })
      .populate('product_id')
      .sort({
        createdAt: -1,
      });

    const formattedHistory = history.map((item) => ({
      id: item._id,
      product: item.product_id
        ? {
            id: item.product_id._id,
            brand: item.product_id.brand,
            barcode: item.product_id.barcode,
            points: item.product_id.points,
            weight: item.product_id.weight,
          }
        : null,
      quantity: item.quantity,
      total_weight: item.total_weight,
      points_earned: item.points_earned,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    res.json(formattedHistory);
  } catch (error) {
    console.error('History error:', error);

    res.status(500).json({
      message: 'Unable to fetch recycling history',
      error: error.message,
    });
  }
});

/* =========================================================
   REDEEM REWARD
========================================================= */

app.post('/rewards/redeem', async (req, res) => {
  try {
    const {
      user_id,
      reward_id,
      title,
      points,
    } = req.body;

    if (!user_id || !reward_id || !title || points == null) {
      return res.status(400).json({
        message:
          'user_id, reward_id, title and points are required',
      });
    }

    const rewardPoints = Number(points);

    if (
      !Number.isFinite(rewardPoints) ||
      rewardPoints <= 0
    ) {
      return res.status(400).json({
        message: 'Invalid reward points',
      });
    }

    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found',
      });
    }

    if (Number(user.points || 0) < rewardPoints) {
      return res.status(400).json({
        message: 'Not enough points',
      });
    }

    user.points =
      Number(user.points || 0) - rewardPoints;

    user.rewardHistory.push({
      rewardId: String(reward_id),
      title: String(title),
      points: rewardPoints,
      redeemedAt: new Date(),
    });

    await user.save();

    res.json({
      message: 'Reward redeemed successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
        rewardHistory: user.rewardHistory || [],
      },
    });
  } catch (error) {
    console.error('Reward redemption error:', error);

    res.status(500).json({
      message: 'Unable to redeem reward',
      error: error.message,
    });
  }
});

/* =========================================================
   LEGACY CREATE USER ROUTE
========================================================= */

app.post('/create-user', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        message: 'Name and email are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.json({
        message: 'User already exists',
        user: {
          id: existingUser._id,
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role,
          points: existingUser.points,
        },
      });
    }

    const legacyPassword = await bcrypt.hash(
      'legacy-user',
      10
    );

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: legacyPassword,
      role: 'user',
      points: 0,
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points,
      },
    });
  } catch (error) {
    console.error('Create user error:', error);

    res.status(500).json({
      message: 'Unable to create user',
      error: error.message,
    });
  }
});

/* =========================================================
   START SERVER
========================================================= */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});