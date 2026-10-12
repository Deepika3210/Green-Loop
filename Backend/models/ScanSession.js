const mongoose = require('mongoose');
const crypto = require('crypto');

const scanSessionSchema = new mongoose.Schema(
  {
    scanToken: {
      type: String,
      required: true,
      unique: true,
      default: () => crypto.randomBytes(32).toString('hex'),
    },

    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    barcode: {
      type: String,
      required: true,
    },

    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    used: {
      type: Boolean,
      default: false,
    },

    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 10 * 60 * 1000),
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  'ScanSession',
  scanSessionSchema
);