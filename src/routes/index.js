const express = require("express");
const router = express.Router();
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const dashboardRoutes = require("./dashboardRoutes");
const patientRoutes = require("./patientRoutes");
const assessmentRoutes = require("./assessmentRoutes");
const documentRoutes = require("./documentRoutes");
const reviewRoutes = require("./reviewRoutes");
const appointmentRoutes = require("./appointmentRoutes");
const chatRoutes = require("./chatRoutes");
const authMiddleware = require("../middleware/auth");
const roleRoutes = require("./roleRoutes");
const pharmacyRoutes = require("./pharmacyRoutes");
const billsRoutes = require("./billRoutes");
const deviceRoutes = require("./deviceRoutes");

// Public routes
// router.use("/auth", authRoutes);

// Protected routes
router.use("/users", userRoutes);

router.use("/dashboard", authMiddleware, dashboardRoutes);
router.use("/patients", authMiddleware, patientRoutes);
router.use("/assessments", authMiddleware, assessmentRoutes);
router.use("/reviews", authMiddleware, reviewRoutes);
router.use("/appointments", authMiddleware, appointmentRoutes);
router.use("/pharmacy", authMiddleware, pharmacyRoutes);
router.use("/chat", authMiddleware, chatRoutes);
router.use("/roles", roleRoutes);
router.use("/bills", authMiddleware, billsRoutes);
router.use("/auth", authRoutes);
router.use("/documents", authMiddleware, documentRoutes);
router.use("/device", authMiddleware, deviceRoutes);

module.exports = router;
