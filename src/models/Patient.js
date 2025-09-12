const mongoose = require("mongoose");

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: true,
      unique: true,
    },
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: true,
    },
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    phone: {
      type: String,
      required: true,
    },
    email: String,
    address: String,
    emergencyContact: {
      name: String,
      phone: String,
      relationship: {
        type: String,
        enum: ["parent", "spouse", "child", "sibling", "friend", "other"],
      },
    },
    medicalHistory: String,
    vitals: {
      bloodPressure: String,
      temperature: String,
      heartRate: String,
      respiratoryRate: String,
      spO2: String,
      weight: String,
      height: String,
      recordedAt: {
        type: Date,
        default: Date.now,
      },
    },
    vitalsHistory: [
      {
        bloodPressure: String,
        temperature: String,
        heartRate: String,
        respiratoryRate: String,
        spO2: String,
        weight: String,
        height: String,
        recordedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    opdRegistration: {
      date: Date,
      status: {
        type: String,
        enum: ["pending", "vitals_recorded", "completed"],
      },
    },
    assignedTherapist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    profileImage: {
      type: String,
      default:
        "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTmWIZx2te0JPQrh761lA4d4W6UGJnPsyRi1U5KnyeVXnEx2UmLb1FmW3gJk39nk02eJqA&usqp=CAU", // Default placeholder image
    },
    admissionStatus: {
      type: String,
      enum: ["discharged", "detained", "active"],
      default: "active",
    },
    bills: [
      {
        amount: Number,
        description: String,
        date: Date,
        status: {
          type: String,
          enum: ["paid", "pending", "overdue"],
          default: "pending",
        },
      },
    ],
    prescriptions: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Prescription",
      },
    ],
    documents: [
      {
        name: String,
        url: String,
        type: {
          type: String,
          enum: [
            "x-ray",
            "mri",
            "ct-scan",
            "prescription",
            "lab-report",
            "other",
          ],
        },
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        uploadedAt: {
          type: Date,
          default: Date.now,
        },
        notes: String,
      },
    ],
    immediateAssessment: {
      required: {
        type: Boolean,
        default: false,
      },
      issue: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Patient", patientSchema);
