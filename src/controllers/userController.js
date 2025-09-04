const User = require("../models/User");
const Role = require("../models/Role");

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

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if this is the last admin user
    if (user.role.name === "Admin") {
      const adminCount = await User.countDocuments({
        role: user.role._id,
        _id: { $ne: user._id },
      });

      if (adminCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete the last admin user",
        });
      }
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { name, email, status, roleId } = req.body;
    const user = await User.findById(req.params.id).populate("role");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if changing role from admin
    if (user.role.name === "Admin" && roleId) {
      const newRole = await Role.findById(roleId);
      if (newRole.name !== "Admin") {
        const adminCount = await User.countDocuments({
          role: user.role._id,
          _id: { $ne: user._id },
        });

        if (adminCount === 0) {
          return res.status(400).json({
            success: false,
            message: "Cannot change role of the last admin user",
          });
        }
      }
    }

    // If updating admin status, check if this would remove the last admin
    if (user.role.name === "Admin" && status === "inactive") {
      const adminCount = await User.countDocuments({
        role: user.role._id,
        status: "active",
        _id: { $ne: user._id },
      });

      if (adminCount === 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot deactivate the last active admin user",
        });
      }
    }

    const updateData = {
      name,
      email,
      status,
    };

    // Only include role in update if it's provided
    if (roleId) {
      updateData.role = roleId;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    )
      .select("-password")
      .populate("role");

    res.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
