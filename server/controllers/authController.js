import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import Coach from "../models/coach.js";
import Player from "../models/player.js";
import VerificationCode from "../models/verificationCode.js";
import { sendVerificationEmail } from "../services/emailService.js";

const signToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || "7d",
  });
};

export const playerLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }
    const player = await Player.findOne({ email });
    if (!player) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const ok = password === player.name;
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const token = jwt.sign(
      { role: "player", playerId: player._id, adminId: player.admin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );
    res.status(200).json({
      success: true,
      message: "Player login successful",
      token,
      player: { id: player._id, name: player.name, email: player.email, admin: player.admin, photo: player.photo },
    });
  } catch (err) {
    next(err);
  }
};

export const coachLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }
    const coach = await Coach.findOne({ email });
    if (!coach) return res.status(401).json({ success: false, message: "Invalid credentials" });
    // As specified: check password against coach name
    const ok = password === coach.name;
    if (!ok) return res.status(401).json({ success: false, message: "Invalid credentials" });
    const token = jwt.sign(
      { role: "coach", coachId: coach._id, adminId: coach.admin },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );
    res.status(200).json({
      success: true,
      message: "Coach login successful",
      token,
      coach: { id: coach._id, name: coach.name, email: coach.email, admin: coach.admin },
    });
  } catch (err) {
    next(err);
  }
};

export const register = async (req, res, next) => {
  try {
    const { teamName, email, password } = req.body;

    if (!teamName || !email || !password) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    const teamLogo = req.file ? `/uploads/${req.file.filename}` : "";

    // Create user with isVerified: false
    const user = await User.create({ 
      teamName, 
      name: teamName, // Use teamName as admin name for now
      email, 
      password, 
      teamLogo,
      isVerified: false 
    });

    // Generate verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Delete any existing codes for this email
    await VerificationCode.deleteMany({ email: email.toLowerCase() });

    // Save verification code
    await VerificationCode.create({
      email: email.toLowerCase(),
      code,
      expiresAt
    });

    // Send verification email (non-blocking)
    let emailSent = false;
    try {
      await sendVerificationEmail(email, code, teamName, teamName);
      console.log(`✅ Verification code sent to ${email}: ${code}`);
      emailSent = true;
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      console.log(`⚠️ Verification code for ${email}: ${code} (email failed to send)`);
      // Don't fail registration if email fails
    }

    res.status(201).json({
      success: true,
      message: emailSent 
        ? "Registration successful. Please check your email for verification code."
        : `Registration successful. Verification code: ${code} (Email service unavailable)`,
      user: { id: user._id, teamName: user.teamName, email: user.email, teamLogo: user.teamLogo },
      verificationCode: emailSent ? undefined : code, // Include code in response if email failed
    });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({ 
        success: false, 
        message: "Please verify your email address first",
        needsVerification: true,
        email: user.email
      });
    }

    const token = signToken(user._id);

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, teamName: user.teamName, email: user.email, teamLogo: user.teamLogo },
    });
  } catch (err) {
    next(err);
  }
};
