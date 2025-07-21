const express = require("express");
const router = express.Router();
const multer = require("multer");
const documentController = require("../controllers/documentController");
const authMiddleware = require("../middleware/auth");

// Multer configuration
const upload = multer({
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
router.post("/", upload.single("file"), documentController.uploadDocument);
router.get("/", documentController.getDocuments);
router.get("/:id", documentController.getDocument);
router.put("/:id", documentController.updateDocument);
router.delete("/:id", documentController.deleteDocument);

module.exports = router;
