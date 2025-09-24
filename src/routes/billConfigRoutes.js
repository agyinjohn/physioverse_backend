const express = require("express");
const router = express.Router();
const billConfigController = require("../controllers/billConfigController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router
  .route("/")
  .get(billConfigController.getActiveBillConfigs)
  .post(billConfigController.createBillConfig);

router.route("/:id").put(billConfigController.updateBillConfig);

module.exports = router;
