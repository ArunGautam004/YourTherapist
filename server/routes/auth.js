import express from 'express';
import { register, login, getMe, updateProfile, logout, googleLogin, verifyOTP, resendOTP, forgotPassword, resetPassword } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);
router.post('/google', googleLogin);
router.post('/logout', logout);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);

export default router;
