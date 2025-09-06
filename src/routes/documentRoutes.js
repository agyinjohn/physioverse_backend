const express = require("express");
const router = express.Router();
const multer = require("multer");
const documentController = require("../controllers/documentController");
const patientController = require("../controllers/patientController");
const authMiddleware = require("../middleware/auth");
const upload = require("../middleware/upload");

// Multer configuration
const uploadMulter = multer({
  storage: multer.diskStorage({}),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images and documents
    if (
      file.mimetype.startsWith("image/") ||
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"), false);
    }
  },
});

// Protect all routes
router.use(authMiddleware);

// Document routes
router.post(
  "/",
  upload.single("file"), // Make sure this matches your multer configuration
  documentController.uploadDocument
);
router.get("/", documentController.getDocuments);
router.get("/:id", documentController.getDocument);
router.put("/:id", documentController.updateDocument);
router.delete("/:id", documentController.deleteDocument);

// Patient document routes
// router.post(
//   "/:patientId/documents",
//   authMiddleware,
//   upload.single("file"),
//   patientController.uploadDocument
// );

router.get(
  "/:patientId/documents",
  authMiddleware,
  patientController.getPatientDocuments
);

router.delete(
  "/:patientId/documents/:documentId",
  authMiddleware,
  patientController.deleteDocument
);

module.exports = router;
