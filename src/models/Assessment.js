const mongoose = require("mongoose");

const assessmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
      required: true,
    },
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    patientId: {
      type: String,
      required: true,
    },
    patientName: {
      type: String,
      required: true,
    },

    subjective: {
      type: String,
      default: "",
    },
    objective: {
      type: String,
      default: "",
    },
    diagnosis: {
      type: String,
      default: "",
    },
    prognosis: {
      type: String,
      default: "",
    },
    treatmentPlan: {
      type: String,
      default: "",
    },
    treatment: {
      type: String,
      default: "",
    },
    treatmentNotes: {
      type: String,
      default: "",
    },
    reviewNotes: {
      type: String,
      default: "",
    },
    vitals: {
      bloodPressure: String,
      temperature: String,
      heartRate: String,
      respiratoryRate: String,
      spO2: String,
      weight: String,
      height: String,
    },
    formTypes: [
      {
        id: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
    ],
    status: {
      type: String,
      enum: [
        "pending",
        "in_progress",
        "completed",
        "pending_review",
        "cancelled",
        "review_scheduled", // Add new status
      ],
      default: "pending",
    },
    reviewScheduled: {
      type: Boolean,
      default: false,
    },
    responses: {
      type: Object, // Change from Map to Object
      default: {},
    },
    totalScore: Number,
    notes: String,
    documents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Document",
      },
    ],
    isInClinic: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Assessment", assessmentSchema);
