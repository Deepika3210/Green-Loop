const mongoose = require("mongoose");

const aiVerificationSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    product_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },

    scanSession_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ScanSession",
      required: true,
    },

    predicted_category: {
      type: String,
      enum: ["Recyclable", "Organic", "Non-Recyclable"],
      required: true,
    },

    confidence: {
      type: Number,
      min: 0,
      max: 100,
      required: true,
    },

    eligible: {
      type: Boolean,
      required: true,
      default: false,
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

// Allow only one verification record per scan session.
aiVerificationSchema.index(
  { scanSession_id: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "AIVerification",
  aiVerificationSchema
);