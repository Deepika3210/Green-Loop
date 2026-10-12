require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const User = require('./models/User');
const Product = require('./models/Product');
const WasteLog = require('./models/WasteLog');
const ScanSession = require('./models/ScanSession');
const AIVerification = require('./models/AIVerification');

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 5000;
const AI_API_URL =
  process.env.AI_API_URL || 'http://127.0.0.1:8000';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is missing from .env');
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error('ERROR: MONGO_URI is missing from .env');
  process.exit(1);
}

const MIN_RECYCLABLE_CONFIDENCE = Number(
  process.env.MIN_RECYCLABLE_CONFIDENCE || 60
);

// ==========================================
// IMAGE UPLOAD CONFIGURATION
// ==========================================

const imageUpload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },

  fileFilter: (req, file, callback) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return callback(
        new Error('Upload a JPEG, PNG, or WEBP image.')
      );
    }

    callback(null, true);
  },
});

// ==========================================
// DATABASE CONNECTION
// ==========================================

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// ==========================================
// JWT AUTHENTICATION
// ==========================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.',
    });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    if (
      !decoded.userId ||
      !mongoose.isValidObjectId(decoded.userId)
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    req.user = {
      userId: String(decoded.userId),
      role: decoded.role,
    };

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token. Please log in again.',
    });
  }
}

function requireUserRole(req, res, next) {
  if (req.user.role !== 'user') {
    return res.status(403).json({
      success: false,
      message: 'This action is available to user accounts only.',
    });
  }

  next();
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    next();
  };
}
// ==========================================
// IMAGE UPLOAD ERROR HANDLING
// ==========================================

function handleImageUpload(req, res, next) {
  imageUpload.single('file')(req, res, (error) => {
    if (error) {
      const statusCode =
        error instanceof multer.MulterError
          ? error.code === 'LIMIT_FILE_SIZE'
            ? 413
            : 400
          : 400;

      return res.status(statusCode).json({
        success: false,
        message:
          error.code === 'LIMIT_FILE_SIZE'
            ? 'Image must not exceed 10 MB.'
            : error.message || 'Image upload failed.',
      });
    }

    next();
  });
}

// ==========================================
// BASIC ROUTE
// ==========================================

app.get('/', (req, res) => {
  res.json({
    message: 'Green Loop Backend is running',
  });
});

// ==========================================
// SIGNUP
// ==========================================

app.post('/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        message: 'Name, email and password are required.',
      });
    }

    if (
      typeof password !== 'string' ||
      password.length < 6
    ) {
      return res.status(400).json({
        message: 'Password must contain at least 6 characters.',
      });
    }

    const requestedRole = role || 'user';

    const validRoles = [
      'user',
      'manufacturer',
      'collection_center',
      'recycler',
    ];

    if (!validRoles.includes(requestedRole)) {
      return res.status(400).json({
        message: 'Invalid account role.',
      });
    }

    // Public registration must not grant business privileges.
    if (requestedRole !== 'user') {
      return res.status(403).json({
        message:
          'Business accounts must use the approved registration process.',
      });
    }

    const normalizedEmail = String(email)
      .trim()
      .toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(409).json({
        message: 'Email already registered.',
      });
    }

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: 'user',
      accountStatus: 'active',
      points: 0,
    });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        points: user.points,
        rewardHistory: user.rewardHistory || [],
      },
    });
  } catch (error) {
    console.error('Signup error:', error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: 'Email already registered.',
      });
    }

    return res.status(500).json({
      message: 'Signup failed.',
    });
  }
});

// ==========================================
// LOGIN
// ==========================================

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required.',
      });
    }

    const user = await User.findOne({
      email: String(email).trim().toLowerCase(),
    });

    if (
      !user ||
      !(await bcrypt.compare(password, user.password))
    ) {
      return res.status(401).json({
        message: 'Invalid email or password.',
      });
    }

    const accountStatus = user.accountStatus || 'active';

    if (accountStatus === 'pending') {
      return res.status(403).json({
        message: 'Your account is awaiting approval.',
      });
    }

    if (accountStatus === 'rejected') {
      return res.status(403).json({
        message: 'Your account request was rejected.',
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus,
        points: user.points || 0,
        rewardHistory: user.rewardHistory || [],
      },
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      message: 'Login failed.',
    });
  }
});

