const mongoose = require('mongoose');

/* =========================================================
   REWARD HISTORY SCHEMA
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
      enum: ['user', 'manufacturer'],
      default: 'user',
    },

    points: {
      type: Number,
      default: 0,
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