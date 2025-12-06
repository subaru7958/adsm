import VerificationCode from '../models/verificationCode.js';
import User from '../models/user.js';
import { sendVerificationEmail, sendAccountVerifiedEmail } from '../services/emailService.js';

// Generate 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification code
export const sendVerificationCode = async (req, res) => {
  try {
    const { email, teamName, adminName } = req.body;

    if (!email || !teamName || !adminName) {
      return res.status(400).json({ message: 'Email, team name, and admin name are required' });
    }

    // Check if user exists
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already verified
    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Delete any existing codes for this email
    await VerificationCode.deleteMany({ email: email.toLowerCase() });

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save code to database
    await VerificationCode.create({
      email: email.toLowerCase(),
      code,
      expiresAt
    });

    // Send email
    await sendVerificationEmail(email, code, teamName, adminName);

    console.log(`✅ Verification code sent to ${email}: ${code}`);

    res.json({ 
      message: 'Verification code sent successfully',
      email: email.toLowerCase()
    });
  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({ message: 'Failed to send verification code', error: error.message });
  }
};

// Verify code
export const verifyCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and code are required' });
    }

    // Find verification code
    const verification = await VerificationCode.findOne({
      email: email.toLowerCase(),
      verified: false
    });

    if (!verification) {
      return res.status(404).json({ message: 'Verification code not found or already used' });
    }

    // Check if expired
    if (new Date() > verification.expiresAt) {
      return res.status(400).json({ message: 'Verification code expired. Please request a new one.' });
    }

    // Check attempts
    if (verification.attempts >= 5) {
      return res.status(429).json({ message: 'Too many attempts. Please request a new code.' });
    }

    // Verify code
    if (verification.code !== code.trim()) {
      verification.attempts += 1;
      await verification.save();
      return res.status(400).json({ 
        message: 'Invalid verification code',
        attemptsLeft: 5 - verification.attempts
      });
    }

    // Mark as verified
    verification.verified = true;
    await verification.save();

    // Update user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      user.isVerified = true;
      await user.save();

      // Send confirmation email
      try {
        await sendAccountVerifiedEmail(
          email, 
          user.teamName || 'Your Team', 
          user.name || 'User'
        );
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the verification if confirmation email fails
      }

      console.log(`✅ Email verified for ${email}`);
    }

    res.json({ 
      message: 'Email verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Verify code error:', error);
    res.status(500).json({ message: 'Failed to verify code', error: error.message });
  }
};

// Resend verification code
export const resendCode = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    // Delete old codes
    await VerificationCode.deleteMany({ email: email.toLowerCase() });

    // Generate new code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await VerificationCode.create({
      email: email.toLowerCase(),
      code,
      expiresAt
    });

    // Send email
    await sendVerificationEmail(
      email, 
      code, 
      user.teamName || 'Your Team', 
      user.name || 'User'
    );

    console.log(`✅ Verification code resent to ${email}: ${code}`);

    res.json({ message: 'Verification code resent successfully' });
  } catch (error) {
    console.error('Resend code error:', error);
    res.status(500).json({ message: 'Failed to resend code', error: error.message });
  }
};
