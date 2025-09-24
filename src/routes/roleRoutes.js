const express = require("express");
const router = express.Router();
const roleController = require("../controllers/roleController");
const authMiddleware = require("../middleware/auth");

// Protect all routes
router.use(authMiddleware);

router.post("/", roleController.createRole);
router.get("/", roleController.getAllRoles);
router.put("/:id", roleController.updateRole); // Add update route
router.delete("/:id", roleController.deleteRole); // Add delete route

module.exports = router;
