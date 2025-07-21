const mongoose = require("mongoose");

const dashboardStatsSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    activePatients: {
      type: Number,
      default: 0,
    },
    appointmentsToday: {
      type: Number,
      default: 0,
    },
    assessmentsCompleted: {
      type: Number,
      default: 0,
    },
    pageViews: {
      type: Number,
      default: 0,
    },
    patientsByDay: [
      {
        date: Date,
        count: Number,
      },
    ],
    appointmentsByDay: [
      {
        date: Date,
        count: Number,
      },
    ],
    revenue: {
      daily: Number,
      monthly: Number,
      yearly: Number,
    },
    patientTrends: [
      {
        month: String,
        patients: Number,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("DashboardStats", dashboardStatsSchema);
