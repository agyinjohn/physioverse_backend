const User = require("../models/User");

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select("-password -__v")
      .populate("role", "name permissions")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get therapists only
exports.getTherapists = async (req, res) => {
  try {
    const therapists = await User.find({ status: "active" })
      .populate({
        path: "role",
        match: { name: "Physiotherapist" },
      })
      .select("name email")
      .sort({ name: 1 });

    // Filter out users whose role didn't match (will be null after populate)
    const filteredTherapists = therapists.filter((user) => user.role !== null);

    res.json({
      success: true,
      data: filteredTherapists,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
