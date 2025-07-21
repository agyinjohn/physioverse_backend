const express = require("express");
const router = express.Router();
const billController = require("../controllers/billController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

// Add route for getting a single bill
router.get("/:id", billController.getBillById);

router.get("/", billController.getBills);
router.post("/create", billController.createBill);
router.post("/:id/cancel", billController.cancelBill);

// Add payment route
router.post("/:id/payments", billController.addPayment);

module.exports = router;
