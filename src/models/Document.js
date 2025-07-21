const mongoose = require("mongoose");

const documentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
    },
    name: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["x-ray", "mri", "report", "other"],
    },
    fileUrl: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true, // e.g., "image/jpeg", "application/pdf"
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    size: Number,
    notes: String,
    tags: [String],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Document", documentSchema);
