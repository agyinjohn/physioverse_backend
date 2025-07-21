const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
// const { protect } = require("../middleware/authMiddleware");
const authMiddleware = require("../middleware/auth");
router.use(authMiddleware);

// Place specific routes before parameter routes
router.get("/active", patientController.getActivePatients);
router.get("/find/:patientId", patientController.getPatientByPatientId);

router.post("/bills/update-status", patientController.updateBillStatus);
router.post("/:id/opd-register", patientController.registerForOPD);
router.post("/:id/bills", patientController.createBill);

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

module.exports = router;
