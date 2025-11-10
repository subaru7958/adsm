import express from "express";
import { register, login, coachLogin, playerLogin } from "../controllers/authController.js";
import { upload } from "../middlewares/upload.js";
import ResetCode from "../models/resetCode.js";
import User from "../models/user.js";
import Player from "../models/player.js";
import Coach from "../models/coach.js";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";

const router = express.Router();

router.post("/register", upload.single("teamLogo"), register);
router.post("/login", login);
router.post("/coach-login", coachLogin);
router.post("/player-login", playerLogin);

// Forgot Password - Send Code
router.post("/forgot-password", async (req, res, next) => {
  try {
    const { email, userType } = req.body;

    if (!email || !userType) {
      return res.status(400).json({ success: false, message: "Email and user type are required" });
    }

    // Check if user exists
    let user;
    if (userType === "admin") {
      user = await User.findOne({ email });
    } else if (userType === "player") {
      user = await Player.findOne({ email });
    } else if (userType === "coach") {
      user = await Coach.findOne({ email });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Save code to database
    await ResetCode.create({
      email,
      code,
      userType,
    });

    // Send email
    console.log("Email config:", {
      user: process.env.SMTP_MAIL,
      hasPassword: !!process.env.SMTP_PASSWORD,
      passwordLength: process.env.SMTP_PASSWORD?.length,
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.SMTP_MAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `${process.env.FROM_NAME || "Team Manager"} <${process.env.FROM_EMAIL || process.env.SMTP_MAIL}>`,
      to: email,
      subject: "Password Reset Code",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #3b82f6;">Password Reset Request</h2>
          <p>Your verification code is:</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
            ${code}
          </div>
          <p>This code will expire in 15 minutes.</p>
          <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    console.log("Email sent successfully to:", email);

    res.status(200).json({
      success: true,
      message: "Verification code sent to your email",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({
      success: false,
      message: "Failed to send reset code. Please try again.",
      error: err.message,
    });
  }
});

// Verify Reset Code
router.post("/verify-reset-code", async (req, res, next) => {
  try {
    const { email, code, userType } = req.body;

    if (!email || !code || !userType) {
      return res.status(400).json({ success: false, message: "Email, code, and user type are required" });
    }

    const resetCode = await ResetCode.findOne({
      email,
      code,
      userType,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetCode) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    res.status(200).json({
      success: true,
      message: "Code verified successfully",
    });
  } catch (err) {
    next(err);
  }
});

// Reset Password
router.post("/reset-password", async (req, res, next) => {
  try {
    const { email, code, newPassword, userType } = req.body;

    if (!email || !code || !newPassword || !userType) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const resetCode = await ResetCode.findOne({
      email,
      code,
      userType,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetCode) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password based on user type
    if (userType === "admin") {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      user.password = newPassword; // Will be hashed by pre-save hook
      await user.save();
    } else if (userType === "player") {
      await Player.findOneAndUpdate({ email }, { password: hashedPassword });
    } else if (userType === "coach") {
      await Coach.findOneAndUpdate({ email }, { password: hashedPassword });
    }

    // Mark code as used
    resetCode.used = true;
    await resetCode.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
