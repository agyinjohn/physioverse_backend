const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    prescribedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    devices: [
      {
        device: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Device", // We'll create a Device model
          required: true,
        },
        duration: String, // How long to use the device
        frequency: String, // How often to use
        instructions: String,
        quantity: Number,
        amount: Number, // Rental/Usage fee
      },
    ],
    diagnosis: String,
    treatment: String, // Added field for treatment plan
    notes: String,
    status: {
      type: String,
      enum: ["pending", "issued", "returned", "cancelled"],
      default: "pending",
    },
    billAdded: {
      type: Boolean,
      default: false,
    },
    returnDate: Date, // When devices should be returned
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Prescription", prescriptionSchema);
