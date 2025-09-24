const Patient = require("../models/Patient");
const Appointment = require("../models/Appointment");
const Assessment = require("../models/Assessment");
const DashboardStats = require("../models/DashboardStats");
const Review = require("../models/Review");

exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastMonth = new Date(today);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    // Get active patients count and compare with last month
    const activePatients = await Patient.countDocuments({ status: "active" });
    const lastMonthPatients = await Patient.countDocuments({
      status: "active",
      createdAt: { $lt: today, $gte: lastMonth },
    });
    const patientsGrowth = lastMonthPatients
      ? ((activePatients - lastMonthPatients) / lastMonthPatients) * 100
      : 0;

    // Get today's appointments and completion rate
    const todayAppointments = await Appointment.countDocuments({
      dateTime: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    });
    const completedAppointments = await Appointment.countDocuments({
      dateTime: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
      status: "completed",
    });
    const appointmentCompletionRate = todayAppointments
      ? (completedAppointments / todayAppointments) * 100
      : 0;

    // Get assessment completion rate for current month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const totalAssessments = await Assessment.countDocuments({
      createdAt: { $gte: monthStart, $lt: today },
      status: { $ne: "cancelled" }, // Exclude cancelled assessments
    });

    const completedAssessments = await Assessment.countDocuments({
      createdAt: { $gte: monthStart, $lt: today },
      status: "completed",
    });

    const assessmentCompletionRate = totalAssessments
      ? (completedAssessments / totalAssessments) * 100
      : 0;

    // Get pending assessment reviews
    const pendingReviews = await Review.countDocuments({
      status: "pending",
      createdAt: { $gte: monthStart, $lt: today },
    });
    console.log(pendingReviews);
    const lastMonthPendingReviews = await Review.countDocuments({
      status: "pending",
      createdAt: {
        $gte: new Date(monthStart.getFullYear(), monthStart.getMonth() - 1, 1),
        $lt: monthStart,
      },
    });

    const reviewsChange = lastMonthPendingReviews
      ? ((pendingReviews - lastMonthPendingReviews) / lastMonthPendingReviews) *
        100
      : 0;

    // Get patient trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const patientTrends = await Patient.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Get appointments and patients by day (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Get appointments by day
    const appointmentsByDay = await Appointment.aggregate([
      {
        $match: {
          dateTime: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$dateTime" } },
          },
          appointments: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // Get patients registered by day
    const patientsByDay = await Patient.aggregate([
      {
        $match: {
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          },
          patients: { $sum: 1 },
        },
      },
      {
        $sort: { "_id.date": 1 },
      },
    ]);

    // Combine the data
    const days = getLast7Days();
    const combinedData = days.map((day) => {
      const appointmentData = appointmentsByDay.find(
        (a) => a._id.date === day.date
      ) || { appointments: 0 };
      const patientData = patientsByDay.find(
        (p) => p._id.date === day.date
      ) || { patients: 0 };

      return {
        date: day.date,
        name: day.name,
        appointments: appointmentData.appointments,
        patients: patientData.patients,
      };
    });

    // Get top patients by appointment frequency
    const topPatients = await Patient.aggregate([
      {
        $lookup: {
          from: "appointments",
          localField: "_id",
          foreignField: "patient",
          as: "appointments",
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          patientId: 1,
          appointmentCount: { $size: "$appointments" },
          lastAppointment: { $max: "$appointments.dateTime" },
        },
      },
      {
        $sort: { appointmentCount: -1, lastAppointment: -1 },
      },
      {
        $limit: 4,
      },
    ]);

    // Get 5 most recent patients
    const recentPatients = await Patient.find({ status: "active" })
      .select("firstName lastName patientId phone status")
      .sort({ createdAt: -1 })
      .limit(5);

    // Get today's appointments (max 5)
    const todaysAppointments = await Appointment.find({
      dateTime: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
      },
    })
      .populate("patient", "firstName lastName")
      .sort({ dateTime: 1 })
      .limit(5);

    // Save stats to database
    await DashboardStats.create({
      date: today,
      activePatients,
      appointmentsToday: todayAppointments,
      assessmentsCompleted: completedAssessments,
      patientTrends: patientTrends.map((pt) => ({
        month: `${pt._id.year}-${pt._id.month}`,
        patients: pt.count,
      })),
      appointmentsByDay: combinedData,
    });

    res.json({
      success: true,
      data: {
        activePatients: {
          count: activePatients,
          progress: patientsGrowth,
        },
        appointments: {
          count: todayAppointments,
          completed: completedAppointments,
          progress: appointmentCompletionRate,
        },
        assessments: {
          total: totalAssessments,
          completed: completedAssessments,
          progress: assessmentCompletionRate,
        },
        pendingReviews: {
          count: pendingReviews,
          lastMonth: lastMonthPendingReviews,
          progress: reviewsChange,
        },
        patientTrends,
        appointmentsByDay: combinedData,
        topPatients: topPatients.map((patient) => ({
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          patientId: patient.patientId,
          appointmentCount: patient.appointmentCount,
          lastAppointment: patient.lastAppointment,
        })),
        recentPatients: recentPatients.map((patient) => ({
          id: patient._id,
          name: `${patient.firstName} ${patient.lastName}`,
          patientId: patient.patientId,
          phone: patient.phone,
          status: patient.status,
        })),
        todaysAppointments: todaysAppointments.map((apt) => ({
          id: apt._id,
          patientName: `${apt.patient.firstName} ${apt.patient.lastName}`,
          time: apt.dateTime,
          status: apt.status,
        })),
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
};

// Helper function to get last 7 days
const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      date: date.toISOString().split("T")[0],
      name: date.toLocaleDateString("en-US", { weekday: "short" }),
    });
  }
  return days;
};

exports.getRevenueStats = async (req, res) => {
  try {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);

    // Aggregate revenue data
    // Note: You'll need to implement your actual revenue calculation logic
    const revenueStats = {
      daily: 0, // Calculate from appointments/services for today
      monthly: 0, // Calculate from appointments/services this month
      yearly: 0, // Calculate from appointments/services this year
    };

    res.json({
      success: true,
      data: revenueStats,
    });
  } catch (error) {
    console.error("Revenue stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching revenue statistics",
      error: error.message,
    });
  }
};
