const mongoose = require("mongoose");

const wasteLogSchema = new mongoose.Schema(
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
    collection_center_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

recycler_id: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "User",
  default: null,
},

collected_at: {
  type: Date,
  default: null,
},

recycled_at: {
  type: Date,
  default: null,
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

    ai_verification: {
      verified: {
        type: Boolean,
        required: true,
        default: false,
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
    },

    status: {
      type: String,
      default: "Pending",
      enum: [
        "Pending",
        "Verified",
        "Rejected",
        "Collected",
        "Recycled",
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple waste logs from using the same scan session.
wasteLogSchema.index(
  { scanSession_id: 1 },
  { unique: true }
);

module.exports = mongoose.model("WasteLog", wasteLogSchema);