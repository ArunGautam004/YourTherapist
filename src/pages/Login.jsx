import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Mail, Lock, Eye, EyeOff, ArrowRight, Chrome, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login, loadUser, user } = useAuth();
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
      // Fetch user details from Google
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      }).then(res => res.json());
      
      // Send to our backend
      const { data } = await api.post('/auth/google', {
        email: userInfo.email,
        name: userInfo.name,
        picture: userInfo.picture,
        sub: userInfo.sub,
      });
      
      // Update Auth context and redirect
      localStorage.setItem('token', data.token);
      await loadUser();
      toast.success(`Welcome back, ${data.user.name}!`);
      navigate(data.user.role === 'doctor' ? '/admin/dashboard' : '/patient/dashboard');
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
    setLoading(true);
    try {
      const user = await login(formData.email, formData.password);
      toast.success(`Welcome back, ${user.name}!`);
      const dest = hasCompletedMandatoryProfile(user)
        ? (user.role === 'doctor' ? '/admin/dashboard' : '/patient/dashboard')
        : '/complete-profile';
      navigate(dest);
    } catch (error) {
      // Check if user needs to verify email first
      if (error.response?.data?.requiresVerification) {
        toast.error('Please verify your email first.');
        navigate('/verify-otp', { state: { email: error.response.data.email } });
      } else {
        toast.error(error.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Decorative Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary-dark to-secondary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-64 h-64 border-2 border-white rounded-full" />
          <div className="absolute bottom-20 right-20 w-80 h-80 border-2 border-white rounded-full" />
          <div className="absolute top-1/3 right-1/4 w-40 h-40 border-2 border-white rounded-full" />
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
              Welcome Back
            </h2>
            <p className="text-white/70 leading-relaxed">
              Continue your journey towards better mental health. Your therapist is ready to support you.
            </p>
          </motion.div>

          {/* Floating Testimonial */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-12 bg-white/10 backdrop-blur-sm border border-white/20 rounded-3xl p-6 text-left"
          >
            <p className="text-white/90 text-sm leading-relaxed italic">
              "This platform made me comfortable with therapy for the first time. The video sessions are seamless and private."
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                🧑‍🦱
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Priya M.</p>
                <p className="text-white/60 text-xs">Patient</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right — Login Form */}
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

          <h1 className="font-display text-3xl font-bold text-text-primary">Sign In</h1>
          <p className="mt-2 text-text-secondary">Welcome back! Please enter your details.</p>

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
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50" />
                <input
                  type="email"
                  placeholder="Enter your email"
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
                  placeholder="Enter your password"
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded-md border-gray-300 text-primary focus:ring-primary" />
                <span className="text-sm text-text-secondary">Remember me</span>
              </label>
              <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-primary-dark transition-colors">
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 !py-3.5 disabled:opacity-60">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-5 h-5" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-text-secondary">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-primary hover:text-primary-dark transition-colors">
              Sign up for free
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
