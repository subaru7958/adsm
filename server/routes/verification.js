import express from 'express';
import * as verificationController from '../controllers/verificationController.js';

const router = express.Router();

// Send verification code
router.post('/send', verificationController.sendVerificationCode);

// Verify code
router.post('/verify', verificationController.verifyCode);

// Resend code
router.post('/resend', verificationController.resendCode);

export default router;
