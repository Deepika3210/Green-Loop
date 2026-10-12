const mongoose = require('mongoose');

/* =========================================================
   REWARD HISTORY
========================================================= */

const rewardHistorySchema = new mongoose.Schema({
  rewardId: {
    type: String,
    required: true,
  },

  title: {
    type: String,
    required: true,
  },

  points: {
    type: Number,
    required: true,
  },

  redeemedAt: {
    type: Date,
    default: Date.now,
  },
});

/* =========================================================
   USER SCHEMA
========================================================= */

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: [
        'user',
        'manufacturer',
        'collection_center',
        'recycler',
      ],
      default: 'user',
      required: true,
    },

    // Business accounts require administrator approval.
    accountStatus: {
      type: String,
      enum: ['active', 'pending', 'rejected'],
      default: 'active',
      required: true,
    },

    points: {
      type: Number,
      default: 0,
      min: 0,
    },

    rewardHistory: {
      type: [rewardHistorySchema],
      default: [],
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model('User', userSchema);