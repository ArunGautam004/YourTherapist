import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Camera, Phone, Loader2, Brain, CheckCircle2, Upload, VenusAndMars } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { authAPI, uploadAPI } from '../services/api';

const CompleteProfile = () => {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        phone: user?.phone || '',
        gender: user?.gender || '',
        profilePic: user?.profilePic || '',
    });
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);

    const isValid =
        form.phone.trim().length >= 10 &&
        form.profilePic.trim().length > 5 &&
        ['Male', 'Female', 'Other'].includes(form.gender);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isValid) {
            toast.error('Please provide profile picture, valid phone number, and gender');
            return;
        }
        setSaving(true);
        try {
            const { data } = await authAPI.updateProfile({
                phone: form.phone.trim(),
                gender: form.gender,
                profilePic: form.profilePic.trim(),
            });
            updateUser(data.user);
            toast.success('Profile completed! 🎉');
            const dest = data.user.role === 'doctor' || data.user.role === 'admin' ? '/admin/dashboard' : '/patient/dashboard';
            navigate(dest);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Image must be less than 5MB');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        setUploadingImage(true);
        try {
            const { data } = await uploadAPI.uploadImage(formData);
            setForm(prev => ({ ...prev, profilePic: data.url }));
            toast.success('Image uploaded successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to upload image. Try pasting a URL instead.');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-primary-light/30 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md w-full"
            >
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-glow">
                        <Brain className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-display font-bold text-2xl text-text-primary">
                        Your<span className="text-primary">Therapist</span>
                    </span>
                </div>

                <div className="card !p-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="font-display text-2xl font-bold text-text-primary mb-2">Complete Your Profile</h1>
                        <p className="text-text-secondary text-sm">
                            For enhanced security and a better experience, please provide your profile picture, phone number, and gender.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Profile Picture */}
                        <div>
                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Profile Picture *</label>
                            <div className="flex items-center gap-3">
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-primary/20 flex-shrink-0 relative group">
                                    {uploadingImage ? (
                                        <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                    ) : form.profilePic ? (
                                        <img src={form.profilePic} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                    ) : (
                                        <Camera className="w-6 h-6 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={form.profilePic}
                                            onChange={(e) => setForm({ ...form, profilePic: e.target.value })}
                                            placeholder="https://example.com/your-photo.jpg"
                                            className="input-field flex-1 text-sm bg-gray-50/50"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={uploadingImage}
                                            className="btn-outline !py-2 !px-3 flex items-center gap-2 flex-shrink-0"
                                            title="Upload Image"
                                        >
                                            <Upload className="w-4 h-4" /> Upload
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept="image/*"
                                            className="hidden"
                                        />
                                    </div>
                                    <p className="text-[11px] text-text-secondary">Paste a URL or upload a file (max 5MB)</p>
                                </div>
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Phone Number *</label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
                                <input
                                    type="tel"
                                    value={form.phone}
                                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                                    placeholder="+91 XXXXX XXXXX"
                                    className="input-field !pl-10"
                                    required
                                    minLength={10}
                                />
                            </div>
                        </div>

                        {/* Gender */}
                        <div>
                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Gender *</label>
                            <div className="relative">
                                <VenusAndMars className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/50" />
                                <select
                                    value={form.gender}
                                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                                    className="input-field !pl-10"
                                    required
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                            <p className="text-xs text-amber-700">
                                <strong>Why is this required?</strong> Profile picture, phone number, and gender are mandatory for identity verification and high authentication security.
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={saving || !isValid}
                            className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {saving ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</>
                            ) : (
                                <>Complete Profile</>
                            )}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default CompleteProfile;
