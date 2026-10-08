const mongoose = require('mongoose');

/* =========================================================
   WASTE / RECYCLING LOG SCHEMA
========================================================= */

const wasteLogSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
    },

    total_weight: {
      type: Number,
      required: true,
      min: 0,
    },

    points_earned: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      default: 'Verified',
      enum: [
        'Pending',
        'Verified',
        'Rejected',
        'Collected',
        'Recycled',
      ],
    },
  },

  {
    timestamps: true,
  }
);

module.exports = mongoose.model('WasteLog', wasteLogSchema);