// ==========================================
// GET PRODUCTS
// ==========================================

app.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    return res.json(products);
  } catch (error) {
    console.error('Products error:', error);

    return res.status(500).json({
      message: 'Unable to fetch products.',
    });
  }
});

// ==========================================
// SCAN PRODUCT
// ==========================================

app.post(
  '/scan-product',
  authenticateToken,
  requireUserRole,
  async (req, res) => {
    try {
      const barcode = String(req.body.barcode || '')
        .trim()
        .replace(/\D/g, '');

      if (!barcode) {
        return res.status(400).json({
          message: 'Barcode is required.',
        });
      }

      const product = await Product.findOne({ barcode });

      if (!product) {
        return res.status(404).json({
          message: 'Product not found.',
          scannedBarcode: barcode,
        });
      }

      const scanSession = await ScanSession.create({
        user_id: req.user.userId,
        barcode,
        product_id: product._id,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });

      return res.json({
        message: 'Product scanned successfully.',
        product,
        scanToken: scanSession.scanToken,
        expiresAt: scanSession.expiresAt,
      });
    } catch (error) {
      console.error('Scan product error:', error);

      return res.status(500).json({
        message: 'Unable to scan product.',
      });
    }
  }
);

// ==========================================
// AI WASTE IMAGE VERIFICATION
// ==========================================

// Form-data:
// file = image
// scanToken = token returned by /scan-product

app.post(
  '/verify-waste-image',
  authenticateToken,
  requireUserRole,
  handleImageUpload,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Please upload a waste image.',
        });
      }

      const scanToken = String(
        req.body.scanToken || ''
      ).trim();

      if (!scanToken) {
        return res.status(400).json({
          success: false,
          message: 'scanToken is required.',
        });
      }

      // Find the active scan belonging to this user.
      const scanSession = await ScanSession.findOne({
        scanToken,
        user_id: req.user.userId,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!scanSession) {
        return res.status(400).json({
          success: false,
          message:
            'Invalid or expired scan. Please scan the product again.',
        });
      }

      // Do not reject an image merely because this scan
      // already has an AI verification record.
      // Reuse the record when it has not been consumed.
      let existingVerification =
        await AIVerification.findOne({
          scanSession_id: scanSession._id,
          user_id: req.user.userId,
        });

      if (
        existingVerification &&
        existingVerification.used
      ) {
        return res.status(409).json({
          success: false,
          message:
            'This verification has already been used. Please scan the product again.',
        });
      }

      // Forward the image to the Python AI service.
      const form = new FormData();

      const imageBlob = new Blob(
        [req.file.buffer],
        { type: req.file.mimetype }
      );

      form.append(
        'file',
        imageBlob,
        req.file.originalname || 'waste-image.jpg'
      );

      const aiResponse = await fetch(
        `${AI_API_URL}/predict`,
        {
          method: 'POST',
          body: form,
          signal: AbortSignal.timeout(60000),
        }
      );

      const responseText = await aiResponse.text();

      let prediction;

      try {
        prediction = JSON.parse(responseText);
      } catch {
        console.error(
          'Invalid AI response:',
          responseText
        );

        return res.status(502).json({
          success: false,
          message: 'Invalid response from AI service.',
        });
      }

      if (!aiResponse.ok) {
        return res.status(502).json({
          success: false,
          message:
            prediction.detail ||
            'AI service could not process the image.',
        });
      }

      const categoryMap = {
        R: 'Recyclable',
        O: 'Organic',
        N: 'Non-Recyclable',
      };

      const predictedClass =
        prediction.predicted_class;

      const category = categoryMap[predictedClass];

      const confidence = Number(
        prediction.confidence
      );

      if (
        prediction.success !== true ||
        !category ||
        !Number.isFinite(confidence) ||
        confidence < 0 ||
        confidence > 100
      ) {
        return res.status(502).json({
          success: false,
          message:
            'Invalid prediction returned by AI service.',
        });
      }

     const eligible = true;

      const verificationData = {
        user_id: req.user.userId,
        product_id: scanSession.product_id,
        scanSession_id: scanSession._id,
        predicted_category: category,
        confidence,
        eligible,
        used: false,
        expiresAt: new Date(
          Math.min(
            new Date(
              scanSession.expiresAt
            ).getTime(),
            Date.now() + 10 * 60 * 1000
          )
        ),
      };

      let verification;

      if (existingVerification) {
        // Update the existing unused verification.
        existingVerification.set(verificationData);

        verification = await existingVerification.save();
      } else {
        // Create a verification when none exists.
        try {
          verification =
            await AIVerification.create(
              verificationData
            );
        } catch (error) {
          // Handle a duplicate-key race safely.
          if (error.code !== 11000) {
            throw error;
          }

          verification =
            await AIVerification.findOne({
              scanSession_id: scanSession._id,
              user_id: req.user.userId,
            });

          if (!verification || verification.used) {
            return res.status(409).json({
              success: false,
              message:
                'This scan is already being verified or has been used. Please scan again.',
            });
          }

          verification.set(verificationData);

          verification =
            await verification.save();
        }
      }

      return res.json({
        success: true,
        message: eligible
          ? 'Image classified as recyclable. Continue to submission.'
          : 'Image classified but is not eligible for rewards.',
        verificationId: verification._id,
        predictedClass,
        category,
        confidence,
        eligible,
        classScores: prediction.class_scores,
        expiresAt: verification.expiresAt,
        note:
          'AI classification does not prove physical recycling.',
      });
    } catch (error) {
      console.error(
        'AI verification error:',
        error
      );

      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message:
            'A conflicting verification record exists. Please scan the product again.',
        });
      }

      if (
        error.name === 'TimeoutError' ||
        error.name === 'AbortError'
      ) {
        return res.status(504).json({
          success: false,
          message: 'AI verification timed out.',
        });
      }

      if (
        error.cause?.code === 'ECONNREFUSED' ||
        error.cause?.code === 'ECONNRESET'
      ) {
        return res.status(503).json({
          success: false,
          message: 'AI service is unavailable.',
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Unable to verify image.',
      });
    }
  }
);

