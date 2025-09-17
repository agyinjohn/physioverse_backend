const express = require("express");
const router = express.Router();
const appointmentController = require("../controllers/appointmentController");
const authMiddleware = require("../middleware/auth");

// Protect all routes
router.use(authMiddleware);

// Appointment routes
router.post("/", appointmentController.createAppointment);
router.get("/", appointmentController.getAppointments);
router.get("/:id", appointmentController.getAppointment);
router.put("/:id", appointmentController.updateAppointment);
router.delete("/:id", appointmentController.deleteAppointment);
router.patch("/:id/status", appointmentController.updateStatus);
router.patch("/:id/reschedule", appointmentController.rescheduleAppointment);
router.get("/patient/:patientId", appointmentController.getPatientAppointments);

module.exports = router;
