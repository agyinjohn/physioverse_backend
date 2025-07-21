const Message = require("../models/Message");
const GroupChat = require("../models/GroupChat");
const User = require("../models/User");
const admin = require("firebase-admin");

// Initialize Firebase Admin at the top of the file
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  }),
});

exports.sendMessage = async (req, res) => {
  try {
    const { recipient, groupChat, content, attachments, replyTo } = req.body;

    if (!recipient && !groupChat) {
      return res.status(400).json({
        success: false,
        message: "Either recipient or groupChat must be provided",
      });
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient,
      groupChat,
      content,
      attachments,
      replyTo,
      readBy: [{ user: req.user._id }],
    });

    await message.populate([
      { path: "sender", select: "name email" },
      { path: "recipient", select: "name email fcmToken" },
      { path: "replyTo" },
    ]);

    // Update last message for group chat
    if (groupChat) {
      await GroupChat.findByIdAndUpdate(groupChat, {
        lastMessage: message._id,
      });

      const group = await GroupChat.findById(groupChat).populate(
        "members",
        "fcmToken"
      );

      const tokens = group.members
        .filter((member) => member._id.toString() !== req.user._id.toString())
        .map((member) => member.fcmToken)
        .filter((token) => token);

      if (tokens.length > 0) {
        await admin.messaging().sendMulticast({
          tokens,
          data: {
            type: "new_message",
            messageId: message._id.toString(),
            chatId: groupChat,
            content,
            senderId: req.user._id.toString(),
            senderName: req.user.name,
            senderEmail: req.user.email,
          },
        });
      }
    } else {
      const recipientUser = await User.findById(recipient);
      if (recipientUser?.fcmToken) {
        await admin.messaging().send({
          token: recipientUser.fcmToken,
          data: {
            type: "new_message",
            messageId: message._id.toString(),
            chatId: recipient,
            content,
            senderId: req.user._id.toString(),
            senderName: req.user.name,
            senderEmail: req.user.email,
          },
        });
      }
    }

    // Emit socket event
    req.io.to(recipient || groupChat).emit("new_message", message);

    res.status(201).json({
      success: true,
      data: message,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const { recipient, groupChat, page = 1, limit = 10000 } = req.query;
    const query = {};

    if (recipient) {
      query.$or = [
        { sender: req.user._id, recipient },
        { sender: recipient, recipient: req.user._id },
      ];
    } else if (groupChat) {
      query.groupChat = groupChat;
    }

    const messages = await Message.find(query)
      .populate("sender", "name email")
      .populate("recipient", "name email")
      .populate("replyTo")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Message.countDocuments(query);

    res.json({
      success: true,
      data: messages.reverse(),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.createGroupChat = async (req, res) => {
  try {
    const { name, description, members, isPrivate } = req.body;

    const groupChat = await GroupChat.create({
      name,
      description,
      members: [...members, req.user._id],
      admins: [req.user._id],
      isPrivate,
    });

    await groupChat.populate("members", "name email");
    await groupChat.populate("admins", "name email");

    // Notify all members
    members.forEach((memberId) => {
      req.io.to(memberId).emit("group_chat_created", groupChat);
    });

    res.status(201).json({
      success: true,
      data: groupChat,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { messageIds } = req.body;

    await Message.updateMany(
      {
        _id: { $in: messageIds },
        "readBy.user": { $ne: req.user._id },
      },
      {
        $push: {
          readBy: {
            user: req.user._id,
            readAt: new Date(),
          },
        },
      }
    );

    res.json({
      success: true,
      message: "Messages marked as read",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.getChats = async (req, res) => {
  try {
    // Get groups where user is a member
    const groups = await GroupChat.find({ members: req.user._id })
      .populate("members", "name email")
      .sort({ updatedAt: -1 });

    // Get all users except current user
    const users = await User.find({
      _id: { $ne: req.user._id },
    }).select("name email");

    // Format response without messages
    const chats = [
      ...groups.map((group) => ({
        _id: group._id,
        name: group.name,
        isGroup: true,
        members: group.members,
      })),
      ...users.map((user) => ({
        _id: user._id,
        name: user.name,
        isGroup: false,
        members: [user],
      })),
    ];

    res.json({
      success: true,
      data: chats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

exports.registerToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;
    await User.findByIdAndUpdate(req.user._id, { fcmToken });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