// ==========================================
// GET USER PROFILE
// ==========================================

app.get(
  '/user/:id',
  authenticateToken,
  async (req, res) => {
    try {
      if (
        req.user.userId !== req.params.id &&
        req.user.role !== 'manufacturer'
      ) {
        return res.status(403).json({
          message: 'You can only access your own profile.',
        });
      }

      const user = await User.findById(
        req.params.id
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          message: 'User not found.',
        });
      }

      return res.json(user);
    } catch (error) {
      console.error('Get user error:', error);

      return res.status(500).json({
        message: 'Unable to fetch user.',
      });
    }
  }
);

// ==========================================
// UPDATE USER PROFILE
// ==========================================

app.patch(
  '/user/:id',
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.userId !== req.params.id) {
        return res.status(403).json({
          message: 'You can only update your own profile.',
        });
      }

      const { name, email } = req.body;

      if (!name || !email) {
        return res.status(400).json({
          message: 'Name and email are required.',
        });
      }

      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: req.params.id },
      });

      if (existingUser) {
        return res.status(409).json({
          message: 'Email already belongs to another account.',
        });
      }

      const user = await User.findByIdAndUpdate(
        req.user.userId,
        {
          name: String(name).trim(),
          email: normalizedEmail,
        },
        {
          new: true,
          runValidators: true,
        }
      ).select('-password');

      if (!user) {
        return res.status(404).json({
          message: 'User not found.',
        });
      }

      return res.json({
        message: 'Profile updated successfully.',
        user,
      });
    } catch (error) {
      console.error('Update profile error:', error);

      return res.status(500).json({
        message: 'Unable to update profile.',
      });
    }
  }
);

// ==========================================
// SUBMIT WASTE
// ==========================================

// Body:
// scanToken
// verificationId
// quantity

