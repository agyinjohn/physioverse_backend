const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    files: [
      {
        url: String,
        filename: String,
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    type: {
      type: String,
      enum: ["x-ray", "mri", "ct-scan", "prescription", "lab-report", "other"],
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    notes: String,
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Document", documentSchema);
