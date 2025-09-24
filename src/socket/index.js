const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Message = require("../models/Message");
const GroupChat = require("../models/GroupChat");

const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error"));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error("User not found"));
    }

    socket.user = user;
    next();
  } catch (error) {
    next(new Error("Authentication error"));
  }
};

const setupSocketIO = (io) => {
  // Apply authentication middleware
  io.use(socketAuth);

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user._id}`);

    // Join user's personal room
    socket.join(socket.user._id.toString());

    // Handle joining chat rooms
    socket.on("join_chat", async (chatRoomId) => {
      try {
        await socket.join(chatRoomId);
        socket.emit("join_chat_success", chatRoomId);
        console.log(`User ${socket.user._id} joined chat ${chatRoomId}`);
      } catch (error) {
        console.error(`Error joining chat: ${error}`);
        socket.emit("join_chat_error", error.message);
      }
    });

    // Handle sending messages with acknowledgment
    socket.on("send_message", async (messageData, callback) => {
      try {
        const { recipient, groupChat, content } = messageData;
        const roomId = groupChat || recipient;

        const message = await Message.create({
          sender: socket.user._id,
          recipient,
          groupChat,
          content,
          readBy: [{ user: socket.user._id }],
        });

        // Populate sender and recipient details
        await message.populate([
          { path: "sender", select: "name email" },
          { path: "recipient", select: "name email" },
        ]);

        // Update last message for chat
        if (groupChat) {
          await GroupChat.findByIdAndUpdate(groupChat, {
            lastMessage: message._id,
          });
        }

        // Emit to the room
        io.in(roomId).emit("new_message", message);

        // Emit chat update for list refresh
        io.emit("chat_updated", {
          chatId: roomId,
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
          },
        });

        // Send acknowledgment back to sender
        if (typeof callback === "function") {
          callback({ success: true, messageId: message._id });
        }
      } catch (error) {
        console.error("Message error:", error);
        if (typeof callback === "function") {
          callback({ success: false, error: error.message });
        }
      }
    });

    // Handle user status
    socket.on("set_status", async (status) => {
      await User.findByIdAndUpdate(socket.user._id, { status });
      socket.broadcast.emit("user_status_changed", {
        userId: socket.user._id,
        status,
      });
    });

    // Handle typing status
    socket.on("typing", ({ recipient, groupChat }) => {
      socket.to(recipient || groupChat).emit("user_typing", {
        userId: socket.user._id,
        userName: socket.user.name,
      });
    });

    // Handle stop typing
    socket.on("stop_typing", ({ recipient, groupChat }) => {
      socket.to(recipient || groupChat).emit("user_stop_typing", {
        userId: socket.user._id,
      });
    });

    // Join group chat room
    socket.on("join_group", (groupId) => {
      socket.join(groupId);
    });

    // Leave group chat room
    socket.on("leave_group", (groupId) => {
      socket.leave(groupId);
    });

    // Periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      socket.emit("ping");
    }, 25000);

    // Handle disconnection
    socket.on("disconnect", async () => {
      clearInterval(pingInterval);
      console.log(`User disconnected: ${socket.user._id}`);
      // await User.findByIdAndUpdate(socket.user._id, { status: "offline" });
      // socket.broadcast.emit("user_status_changed", {
      //   userId: socket.user._id,
      //   status: "offline",
      // });
    });
  });
};

module.exports = setupSocketIO;
