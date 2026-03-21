import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import { sendEmail } from '../utils/sendEmail.js';

// Auto-create welcome conversation with the platform doctor
const DOCTOR_EMAIL = 'doctor@youtherapist.com';

const createWelcomeConversation = async (patientId) => {
  try {
    const doctor = await User.findOne({ email: DOCTOR_EMAIL });
    if (!doctor) {
      console.log('⚠️  Doctor account (doctor@youtherapist.com) not found — skipping welcome message');
      return;
    }

    // Check if conversation already exists (avoid duplicates)
    const existing = await Message.findOne({
      $or: [
        { sender: doctor._id, receiver: patientId },
        { sender: patientId, receiver: doctor._id },
      ],
    });
    if (existing) return;

    await Message.create({
      sender: doctor._id,
      receiver: patientId,
      text: 'Welcome to YourTherapist! 👋 I\'m here to help you on your mental health journey. Feel free to message me anytime.',
    });
    console.log(`✅ Welcome conversation created for patient ${patientId}`);
  } catch (err) {
    console.error('⚠️  Failed to create welcome conversation:', err.message);
  }
};

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
};

// Generate a 6-digit OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send OTP email
const sendOTPEmail = async (email, name, otp) => {
  await sendEmail({
    to: email,
    subject: 'YourTherapist — Verify Your Email',
    htmlContent: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8faf9; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0d6b5e; font-size: 24px; margin: 0;">YourTherapist</h1>
          <p style="color: #666; margin: 8px 0 0;">Email Verification</p>
        </div>
        <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
          <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hello <strong>${name}</strong>,</p>
          <p style="color: #666; font-size: 14px; margin: 0 0 24px;">Use this code to verify your email address:</p>
          <div style="background: #f0fdf4; border: 2px dashed #0d6b5e; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
            <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0d6b5e;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 12px; margin: 0;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
        </div>
        <p style="text-align: center; color: #999; font-size: 11px; margin: 24px 0 0;">© ${new Date().getFullYear()} YourTherapist. All rights reserved.</p>
      </div>
    `,
  });
};

// @desc    Register user (sends OTP, does NOT log in)
// @route   POST /api/auth/register
export const register = async (req, res, next) => {
  try {
    const { name, email, password, phone, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser.isVerified) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // If unverified user exists, delete and recreate
    if (existingUser && !existingUser.isVerified) {
      await User.deleteOne({ _id: existingUser._id });
    }

    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = await User.create({
      name, email, password, phone,
      role: role === 'doctor' ? 'doctor' : 'patient',
      otp,
      otpExpiry,
      isVerified: false,
    });

    // Try to send OTP email (don't block registration if Brevo is down)
    try {
      await sendOTPEmail(email, name, otp);
      console.log(`📧 OTP sent to ${email}`);
    } catch (emailErr) {
      console.error('⚠️  Email send failed (Brevo may be under review):', emailErr.message);
      // Still proceed — user can use resend later or we log OTP for dev
      console.log(`🔑 DEV OTP for ${email}: ${otp}`);
    }

    res.status(201).json({
      message: 'Registration successful! Please check your email for the verification code.',
      email: user.email,
      requiresVerification: true,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify OTP
// @route   POST /api/auth/verify-otp
export const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email }).select('+otp +otpExpiry');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    // Mark as verified and clear OTP
    user.isVerified = true;
    user.profileCompleted = false;
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.lastLogin = new Date();
    await user.save();

    // Auto-create welcome conversation for patients
    if (user.role === 'patient') {
      createWelcomeConversation(user._id);
    }

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token, user, message: 'Email verified successfully!' });
  } catch (error) {
    next(error);
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
export const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'Email already verified' });
    }

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendOTPEmail(email, user.name, otp);
      console.log(`📧 OTP resent to ${email}`);
    } catch (emailErr) {
      console.error('⚠️  Email resend failed:', emailErr.message);
      console.log(`🔑 DEV OTP for ${email}: ${otp}`);
    }

    res.json({ message: 'A new verification code has been sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check if verified (skip for doctors/admins)
    if (!user.isVerified && user.role === 'patient') {
      return res.status(403).json({
        message: 'Please verify your email first.',
        requiresVerification: true,
        email: user.email,
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
export const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'gender', 'dob', 'address', 'emergencyContact', 'profilePic', 'bio', 'specialization', 'experience', 'consultationFee', 'chatFee', 'availableSlots'];
    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // Auto-mark profile as completed when phone, profilePic, and gender are set
    const currentUser = await User.findById(req.user._id);
    const finalPhone = updates.phone || currentUser.phone;
    const finalPic = updates.profilePic || currentUser.profilePic;
    const finalGender = updates.gender || currentUser.gender;
    if (finalPhone && finalPic && finalGender) {
      updates.profileCompleted = true;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
export const logout = async (req, res) => {
  res.cookie('token', '', { httpOnly: true, expires: new Date(0) });
  res.json({ message: 'Logged out' });
};

// @desc    Google Login
// @route   POST /api/auth/google
export const googleLogin = async (req, res, next) => {
  try {
    const { email, name, picture, sub } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Google data missing email' });
    }

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);

      user = await User.create({
        name,
        email,
        password: randomPassword,
        profilePic: picture,
        role: 'patient',
        isVerified: true, // Google users are pre-verified
      });

      // Auto-create welcome conversation for new Google patients
      createWelcomeConversation(user._id);
    } else {
      user.lastLogin = new Date();
      if (!user.profilePic && picture) user.profilePic = picture;
      if (!user.isVerified) user.isVerified = true; // Auto-verify on Google login
      await user.save();
    }

    const token = generateToken(user._id);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({ token, user });
  } catch (error) {
    next(error);
  }
};

// @desc    Forgot password — send OTP to email
// @route   POST /api/auth/forgot-password
export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Please provide your email' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendEmail({
        to: email,
        subject: 'YourTherapist — Reset Your Password',
        htmlContent: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8faf9; border-radius: 16px;">
            <div style="text-align: center; margin-bottom: 24px;">
              <h1 style="color: #0d6b5e; font-size: 24px; margin: 0;">YourTherapist</h1>
              <p style="color: #666; margin: 8px 0 0;">Password Reset</p>
            </div>
            <div style="background: white; border-radius: 12px; padding: 32px; text-align: center;">
              <p style="color: #333; font-size: 16px; margin: 0 0 8px;">Hello <strong>${user.name}</strong>,</p>
              <p style="color: #666; font-size: 14px; margin: 0 0 24px;">Use this code to reset your password:</p>
              <div style="background: #fef2f2; border: 2px dashed #dc2626; border-radius: 12px; padding: 20px; margin: 0 0 24px;">
                <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #dc2626;">${otp}</span>
              </div>
              <p style="color: #999; font-size: 12px; margin: 0;">This code expires in <strong>10 minutes</strong>.</p>
            </div>
          </div>
        `,
      });
      console.log(`📧 Password reset OTP sent to ${email}`);
    } catch (emailErr) {
      console.error('⚠️ Password reset email failed:', emailErr.message);
      console.log(`🔑 DEV OTP for ${email}: ${otp}`);
    }

    res.json({ message: 'Password reset code sent to your email', email });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, OTP, and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email }).select('+otp +otpExpiry +password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpiry = undefined;
    await user.save();

    res.json({ message: 'Password reset successful! You can now log in with your new password.' });
  } catch (error) {
    next(error);
  }
};

// @desc    Change password (authenticated)
// @route   PUT /api/auth/change-password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully!' });
  } catch (error) {
    next(error);
  }
};
