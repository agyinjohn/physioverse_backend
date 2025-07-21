require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const socketIO = require("socket.io");
const setupSocketIO = require("./socket");
const routes = require("./routes");
const roleRoutes = require("./routes/roleRoutes");
// const errorHandler = require("./middleware/errorHandler");

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000, // How long to wait for ping response
  pingInterval: 25000, // How often to ping
  connectTimeout: 45000, // How long to wait for connection
  upgradeTimeout: 30000, // How long to wait for upgrade
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add io to req object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Setup Socket.IO
setupSocketIO(io);

// API Routes
app.use("/api", routes);
// app.use("/api/roles", roleRoutes);
// Error Handler
// app.use(errorHandler);

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
