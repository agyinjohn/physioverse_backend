const express = require("express");
const router = express.Router();
const pharmacyController = require("../controllers/pharmacyController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Medicine routes
router
  .route("/medicines")
  .get(pharmacyController.getMedicines)
  .post(pharmacyController.createMedicine);

router
  .route("/medicines/:id")
  .get(pharmacyController.getMedicine)
  .put(pharmacyController.updateMedicine)
  .delete(pharmacyController.deleteMedicine);

router
  .route("/medicines/:id/stock")
  .post(pharmacyController.updateMedicineStock);

// Prescription routes
router
  .route("/prescriptions")
  .get(pharmacyController.getPrescriptions)
  .post(pharmacyController.createPrescription);

// Add new route for getting single prescription
router.route("/prescriptions/:id").get(pharmacyController.getPrescription);

router
  .route("/prescriptions/:id/status")
  .put(pharmacyController.updatePrescriptionStatus);

module.exports = router;
