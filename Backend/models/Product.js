const mongoose = require('mongoose');

/* =========================================================
   PRODUCT SCHEMA
========================================================= */

const productSchema = new mongoose.Schema(
  {
    brand: {
      type: String,
      required: true,
      trim: true,
    },

    barcode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    points: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    weight: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Product', productSchema);