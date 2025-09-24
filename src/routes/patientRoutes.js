const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const authMiddleware = require("../middleware/auth");

// Protect all routes
router.use(authMiddleware);

// Place specific routes first
router.get("/active", patientController.getActivePatients);
router.get("/find/:patientId", patientController.getPatientByPatientId);

// Assessment route - must come before generic :id routes
router.get("/:id/assessments", patientController.getPatientAssessments);

// Generic CRUD routes with :id parameter
router
  .route("/")
  .get(patientController.getPatients)
  .post(patientController.createPatient);

router
  .route("/:id")
  .get(patientController.getPatient)
  .put(patientController.updatePatient)
  .delete(patientController.deletePatient);

router.post("/bills/update-status", patientController.updateBillStatus);
router.post("/:id/opd-register", patientController.registerForOPD);
router.post("/:id/bills", patientController.createBill);

module.exports = router;