app.post(
  '/submit-waste',
  authenticateToken,
  requireUserRole,
  async (req, res) => {
    let claimedScanId = null;
    let claimedVerificationId = null;
    let createdWasteId = null;
    let pointsAdded = 0;

    try {
      const {
        quantity,
        scanToken,
        verificationId,
      } = req.body;

      if (
        quantity == null ||
        !scanToken ||
        !verificationId
      ) {
        return res.status(400).json({
          message:
            'Quantity, scanToken and verificationId are required.',
        });
      }

      const qty = Number(quantity);

      if (
        !Number.isInteger(qty) ||
        qty < 1 ||
        qty > 1000
      ) {
        return res.status(400).json({
          message:
            'Quantity must be a whole number between 1 and 1000.',
        });
      }

      if (!mongoose.isValidObjectId(verificationId)) {
        return res.status(400).json({
          message: 'Invalid verification reference.',
        });
      }

      const scanSession = await ScanSession.findOne({
        scanToken,
        user_id: req.user.userId,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!scanSession) {
        return res.status(400).json({
          message:
            'Invalid or expired scan. Please scan again.',
        });
      }

      const verification = await AIVerification.findOne({
  _id: verificationId,
  user_id: req.user.userId,
  product_id: scanSession.product_id,
  scanSession_id: scanSession._id,
  used: false,
  eligible: true,
  expiresAt: { $gt: new Date() },
});

      if (!verification) {
        return res.status(400).json({
          message:
            'No valid AI verification found. Verify a recyclable image and try again.',
        });
      }

      const product = await Product.findById(
        scanSession.product_id
      );

      if (!product) {
        return res.status(404).json({
          message: 'Product not found.',
        });
      }

      const pointsEarned =
        Number(product.points || 0) * qty;

      const totalWeight =
        Number(product.weight || 0) * qty;

      // Claim the scan atomically.
      const claimedScan =
        await ScanSession.findOneAndUpdate(
          {
            _id: scanSession._id,
            used: false,
            expiresAt: { $gt: new Date() },
          },
          { $set: { used: true } },
          { new: true }
        );

      if (!claimedScan) {
        return res.status(409).json({
          message:
            'This scan has already been used. Scan again.',
        });
      }

      claimedScanId = claimedScan._id;

      // Claim the AI verification atomically.
      const claimedVerification =
        await AIVerification.findOneAndUpdate(
          {
            _id: verification._id,
            used: false,
            eligible: true,
            expiresAt: { $gt: new Date() },
          },
          { $set: { used: true } },
          { new: true }
        );

      if (!claimedVerification) {
        await ScanSession.updateOne(
          { _id: claimedScanId },
          { $set: { used: false } }
        );

        claimedScanId = null;

        return res.status(409).json({
          message:
            'Verification already used or expired. Please scan and verify again.',
        });
      }

      claimedVerificationId =
        claimedVerification._id;

      const waste = await WasteLog.create({
        user_id: req.user.userId,
        product_id: product._id,
        scanSession_id: scanSession._id,
        quantity: qty,
        total_weight: totalWeight,
        points_earned: pointsEarned,
        ai_verification: {
          verified: true,
          predicted_category:
            verification.predicted_category,
          confidence: verification.confidence,
        },
        status: 'Pending',
      });

      createdWasteId = waste._id;

      // Increment the user's balance.
      const updatedUser =
        await User.findByIdAndUpdate(
          req.user.userId,
          { $inc: { points: pointsEarned } },
          { new: true, runValidators: true }
        ).select('-password');

      if (!updatedUser) {
        throw new Error('User account could not be updated.');
      }

      pointsAdded = pointsEarned;

      return res.status(201).json({
        message:
          'Waste submission accepted and Eco-Points awarded after AI validation.',
        waste,
        user: {
          id: updatedUser._id,
          name: updatedUser.name,
          email: updatedUser.email,
          role: updatedUser.role,
          points: updatedUser.points,
        },
        aiVerification: {
          category: verification.predicted_category,
          confidence: verification.confidence,
        },
        note:
          'AI classification does not prove physical recycling.',
      });
    } catch (error) {
      console.error('Submit waste error:', error);

      // Best-effort rollback if a later database operation fails.
      if (pointsAdded > 0) {
        try {
          await User.findByIdAndUpdate(
            req.user.userId,
            { $inc: { points: -pointsAdded } }
          );
        } catch (rollbackError) {
          console.error('Points rollback failed:', rollbackError);
        }
      }

      if (createdWasteId) {
        try {
          await WasteLog.deleteOne({
            _id: createdWasteId,
          });
        } catch (rollbackError) {
          console.error('Waste rollback failed:', rollbackError);
        }
      }

      if (claimedVerificationId) {
        try {
          await AIVerification.updateOne(
            { _id: claimedVerificationId },
            { $set: { used: false } }
          );
        } catch (rollbackError) {
          console.error(
            'Verification rollback failed:',
            rollbackError
          );
        }
      }

      if (claimedScanId) {
        try {
          await ScanSession.updateOne(
            { _id: claimedScanId },
            { $set: { used: false } }
          );
        } catch (rollbackError) {
          console.error('Scan rollback failed:', rollbackError);
        }
      }

      if (error.code === 11000) {
        return res.status(409).json({
          message: 'This scan has already been submitted.',
        });
      }

      return res.status(500).json({
        message: 'Unable to submit waste. Please try again.',
      });
    }
  }
);

// ==========================================
// RECYCLING HISTORY
// ==========================================

app.get(
  '/history/:user_id',
  authenticateToken,
  async (req, res) => {
    try {
      if (req.user.userId !== req.params.user_id) {
        return res.status(403).json({
          message:
            'You can only access your own recycling history.',
        });
      }

      const history = await WasteLog.find({
        user_id: req.user.userId,
      })
        .populate('product_id')
        .sort({ createdAt: -1 });

      const result = history.map((item) => ({
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
        ai_verification: item.ai_verification,
        createdAt: item.createdAt,
      }));

      return res.json(result);
    } catch (error) {
      console.error('History error:', error);

      return res.status(500).json({
        message: 'Unable to fetch recycling history.',
      });
    }
  }
);

// ==========================================
// REDEEM REWARD
// ==========================================

app.post(
  '/rewards/redeem',
  authenticateToken,
  requireUserRole,
  async (req, res) => {
    try {
      const { reward_id, title, points } = req.body;

      if (
        !reward_id ||
        !title ||
        points == null
      ) {
        return res.status(400).json({
          message: 'All reward fields are required.',
        });
      }

      const rewardPoints = Number(points);

      if (
        !Number.isFinite(rewardPoints) ||
        rewardPoints <= 0
      ) {
        return res.status(400).json({
          message: 'Invalid reward points.',
        });
      }

      // Atomic balance check and deduction.
      const user = await User.findOneAndUpdate(
        {
          _id: req.user.userId,
          points: { $gte: rewardPoints },
        },
        {
          $inc: { points: -rewardPoints },
          $push: {
            rewardHistory: {
              rewardId: String(reward_id),
              title: String(title),
              points: rewardPoints,
              redeemedAt: new Date(),
            },
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).select('-password');

      if (!user) {
        const existingUser = await User.findById(
          req.user.userId
        );

        if (!existingUser) {
          return res.status(404).json({
            message: 'User not found.',
          });
        }

        return res.status(400).json({
          message: 'Not enough points.',
        });
      }

      return res.json({
        message: 'Reward redeemed successfully.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          points: user.points,
          rewardHistory: user.rewardHistory,
        },
      });
    } catch (error) {
      console.error('Reward redemption error:', error);

      return res.status(500).json({
        message: 'Unable to redeem reward.',
      });
    }
  }
);
// ==========================================
// COLLECTION CENTRE: VIEW PENDING WASTE
// ==========================================

app.get(
  "/collection/waste",
  authenticateToken,
  requireRole("collection_center"),
  async (req, res) => {
    try {
      const records = await WasteLog.find({
        status: "Pending",
      })
        .populate("product_id", "brand barcode weight points")
        .populate("user_id", "name email")
        .sort({ createdAt: 1 });

      res.json({
        success: true,
        count: records.length,
        records,
      });
    } catch (error) {
      console.error("Collection records error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to fetch pending waste.",
      });
    }
  }
);


// ==========================================
// COLLECTION CENTRE: MARK WASTE COLLECTED
// ==========================================

app.patch(
  "/collection/waste/:id/collect",
  authenticateToken,
  requireRole("collection_center"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid waste record ID.",
        });
      }

      const record = await WasteLog.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "Pending",
        },
        {
          $set: {
            status: "Collected",
            collection_center_id: req.user.userId,
            collected_at: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate("product_id", "brand barcode weight");

      if (!record) {
        return res.status(409).json({
          success: false,
          message:
            "Waste record not found or it has already been processed.",
        });
      }

      res.json({
        success: true,
        message: "Waste marked as collected.",
        record,
      });
    } catch (error) {
      console.error("Collect waste error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update collection status.",
      });
    }
  }
);


