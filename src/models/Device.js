const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["exercise", "electrical", "manual", "heat", "other"],
    },
    price: {
      type: Number,
      required: true, // Price per day/session
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    description: String,
    usage: String, // Usage instructions
    maintenance: String, // Maintenance instructions
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Device", deviceSchema);
