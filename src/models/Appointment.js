const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Patient",
    },
    therapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    duration: {
      type: Number,
      default: 60, // minutes
    },
    type: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled", "no-show"],
      default: "scheduled",
    },
    notes: String,
    reminder: {
      sent: {
        type: Boolean,
        default: false,
      },
      scheduledFor: Date,
    },
    notifications: {
      patient: {
        type: Boolean,
        default: true,
      },
      therapist: {
        type: Boolean,
        default: true,
      },
      lastSent: Date,
      reminder: {
        sent: Boolean,
        scheduledFor: Date,
      },
    },
    assessment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assessment",
    },
    guestInfo: {
      firstName: String,
      lastName: String,
      phone: String,
      email: String,
      issue: String,
    },
    isNewPatient: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
