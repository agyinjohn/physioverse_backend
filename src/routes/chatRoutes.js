const express = require("express");
const router = express.Router();
const chatController = require("../controllers/chatController");
const authMiddleware = require("../middleware/auth");

router.use(authMiddleware);

router.post("/messages", chatController.sendMessage);
router.get("/messages", chatController.getMessages);
router.post("/groups", chatController.createGroupChat);
router.post("/messages/read", chatController.markAsRead);
router.get("/list", chatController.getChats);

module.exports = router;
