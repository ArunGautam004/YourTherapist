import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
    Save, Loader2, Camera,
    Shield, Key, Briefcase, Clock, Upload, ClipboardList, User,
    Eye, EyeOff, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { authAPI, messageAPI, uploadAPI } from '../../services/api';

const AdminSettings = () => {
    const { user, updateUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const fileInputRef = useRef(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [totalUnread, setTotalUnread] = useState(0);

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '', newPassword: '', confirmPassword: '',
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    const dynamicLinks = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Patients', path: '/admin/patients', icon: Users },
        { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'Questionnaires', path: '/admin/questionnaires', icon: ClipboardList },
        { name: 'Messages', path: '/admin/messages', icon: MessageCircle, badge: totalUnread > 0 ? totalUnread.toString() : null },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
    ];

    const [form, setForm] = useState({
        name: '',
        phone: '',
        gender: '',
        profilePic: '',
        specialization: '',
        license: '',
        experience: 0,
        bio: '',
        consultationFee: 1500,
    });

    useEffect(() => {
        if (user) {
            setForm({
                name: user.name || '',
                phone: user.phone || '',
                gender: user.gender || '',
                profilePic: user.profilePic || '',
                specialization: user.specialization || '',
                license: user.license || '',
                experience: user.experience || 0,
                bio: user.bio || '',
                consultationFee: user.consultationFee ?? 1500,
            });
        }
        messageAPI.getConversations().then(({ data }) => {
            const unread = (data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            setTotalUnread(unread);
        }).catch(() => { });
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await authAPI.updateProfile(form);
            updateUser(data.user);
            toast.success('Settings updated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update settings');
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
            // Auto-save to DB so the picture persists immediately
            try {
                const { data: profileData } = await authAPI.updateProfile({ profilePic: data.url });
                updateUser(profileData.user);
            } catch {}
            toast.success('Image uploaded & saved!');
        } catch (err) {
            toast.error('Failed to upload image. Try pasting a URL instead.');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleChangePassword = async () => {
        const { currentPassword, newPassword, confirmPassword } = passwordForm;
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill in all fields'); return;
        }
        if (newPassword.length < 6) {
            toast.error('New password must be at least 6 characters'); return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match'); return;
        }
        setChangingPassword(true);
        try {
            const { data } = await authAPI.changePassword({ currentPassword, newPassword });
            toast.success(data.message || 'Password changed successfully!');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to change password');
        } finally {
            setChangingPassword(false);
        }
    };

    const tabs = [
        { id: 'profile',  label: 'Profile',  icon: User },
        { id: 'practice', label: 'Practice', icon: Briefcase },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={dynamicLinks} userRole="admin" />

            <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
                        <span className="gradient-text">Settings</span>
                    </h1>
                    <p className="text-text-secondary mb-8">Manage your profile and practice settings</p>

                    <div className="flex gap-2 mb-8 flex-wrap">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-glow'
                                    : 'bg-gray-50 text-text-secondary hover:bg-gray-100'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'profile' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="card">
                                <h3 className="font-display font-bold text-lg text-text-primary mb-5">Profile Photo</h3>
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center overflow-hidden border-2 border-primary/20 flex-shrink-0">
                                        {uploadingImage ? (
                                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                                        ) : form.profilePic ? (
                                            <img src={form.profilePic} alt="Profile" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                        ) : (
                                            <Camera className="w-8 h-8 text-primary/50" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={form.profilePic}
                                                onChange={(e) => setForm({ ...form, profilePic: e.target.value })}
                                                placeholder="Paste profile picture URL..."
                                                className="input-field text-sm bg-gray-50/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingImage}
                                                className="btn-outline !py-2 !px-3 flex items-center gap-2 flex-shrink-0"
                                            >
                                                <Upload className="w-4 h-4" /> Upload
                                            </button>
                                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                                        </div>
                                        <p className="text-xs text-text-secondary">Enter a URL or upload a file (max 5MB)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="card">
                                <h3 className="font-display font-bold text-lg text-text-primary mb-5">Personal Information</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Full Name</label>
                                        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Phone Number</label>
                                        <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Gender</label>
                                        <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className="input-field">
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={handleSave} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'practice' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="card">
                                <h3 className="font-display font-bold text-lg text-text-primary mb-5">Practice Details</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Specialization</label>
                                        <input type="text" value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="e.g. Clinical Psychologist" className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">License Number</label>
                                        <input type="text" value={form.license} onChange={(e) => setForm({ ...form, license: e.target.value })} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Years of Experience</label>
                                        <input type="number" value={form.experience} onChange={(e) => setForm({ ...form, experience: Number(e.target.value) })} min="0" className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Consultation Fee (₹)</label>
                                        <input type="number" value={form.consultationFee} onChange={(e) => setForm({ ...form, consultationFee: Number(e.target.value) })} min="0" className="input-field" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Bio</label>
                                        <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell patients about yourself..." rows={4} className="input-field resize-none" />
                                    </div>
                                </div>
                                <button onClick={handleSave} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>

                            <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-light/50 border border-primary/20">
                                <Clock className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-semibold text-text-primary">Availability & Working Hours</p>
                                    <p className="text-xs text-text-secondary mt-0.5">Manage your available days and time slots from the Calendar page.</p>
                                    <a href="/admin/calendar" className="text-xs text-primary font-medium mt-1 inline-block hover:underline">
                                        Go to Calendar →
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'security' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card">
                            <h3 className="font-display font-bold text-lg text-text-primary mb-6 flex items-center gap-2">
                                <Lock className="w-5 h-5 text-primary" /> Change Password
                            </h3>
                            <div className="space-y-4 max-w-md">
                                <div>
                                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">Current Password</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPwd ? 'text' : 'password'}
                                            value={passwordForm.currentPassword}
                                            onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                            placeholder="Enter current password"
                                            className="input-field !pr-10"
                                        />
                                        <button type="button" onClick={() => setShowCurrentPwd(!showCurrentPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors">
                                            {showCurrentPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPwd ? 'text' : 'password'}
                                            value={passwordForm.newPassword}
                                            onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                            placeholder="Enter new password (min 6 characters)"
                                            className="input-field !pr-10"
                                        />
                                        <button type="button" onClick={() => setShowNewPwd(!showNewPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors">
                                            {showNewPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-text-secondary mb-1.5 block">Confirm New Password</label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPwd ? 'text' : 'password'}
                                            value={passwordForm.confirmPassword}
                                            onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                            placeholder="Confirm new password"
                                            className="input-field !pr-10"
                                        />
                                        <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors">
                                            {showConfirmPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                {passwordForm.newPassword && passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword && (
                                    <p className="text-xs text-danger flex items-center gap-1">⚠️ Passwords do not match</p>
                                )}

                                <button
                                    onClick={handleChangePassword}
                                    disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                                    className="btn-primary mt-2 flex items-center gap-2"
                                >
                                    {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Key className="w-4 h-4" />}
                                    {changingPassword ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default AdminSettings;