// ==========================================
// RECYCLER: VIEW COLLECTED WASTE
// ==========================================

app.get(
  "/recycler/waste",
  authenticateToken,
  requireRole("recycler"),
  async (req, res) => {
    try {
      const records = await WasteLog.find({
        status: "Collected",
      })
        .populate("product_id", "brand barcode weight points")
        .populate("user_id", "name")
        .populate("collection_center_id", "name")
        .sort({ collected_at: 1 });

      res.json({
        success: true,
        count: records.length,
        records,
      });
    } catch (error) {
      console.error("Recycler records error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to fetch collected waste.",
      });
    }
  }
);


// ==========================================
// RECYCLER: MARK WASTE RECYCLED
// ==========================================

app.patch(
  "/recycler/waste/:id/recycle",
  authenticateToken,
  requireRole("recycler"),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid waste record ID.",
        });
      }

      const record = await WasteLog.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "Collected",
        },
        {
          $set: {
            status: "Recycled",
            recycler_id: req.user.userId,
            recycled_at: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      ).populate("product_id", "brand barcode weight");

      if (!record) {
        return res.status(409).json({
          success: false,
          message:
            "Only collected waste can be marked as recycled.",
        });
      }

      res.json({
        success: true,
        message: "Waste marked as recycled.",
        record,
      });
    } catch (error) {
      console.error("Recycle waste error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to update recycling status.",
      });
    }
  }
);


