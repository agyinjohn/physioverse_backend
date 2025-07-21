const Role = require("../models/Role");
const User = require("../models/User");

exports.createRole = async (req, res) => {
  try {
    const { name, permissions, description } = req.body;
    console.log("Route hit");
    // Check if role already exists
    const existingRole = await Role.findOne({ name });
    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: "Role already exists",
      });
    }

    const role = await Role.create({
      name,
      permissions,
      description,
    });

    res.status(201).json({
      success: true,
      data: role,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating role",
      error: error.message,
    });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });

    // Get user count for each role
    const rolesWithCounts = await Promise.all(
      roles.map(async (role) => {
        const count = await User.countDocuments({ role: role._id });
        return {
          ...role.toObject(),
          usersCount: count,
        };
      })
    );

    res.json({
      success: true,
      data: rolesWithCounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching roles",
      error: error.message,
    });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { name, permissions } = req.body;

    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Check if new name already exists (excluding current role)
    if (name !== role.name) {
      const existingRole = await Role.findOne({ name });
      if (existingRole) {
        return res.status(400).json({
          success: false,
          message: "Role name already exists",
        });
      }
    }

    // Update role
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      { name, permissions },
      { new: true }
    );

    // Get user count for the role
    const usersCount = await User.countDocuments({ role: updatedRole._id });

    res.json({
      success: true,
      data: {
        ...updatedRole.toObject(),
        usersCount,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating role",
      error: error.message,
    });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    // Check if role exists
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({
        success: false,
        message: "Role not found",
      });
    }

    // Check if role is assigned to any users
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete role that is assigned to users",
      });
    }

    // Delete role
    await Role.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: "Role deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error deleting role",
      error: error.message,
    });
  }
};
