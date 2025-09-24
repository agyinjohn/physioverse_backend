const express = require("express");
const router = express.Router();
const deviceController = require("../controllers/deviceController");
const authMiddleware = require("../middleware/auth");

// Device management routes
router
  .route("/devices")
  .get(deviceController.getDevices)
  .post(deviceController.createDevice);

// Prescription routes
router
  .route("/prescriptions")
  .post(deviceController.createPrescription)
  .get(deviceController.getDevicePrescriptions);

router.get("/prescriptions/:id", deviceController.getDevicePrescription);
router.put(
  "/prescriptions/:id/status",
  deviceController.updatePrescriptionStatus
);

module.exports = router;