// ==========================================
// MANUFACTURER: EPR DASHBOARD SUMMARY
// ==========================================

app.get(
  "/epr/dashboard",
  authenticateToken,
  requireRole("manufacturer"),
  async (req, res) => {
    try {
      const summary = await WasteLog.aggregate([
        {
          $group: {
            _id: null,

            totalSubmissions: {
              $sum: {
                $cond: [
                  { $ne: ["$status", "Rejected"] },
                  1,
                  0,
                ],
              },
            },

            submittedWeight: {
              $sum: {
                $cond: [
                  { $ne: ["$status", "Rejected"] },
                  "$total_weight",
                  0,
                ],
              },
            },

            collectedWeight: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["Collected", "Recycled"],
                    ],
                  },
                  "$total_weight",
                  0,
                ],
              },
            },

            recycledWeight: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Recycled"] },
                  "$total_weight",
                  0,
                ],
              },
            },

            pendingWeight: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Pending"] },
                  "$total_weight",
                  0,
                ],
              },
            },

            rejectedWeight: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Rejected"] },
                  "$total_weight",
                  0,
                ],
              },
            },
          },
        },
      ]);

      const data = summary[0] || {
        totalSubmissions: 0,
        submittedWeight: 0,
        collectedWeight: 0,
        recycledWeight: 0,
        pendingWeight: 0,
        rejectedWeight: 0,
      };

      const round = (value) =>
        Math.round(Number(value || 0) * 100) / 100;

      res.json({
        success: true,
        dashboard: {
          totalSubmissions: data.totalSubmissions,
          submittedWeightKg: round(data.submittedWeight),
          collectedWeightKg: round(data.collectedWeight),
          recycledWeightKg: round(data.recycledWeight),
          pendingWeightKg: round(data.pendingWeight),
          rejectedWeightKg: round(data.rejectedWeight),
        },
        note:
          "Operational tracking figures; regulatory compliance requires applicable targets and supporting evidence.",
      });
    } catch (error) {
      console.error("EPR dashboard error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to calculate EPR dashboard.",
      });
    }
  }
);


