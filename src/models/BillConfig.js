const mongoose = require("mongoose");

const billConfigSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ["consultation", "therapy", "assessment", "other"],
    },
    price: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("BillConfig", billConfigSchema);
