import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
    Clock, Save, Loader2, Camera, Mail, Shield, Key, User, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { authAPI, messageAPI, uploadAPI } from '../../services/api';

const PatientSettings = () => {
    const { user, updateUser } = useAuth();
    const [saving, setSaving] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [activeTab, setActiveTab] = useState('profile');
    const [totalUnread, setTotalUnread] = useState(0);
    const fileInputRef = useRef(null);

    // Consistent sidebar — live unread badge
    const patientLinks = [
        { name: 'Dashboard',        path: '/patient/dashboard', icon: LayoutDashboard },
        { name: 'My Sessions',      path: '/patient/sessions',  icon: Clock },
        { name: 'Book Appointment', path: '/patient/book',      icon: Calendar },
        { name: 'Mood Journal',     path: '/patient/journal',   icon: BookOpen },
        { name: 'Messages',         path: '/patient/messages',  icon: MessageCircle, badge: totalUnread > 0 ? String(totalUnread) : null },
        { name: 'Settings',         path: '/patient/settings',  icon: Settings },
    ];

    const [form, setForm] = useState({
        name: '',
        phone: '',
        gender: '',
        dob: '',
        address: '',
        profilePic: '',
    });

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
            toast.success('Image uploaded!');
        } catch {
            toast.error('Upload failed. Try pasting a URL instead.');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const tabs = [
        { id: 'profile',  label: 'Profile',  icon: User },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={patientLinks} userRole="patient" />

            <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
                        <span className="gradient-text">Settings</span>
                    </h1>
                    <p className="text-text-secondary mb-8">Manage your profile and account settings</p>

                    {/* Tabs */}
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

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            {/* Profile Picture */}
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

                            {/* Personal Info */}
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

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card">
                            <h3 className="font-display font-bold text-lg text-text-primary mb-5 flex items-center gap-2">
                                <Key className="w-5 h-5 text-primary" /> Change Password
                            </h3>
                            <p className="text-sm text-text-secondary mb-6">
                                To change your password, use the "Forgot Password" flow to receive an OTP on your email.
                            </p>
                            <div className="bg-primary-light/50 border border-primary/20 rounded-2xl p-4 flex items-start gap-3">
                                <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="text-sm font-medium text-text-primary">Your registered email</p>
                                    <p className="text-sm text-text-secondary">{user?.email}</p>
                                </div>
                            </div>
                            <a href="/forgot-password" className="btn-outline mt-4 inline-flex items-center gap-2">
                                <Key className="w-4 h-4" /> Reset Password via Email
                            </a>
                        </motion.div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default PatientSettings;