// ==========================================
// MANUFACTURER: BRAND-WISE EPR STATISTICS
// ==========================================

app.get(
  "/epr/brands",
  authenticateToken,
  requireRole("manufacturer"),
  async (req, res) => {
    try {
      const brands = await WasteLog.aggregate([
        {
          $match: {
            status: { $ne: "Rejected" },
          },
        },
        {
          $lookup: {
            from: Product.collection.name,
            localField: "product_id",
            foreignField: "_id",
            as: "product",
          },
        },
        {
          $unwind: {
            path: "$product",
            preserveNullAndEmptyArrays: false,
          },
        },
        {
          $group: {
            _id: "$product.brand",

            submittedWeight: {
              $sum: "$total_weight",
            },

            collectedWeight: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$status",
                      ["Collected", "Recycled"],
                    ],
                  },
                  "$total_weight",
                  0,
                ],
              },
            },

            recycledWeight: {
              $sum: {
                $cond: [
                  { $eq: ["$status", "Recycled"] },
                  "$total_weight",
                  0,
                ],
              },
            },

            submissions: {
              $sum: 1,
            },
          },
        },
        {
          $project: {
            _id: 0,
            brand: "$_id",
            submissions: 1,
            submittedWeightKg: {
              $round: ["$submittedWeight", 2],
            },
            collectedWeightKg: {
              $round: ["$collectedWeight", 2],
            },
            recycledWeightKg: {
              $round: ["$recycledWeight", 2],
            },
          },
        },
        {
          $sort: {
            recycledWeightKg: -1,
            brand: 1,
          },
        },
      ]);

      res.json({
        success: true,
        brands,
      });
    } catch (error) {
      console.error("EPR brand statistics error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to calculate brand statistics.",
      });
    }
  }
);


// ==========================================
// MANUFACTURER: EPR WASTE RECORDS
// ==========================================

app.get(
  "/epr/records",
  authenticateToken,
  requireRole("manufacturer"),
  async (req, res) => {
    try {
      const records = await WasteLog.find()
        .populate("product_id", "brand barcode weight")
        .populate("collection_center_id", "name email")
        .populate("recycler_id", "name email")
        .sort({ createdAt: -1 })
        .limit(500);

      res.json({
        success: true,
        count: records.length,
        records,
      });
    } catch (error) {
      console.error("EPR records error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to fetch EPR records.",
      });
    }
  }
);
// ==========================================
// COLLECTION CENTRE: OWN COLLECTION HISTORY
// ==========================================

app.get(
  "/collection/records",
  authenticateToken,
  requireRole("collection_center"),
  async (req, res) => {
    try {
      const records = await WasteLog.find({
        collection_center_id: req.user.userId,
        status: { $in: ["Collected", "Recycled"] },
      })
        .populate("product_id", "brand barcode weight points")
        .populate("user_id", "name email")
        .populate("recycler_id", "name email")
        .sort({ collected_at: -1, createdAt: -1 });

      res.json({
        success: true,
        count: records.length,
        records,
      });
    } catch (error) {
      console.error("Collection history error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to fetch collection history.",
      });
    }
  }
);
// ==========================================
// RECYCLER: OWN RECYCLING HISTORY
// ==========================================

app.get(
  "/recycler/history",
  authenticateToken,
  requireRole("recycler"),
  async (req, res) => {
    try {
      const records = await WasteLog.find({
        recycler_id: req.user.userId,
        status: "Recycled",
      })
        .populate("product_id", "brand barcode weight points")
        .populate("user_id", "name email")
        .populate("collection_center_id", "name email")
        .sort({ recycled_at: -1, createdAt: -1 });

      res.json({
        success: true,
        count: records.length,
        records,
      });
    } catch (error) {
      console.error("Recycler history error:", error);

      res.status(500).json({
        success: false,
        message: "Unable to fetch recycling history.",
      });
    }
  }
);
// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});