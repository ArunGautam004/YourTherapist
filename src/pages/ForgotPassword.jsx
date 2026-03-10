import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, ArrowRight, ArrowLeft, Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authAPI } from '../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: OTP, 3: new password, 4: success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!email) return toast.error('Please enter your email');
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      toast.success('Reset code sent to your email!');
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleOTPChange = (index, value) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`fp-otp-${index + 1}`)?.focus();
    }
  };

  const handleOTPKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`fp-otp-${index - 1}`)?.focus();
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) return toast.error('Please enter the 6-digit code');
    if (!newPassword) return toast.error('Please enter a new password');
    if (newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp: otpString, newPassword });
      toast.success('Password reset successful!');
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-primary via-primary-dark to-secondary items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 border-2 border-white rounded-full" />
          <div className="absolute bottom-20 right-10 w-60 h-60 border-2 border-white rounded-full" />
        </div>
        <div className="relative z-10 text-center text-white">
          <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <KeyRound className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-display text-3xl font-bold mb-4">Reset Your Password</h2>
          <p className="text-white/80 max-w-sm mx-auto">
            We'll send a verification code to your email to help you regain access to your account.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-text-primary">
              Your<span className="text-primary">Therapist</span>
            </span>
          </Link>

          {/* Step 1: Email */}
          {step === 1 && (
            <div>
              <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Forgot Password?</h1>
              <p className="text-text-secondary mb-8">Enter your email and we'll send you a reset code.</p>
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="input-field !pl-12"
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 !py-3.5 disabled:opacity-60">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Send Reset Code</span><ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>
              <p className="text-center mt-6 text-sm text-text-secondary">
                Remember your password?{' '}
                <Link to="/login" className="text-primary font-semibold hover:underline">Sign In</Link>
              </p>
            </div>
          )}

          {/* Step 2: OTP + New Password */}
          {(step === 2 || step === 3) && (
            <div>
              <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-text-secondary mb-6 hover:text-primary">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Reset Password</h1>
              <p className="text-text-secondary mb-6">Enter the code sent to <strong className="text-primary">{email}</strong></p>
              <form onSubmit={handleVerifyAndReset} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-2">Verification Code</label>
                  <div className="flex gap-2 justify-center">
                    {otp.map((digit, i) => (
                      <input
                        key={i}
                        id={`fp-otp-${i}`}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOTPChange(i, e.target.value)}
                        onKeyDown={(e) => handleOTPKeyDown(i, e)}
                        className="w-12 h-14 text-center text-xl font-bold rounded-2xl border-2 border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="input-field !pl-12"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Confirm New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="input-field !pl-12"
                      required
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 !py-3.5 disabled:opacity-60">
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Reset Password</span><ArrowRight className="w-5 h-5" /></>}
                </button>
              </form>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-success" />
              </div>
              <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Password Reset!</h1>
              <p className="text-text-secondary mb-8">Your password has been changed successfully. You can now sign in with your new password.</p>
              <Link to="/login" className="btn-primary inline-flex items-center gap-2 px-8 py-3">
                Sign In <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ForgotPassword;
