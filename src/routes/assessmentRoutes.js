const express = require("express");
const router = express.Router();
const assessmentController = require("../controllers/assessmentController");
const authMiddleware = require("../middleware/auth");

// Protect all routes
router.use(authMiddleware);

// Assessment routes
router.post("/", assessmentController.createAssessment);
router.get("/", assessmentController.getAssessments);
router.get("/:id", assessmentController.getAssessment);
router.put("/:id", assessmentController.updateAssessment);
router.patch("/:id/toggle-status", assessmentController.toggleStatus);
router.patch("/:id/toggle-clinic", assessmentController.toggleClinicPresence);
router.delete("/:id", assessmentController.deleteAssessment);
router.post("/vitals", assessmentController.updateVitals);

module.exports = router;
