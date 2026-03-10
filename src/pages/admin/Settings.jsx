import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
    LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
    Save, Loader2, Camera, Phone, User, Mail, MapPin,
    Shield, Key, Briefcase, Clock, DollarSign, Plus, Trash2, Upload, ClipboardList
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
        availableSlots: [],
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
                consultationFee: user.consultationFee || 1500,
                availableSlots: user.availableSlots || [],
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
            toast.success('Image uploaded successfully');
        } catch (err) {
            console.error(err);
            toast.error('Failed to upload image. Try pasting a URL instead.');
        } finally {
            setUploadingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const addSlot = () => {
        setForm({
            ...form,
            availableSlots: [...form.availableSlots, { day: 'Monday', startTime: '09:00', endTime: '17:00' }],
        });
    };

    const removeSlot = (index) => {
        setForm({
            ...form,
            availableSlots: form.availableSlots.filter((_, i) => i !== index),
        });
    };

    const updateSlot = (index, field, value) => {
        const slots = [...form.availableSlots];
        slots[index] = { ...slots[index], [field]: value };
        setForm({ ...form, availableSlots: slots });
    };

    const tabs = [
        { id: 'profile', label: 'Profile', icon: User },
        { id: 'practice', label: 'Practice', icon: Briefcase },
        { id: 'availability', label: 'Availability', icon: Clock },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={dynamicLinks} userRole="admin" />

            <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
                        <span className="gradient-text">Settings</span>
                    </h1>
                    <p className="text-text-secondary mb-8">Manage your profile and practice settings</p>

                    {/* Tabs */}
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

                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                            <div className="card">
                                <h3 className="font-display font-bold text-lg text-text-primary mb-5">Profile Photo</h3>
                                <div className="flex items-center gap-5">
                                    <div className="w-20 h-20 rounded-2xl bg-primary-light flex items-center justify-center overflow-hidden border-2 border-primary/20 flex-shrink-0 relative group">
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
                                        <p className="text-xs text-text-secondary mt-1">Enter a URL or upload a file (max 5MB)</p>
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

                    {/* Practice Tab */}
                    {activeTab === 'practice' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card">
                            <h3 className="font-display font-bold text-lg text-text-primary mb-5">Practice Settings</h3>
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
                        </motion.div>
                    )}

                    {/* Availability Tab */}
                    {activeTab === 'availability' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="font-display font-bold text-lg text-text-primary">Availability Slots</h3>
                                <button onClick={addSlot} className="btn-outline flex items-center gap-1 text-sm !py-2">
                                    <Plus className="w-4 h-4" /> Add Slot
                                </button>
                            </div>

                            {form.availableSlots.length === 0 ? (
                                <p className="text-center text-text-secondary text-sm py-8">No availability slots configured. Click "Add Slot" to get started.</p>
                            ) : (
                                <div className="space-y-3">
                                    {form.availableSlots.map((slot, i) => (
                                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                            <select value={slot.day} onChange={(e) => updateSlot(i, 'day', e.target.value)} className="input-field !py-2 text-sm flex-1">
                                                {days.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                            <input type="time" value={slot.startTime} onChange={(e) => updateSlot(i, 'startTime', e.target.value)} className="input-field !py-2 text-sm w-32" />
                                            <span className="text-text-secondary text-sm">to</span>
                                            <input type="time" value={slot.endTime} onChange={(e) => updateSlot(i, 'endTime', e.target.value)} className="input-field !py-2 text-sm w-32" />
                                            <button onClick={() => removeSlot(i)} className="p-2 rounded-lg hover:bg-danger/10 text-danger transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button onClick={handleSave} disabled={saving} className="btn-primary mt-6 flex items-center gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </motion.div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="card">
                            <h3 className="font-display font-bold text-lg text-text-primary mb-5 flex items-center gap-2">
                                <Key className="w-5 h-5 text-primary" />
                                Change Password
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
                                <Key className="w-4 h-4" />
                                Reset Password via Email
                            </a>
                        </motion.div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default AdminSettings;
