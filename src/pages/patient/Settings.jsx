// src/pages/patient/Settings.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, Camera, Shield, Key, User, Upload, Eye, EyeOff, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import PatientSidebar from './Sidebar';
import { useAuth } from '../../context/AuthContext';
import { authAPI, messageAPI, uploadAPI } from '../../services/api';

const PatientSettings = () => {
    const { user, updateUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [totalUnread, setTotalUnread] = useState(0);
    const fileInputRef = useRef(null);

    const [form, setForm] = useState({
        name: '', phone: '', gender: '', dob: '', address: '', profilePic: '',
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '', newPassword: '', confirmPassword: '',
    });
    const [changingPassword, setChangingPassword] = useState(false);
    const [showCurrentPwd, setShowCurrentPwd] = useState(false);
    const [showNewPwd, setShowNewPwd] = useState(false);
    const [showConfirmPwd, setShowConfirmPwd] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                name:       user.name       || '',
                phone:      user.phone      || '',
                gender:     user.gender     || '',
                dob:        user.dob        ? new Date(user.dob).toISOString().split('T')[0] : '',
                address:    user.address    || '',
                profilePic: user.profilePic || '',
            });
        }
        messageAPI.getConversations()
            .then(({ data }) => {
                const u = (data.conversations || []).reduce((s, c) => s + (c.unreadCount || 0), 0);
                setTotalUnread(u);
            }).catch(() => {});
    }, [user]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data } = await authAPI.updateProfile(form);
            updateUser(data.user);
            toast.success('Profile updated successfully!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
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
        } catch {
            toast.error('Upload failed. Try pasting a URL instead.');
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
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-background">
            <PatientSidebar unreadMessages={totalUnread} />

            <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
                        <span className="gradient-text">Settings</span>
                    </h1>
                    <p className="text-text-secondary mb-8">Manage your profile and account settings</p>

                    <div className="flex gap-2 mb-8">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === tab.id
                                    ? 'bg-primary text-white shadow-glow'
                                    : 'bg-gray-50 text-text-secondary hover:bg-gray-100'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeTab === 'profile' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="card">
                                <h3 className="font-display font-bold text-lg text-text-primary mb-5 flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-primary" /> Profile Picture
                                </h3>
                                <div className="flex items-start gap-5">
                                    <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {form.profilePic
                                            ? <img src={form.profilePic} alt="Profile" className="w-full h-full object-cover" />
                                            : <span className="text-3xl">👤</span>}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={form.profilePic}
                                                onChange={e => setForm({ ...form, profilePic: e.target.value })}
                                                placeholder="Paste profile picture URL..."
                                                className="input-field text-sm bg-gray-50/50"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploadingImage}
                                                className="btn-outline !py-2 !px-3 flex items-center gap-2 flex-shrink-0"
                                            >
                                                {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                                Upload
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
                                        <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Phone Number</label>
                                        <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Gender</label>
                                        <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="input-field">
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Date of Birth</label>
                                        <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })} className="input-field" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm font-medium text-text-secondary mb-1.5 block">Address</label>
                                        <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Your address" className="input-field" />
                                    </div>
                                </div>
                                <button onClick={handleSave} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    {saving ? 'Saving...' : 'Save Changes'}
                                </button>
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

export default PatientSettings;