const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const authMiddleware = require("../middleware/auth");

// Protected routes - require authentication
router.use(authMiddleware);

// Get dashboard statistics
router.get("/stats", dashboardController.getDashboardStats);

// Get revenue statistics
router.get("/revenue", dashboardController.getRevenueStats);

module.exports = router;
