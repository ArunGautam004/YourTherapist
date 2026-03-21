import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, User, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '', agreeTerms: false,
  });
  const { register, loadUser, user } = useAuth();
  const navigate = useNavigate();

  const hasCompletedMandatoryProfile = (u) => {
    if (!u) return false;
    const hasPhone = typeof u.phone === 'string' && u.phone.trim().length >= 10;
    const hasProfilePic = typeof u.profilePic === 'string' && u.profilePic.trim().length > 5;
    const hasGender = ['Male', 'Female', 'Other'].includes(u.gender);
    return hasPhone && hasProfilePic && hasGender;
  };

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const dest = hasCompletedMandatoryProfile(user)
        ? (user.role === 'patient' ? '/patient/dashboard' : '/admin/dashboard')
        : '/complete-profile';
      navigate(dest, { replace: true });
    }
  }, [user, navigate]);

  const handleGoogleSuccess = async (tokenResponse) => {
    setGoogleLoading(true);
    try {
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      }).then(res => res.json());
      
      const { data } = await api.post('/auth/google', {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        sub: userInfo.sub,
      });
      
      localStorage.setItem('token', data.token);
      await loadUser();
      toast.success(`Welcome to YourTherapist, ${data.user.name}!`);
      navigate('/patient/dashboard'); // Google signups default to patient
    } catch (error) {
      console.error('Google Auth Error:', error);
      toast.error(`Google Sign-In failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
    } finally {
      setGoogleLoading(false);
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    onError: (err) => {
      console.error('Google Popup Error:', err);
      toast.error(`Google Login Popup Failed: ${err?.error || 'Unknown error'}`);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (data.requiresVerification) {
        toast.success('Registration successful! Check your email for the verification code.');
        navigate('/verify-otp', { state: { email: formData.email } });
      } else {
        // Fallback for non-OTP flow
        toast.success(`Welcome, ${data.user?.name}!`);
        navigate('/patient/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Decorative Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-secondary via-secondary-dark to-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-64 h-64 border-2 border-white rounded-full" />
          <div className="absolute bottom-32 left-20 w-80 h-80 border-2 border-white rounded-full" />
          <div className="absolute bottom-10 right-1/3 w-40 h-40 border-2 border-white rounded-full" />
        </div>
        <div className="relative z-10 text-center max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-20 h-20 rounded-3xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-8">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-display text-3xl font-bold text-white mb-4">
              Begin Your Journey
            </h2>
            <p className="text-white/70 leading-relaxed">
              Join thousands who have taken the first step towards better mental health. Your privacy and comfort are our priority.
            </p>
          </motion.div>

          {/* Feature List */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 space-y-4 text-left"
          >
            {[
              { icon: '🔒', text: 'End-to-end encrypted sessions' },
              { icon: '📊', text: 'Track your progress over time' },
              { icon: '🎥', text: 'HD video calls with your therapist' },
              { icon: '📝', text: 'Personalized treatment plans' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
                <span className="text-2xl">{item.icon}</span>
                <span className="text-white/90 text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Right — Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-background">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-text-primary">
              Your<span className="text-primary">Therapist</span>
            </span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-text-primary">Create Account</h1>
          <p className="mt-2 text-text-secondary">Start your mental wellness journey today.</p>

          {/* Google Auth Button */}
          <button 
            type="button"
            onClick={() => googleLogin()}
            disabled={googleLoading || loading}
            className="mt-8 w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 transition-all duration-200 font-medium text-text-primary shadow-soft hover:shadow-soft-lg disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {googleLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Chrome className="w-5 h-5" />}
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-sm text-text-secondary">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50" />
                <input
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field !pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50" />
                <input
                  type="email"
                  placeholder="Your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="input-field !pl-12"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field !pl-12 !pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary/50 hover:text-text-secondary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50" />
                <input
                  type="password"
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="input-field !pl-12"
                  required
                />
              </div>
            </div>

            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.agreeTerms}
                onChange={(e) => setFormData({ ...formData, agreeTerms: e.target.checked })}
                className="w-4 h-4 rounded-md border-gray-300 text-primary focus:ring-primary mt-0.5"
                required
              />
              <span className="text-sm text-text-secondary">
                I agree to the{' '}
                <a href="/terms" className="text-primary font-medium hover:underline">Terms of Service</a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary font-medium hover:underline">Privacy Policy</a>
              </span>
            </label>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 !py-3.5 disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Create Account</span><ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:text-primary-dark transition-colors">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Register;
