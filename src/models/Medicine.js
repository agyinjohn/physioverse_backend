const mongoose = require("mongoose");

const medicineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    genericName: String,
    category: {
      type: String,
      required: true,
      enum: ["tablet", "syrup", "injection", "cream", "other"],
    },
    price: {
      type: Number,
      required: true,
    },
    stock: {
      type: Number,
      required: true,
      default: 0,
    },
    unit: {
      type: String,
      required: true,
      enum: ["tablets", "bottles", "tubes", "vials", "pieces"],
    },
    manufacturer: String,
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
    expiryDate: Date,
    batchNumber: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Medicine", medicineSchema);
