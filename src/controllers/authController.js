const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const {
  sendResetPasswordEmail,
  sendWelcomeEmail,
} = require("../utils/emailService");
const generatePassword = require("../utils/generatePassword");

const RESEND_COOLDOWN = 60; // seconds
const resendTimers = new Map();

exports.register = async (req, res) => {
  try {
    const { name, email, roleId } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User already exists",
      });
    }

    const generatedPassword = generatePassword();

    const user = await User.create({
      name,
      email,
      password: generatedPassword,
      role: roleId, // Use role ID instead of role name
    });

    await user.populate("role"); // Populate role information
    await sendWelcomeEmail(email, name, generatedPassword);

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      message: "User created successfully. Password has been sent to email.",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error registering user",
      error: error.message,
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate("role");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        requirePasswordChange: user.requirePasswordChange,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error logging in",
      error: error.message,
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check cooldown
    const lastResend = resendTimers.get(email);
    if (lastResend && Date.now() - lastResend < RESEND_COOLDOWN * 1000) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${Math.ceil(
          (RESEND_COOLDOWN * 1000 - (Date.now() - lastResend)) / 1000
        )} seconds before requesting again`,
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP and set expiry (15 minutes)
    user.passwordResetOTP = {
      code: otp,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    };
    await user.save();

    await sendResetPasswordEmail(email, user.name, otp);
    resendTimers.set(email, Date.now());

    res.json({
      success: true,
      message: "OTP sent to email",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing request",
      error: error.message,
    });
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if OTP exists and is valid
    if (!user.passwordResetOTP || !user.passwordResetOTP.code) {
      return res.status(400).json({
        success: false,
        message: "No OTP request found",
      });
    }

    // Check if OTP has expired
    if (user.passwordResetOTP.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired",
      });
    }

    // Verify OTP
    if (user.passwordResetOTP.code !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Generate reset token
    const resetToken = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    // Clear OTP after successful verification
    user.passwordResetOTP = undefined;
    await user.save();

    res.json({
      success: true,
      resetToken,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error verifying OTP",
      error: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.password = password;
    await user.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error resetting password",
      error: error.message,
    });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    // Check if the requesting user is an admin
    // if (req.user.role !== "admin") {
    //   return res.status(403).json({
    //     success: false,
    //     message: "Access denied. Admin only resource.",
    //   });
    // }

    const users = await User.find({})
      .select("-password -__v") // Exclude sensitive information
      .populate("role", "name permissions") // Populate role details
      .sort({ createdAt: -1 }); // Sort by newest first

    res.json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching users",
      error: error.message,
    });
  }
};

exports.updateInitialPassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = newPassword;
    user.requirePasswordChange = false;
    await user.save();

    res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error updating password",
      error: error.message,
    });
  }
};
