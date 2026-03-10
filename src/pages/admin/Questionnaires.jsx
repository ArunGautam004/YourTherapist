import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
    Plus, Trash2, Save, Loader2, ClipboardList, ChevronDown, ChevronUp,
    FileText, X, Edit3, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import { sessionAPI, messageAPI } from '../../services/api';

const ANSWER_TYPES = [
    { value: 'objective', label: 'Objective (MCQ)' },
    { value: 'subjective', label: 'Subjective (Text)' },
    { value: 'image', label: 'Image Upload' },
    { value: 'mixed', label: 'Mixed' },
];

const QUESTION_TYPES = [
    { value: 'choice', label: 'Multiple Choice' },
    { value: 'objective', label: 'Objective (Single Answer)' },
    { value: 'scale', label: 'Scale (1-10)' },
    { value: 'text', label: 'Text / Short Answer' },
    { value: 'subjective', label: 'Subjective (Long Answer)' },
    { value: 'image', label: 'Image Response' },
];

const Questionnaires = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showBuilder, setShowBuilder] = useState(false);
    const [expandedTemplate, setExpandedTemplate] = useState(null);
    const [totalUnread, setTotalUnread] = useState(0);

    const [form, setForm] = useState({
        title: '',
        description: '',
        diseaseName: '',
        testName: '',
        answerType: 'objective',
        category: 'assessment',
        questions: [{ text: '', type: 'choice', options: ['', ''], required: true }],
    });

    const dynamicLinks = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Patients', path: '/admin/patients', icon: Users },
        { name: 'Questionnaires', path: '/admin/questionnaires', icon: ClipboardList },
        { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
        { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
        { name: 'Messages', path: '/admin/messages', icon: MessageCircle, badge: totalUnread > 0 ? totalUnread.toString() : null },
        { name: 'Settings', path: '/admin/settings', icon: Settings },
    ];

    useEffect(() => {
        fetchTemplates();
        messageAPI.getConversations().then(({ data }) => {
            const unread = (data.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
            setTotalUnread(unread);
        }).catch(() => { });
    }, []);

    const fetchTemplates = async () => {
        try {
            const { data } = await sessionAPI.getTemplates();
            setTemplates(data.templates || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const addQuestion = () => {
        setForm({
            ...form,
            questions: [...form.questions, { text: '', type: 'choice', options: ['', ''], required: true }],
        });
    };

    const removeQuestion = (idx) => {
        if (form.questions.length <= 1) return;
        setForm({ ...form, questions: form.questions.filter((_, i) => i !== idx) });
    };

    const updateQuestion = (idx, field, value) => {
        const qs = [...form.questions];
        qs[idx] = { ...qs[idx], [field]: value };
        setForm({ ...form, questions: qs });
    };

    const addOption = (qIdx) => {
        const qs = [...form.questions];
        qs[qIdx] = { ...qs[qIdx], options: [...(qs[qIdx].options || []), ''] };
        setForm({ ...form, questions: qs });
    };

    const removeOption = (qIdx, oIdx) => {
        const qs = [...form.questions];
        qs[qIdx] = { ...qs[qIdx], options: qs[qIdx].options.filter((_, i) => i !== oIdx) };
        setForm({ ...form, questions: qs });
    };

    const updateOption = (qIdx, oIdx, value) => {
        const qs = [...form.questions];
        const opts = [...qs[qIdx].options];
        opts[oIdx] = value;
        qs[qIdx] = { ...qs[qIdx], options: opts };
        setForm({ ...form, questions: qs });
    };

    const handleSave = async () => {
        if (!form.title.trim() || !form.diseaseName.trim()) {
            toast.error('Title and Disease Name are required');
            return;
        }
        if (form.questions.some(q => !q.text.trim())) {
            toast.error('All questions must have text');
            return;
        }

        setSaving(true);
        try {
            // Clean options for non-choice question types
            const cleanQuestions = form.questions.map(q => {
                if (['text', 'subjective', 'image'].includes(q.type)) {
                    return { ...q, options: [] };
                }
                if (q.type === 'scale') {
                    return { ...q, options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] };
                }
                return { ...q, options: q.options.filter(o => o.trim()) };
            });

            await sessionAPI.createTemplate({ ...form, questions: cleanQuestions });
            toast.success('Questionnaire created! 🎉');
            setShowBuilder(false);
            setForm({
                title: '', description: '', diseaseName: '', testName: '',
                answerType: 'objective', category: 'assessment',
                questions: [{ text: '', type: 'choice', options: ['', ''], required: true }],
            });
            fetchTemplates();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save questionnaire');
        } finally {
            setSaving(false);
        }
    };

    const needsOptions = (type) => ['choice', 'objective'].includes(type);

    return (
        <div className="min-h-screen bg-background">
            <Sidebar links={dynamicLinks} userRole="admin" />

            <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
                                <span className="gradient-text">Questionnaires</span>
                            </h1>
                            <p className="text-text-secondary mt-1">Create and manage disease-specific questionnaires</p>
                        </div>
                        <button
                            onClick={() => setShowBuilder(!showBuilder)}
                            className="btn-primary flex items-center gap-2 self-start"
                        >
                            {showBuilder ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {showBuilder ? 'Cancel' : 'Create Questionnaire'}
                        </button>
                    </div>

                    {/* Builder */}
                    <AnimatePresence>
                        {showBuilder && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden mb-8"
                            >
                                <div className="card border-2 border-primary/20">
                                    <h3 className="font-display font-bold text-lg text-text-primary mb-5 flex items-center gap-2">
                                        <Edit3 className="w-5 h-5 text-primary" />
                                        New Questionnaire
                                    </h3>

                                    {/* Meta fields */}
                                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Disease / Condition Name *</label>
                                            <input
                                                type="text"
                                                value={form.diseaseName}
                                                onChange={(e) => setForm({ ...form, diseaseName: e.target.value })}
                                                placeholder="e.g. Depression, Anxiety, PTSD..."
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Test Name</label>
                                            <input
                                                type="text"
                                                value={form.testName}
                                                onChange={(e) => setForm({ ...form, testName: e.target.value })}
                                                placeholder="e.g. PHQ-9, GAD-7, BDI-II..."
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Questionnaire Title *</label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) => setForm({ ...form, title: e.target.value })}
                                                placeholder="e.g. Patient Health Questionnaire"
                                                className="input-field"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Answer Type</label>
                                            <select
                                                value={form.answerType}
                                                onChange={(e) => setForm({ ...form, answerType: e.target.value })}
                                                className="input-field"
                                            >
                                                {ANSWER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-sm font-medium text-text-secondary mb-1.5 block">Description</label>
                                            <textarea
                                                value={form.description}
                                                onChange={(e) => setForm({ ...form, description: e.target.value })}
                                                placeholder="Brief description of this questionnaire..."
                                                rows={2}
                                                className="input-field resize-none"
                                            />
                                        </div>
                                    </div>

                                    {/* Questions */}
                                    <div className="border-t border-gray-100 pt-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="font-semibold text-text-primary">Questions ({form.questions.length})</h4>
                                            <button onClick={addQuestion} className="text-sm text-primary font-medium hover:text-primary-dark flex items-center gap-1">
                                                <Plus className="w-4 h-4" /> Add Question
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            {form.questions.map((q, qi) => (
                                                <div key={qi} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                                    <div className="flex items-start gap-3 mb-3">
                                                        <span className="w-7 h-7 rounded-lg bg-primary text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                                                            {qi + 1}
                                                        </span>
                                                        <div className="flex-1 space-y-3">
                                                            <input
                                                                type="text"
                                                                value={q.text}
                                                                onChange={(e) => updateQuestion(qi, 'text', e.target.value)}
                                                                placeholder="Enter question text..."
                                                                className="input-field !bg-white"
                                                            />
                                                            <div className="flex items-center gap-3">
                                                                <select
                                                                    value={q.type}
                                                                    onChange={(e) => updateQuestion(qi, 'type', e.target.value)}
                                                                    className="input-field !bg-white !py-2 text-sm w-48"
                                                                >
                                                                    {QUESTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                                                </select>
                                                                <label className="flex items-center gap-1.5 text-sm text-text-secondary cursor-pointer">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={q.required}
                                                                        onChange={(e) => updateQuestion(qi, 'required', e.target.checked)}
                                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                                    />
                                                                    Required
                                                                </label>
                                                            </div>

                                                            {/* Options for choice/objective types */}
                                                            {needsOptions(q.type) && (
                                                                <div className="space-y-2">
                                                                    <p className="text-xs text-text-secondary font-medium">Options:</p>
                                                                    {(q.options || []).map((opt, oi) => (
                                                                        <div key={oi} className="flex items-center gap-2">
                                                                            <span className="text-xs text-text-secondary w-5">{String.fromCharCode(65 + oi)}.</span>
                                                                            <input
                                                                                type="text"
                                                                                value={opt}
                                                                                onChange={(e) => updateOption(qi, oi, e.target.value)}
                                                                                placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                                                                                className="input-field !bg-white !py-1.5 text-sm flex-1"
                                                                            />
                                                                            {q.options.length > 2 && (
                                                                                <button onClick={() => removeOption(qi, oi)} className="p-1 text-danger hover:bg-danger/10 rounded">
                                                                                    <X className="w-3 h-3" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                    <button onClick={() => addOption(qi)} className="text-xs text-primary font-medium hover:text-primary-dark">
                                                                        + Add Option
                                                                    </button>
                                                                </div>
                                                            )}

                                                            {q.type === 'image' && (
                                                                <p className="text-xs text-text-secondary bg-amber-50 p-2 rounded-lg">
                                                                    📷 Patient will be asked to upload an image as their response
                                                                </p>
                                                            )}
                                                        </div>
                                                        {form.questions.length > 1 && (
                                                            <button onClick={() => removeQuestion(qi)} className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition-colors flex-shrink-0">
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 mt-6 pt-5 border-t border-gray-100">
                                        <button onClick={() => setShowBuilder(false)} className="btn-outline">Cancel</button>
                                        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            {saving ? 'Saving...' : 'Save Questionnaire'}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Templates List */}
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : templates.length > 0 ? (
                        <div className="space-y-3">
                            {templates.map((tmpl) => (
                                <div key={tmpl._id} className="card hover:shadow-soft-lg transition-shadow">
                                    <div
                                        className="flex items-center justify-between cursor-pointer"
                                        onClick={() => setExpandedTemplate(expandedTemplate === tmpl._id ? null : tmpl._id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center flex-shrink-0">
                                                <ClipboardList className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-text-primary">{tmpl.title}</h4>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{tmpl.diseaseName}</span>
                                                    {tmpl.testName && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-secondary">{tmpl.testName}</span>}
                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-text-secondary capitalize">{tmpl.answerType}</span>
                                                    <span className="text-xs text-text-secondary">{tmpl.questions?.length || 0} questions</span>
                                                </div>
                                            </div>
                                        </div>
                                        {expandedTemplate === tmpl._id ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
                                    </div>

                                    <AnimatePresence>
                                        {expandedTemplate === tmpl._id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                                                    {tmpl.description && <p className="text-sm text-text-secondary">{tmpl.description}</p>}
                                                    {(tmpl.questions || []).map((q, i) => (
                                                        <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-gray-50">
                                                            <span className="text-xs font-bold text-primary mt-0.5">{i + 1}.</span>
                                                            <div>
                                                                <p className="text-sm text-text-primary font-medium">{q.text}</p>
                                                                <p className="text-xs text-text-secondary capitalize mt-0.5">Type: {q.type}</p>
                                                                {q.options && q.options.length > 0 && !['text', 'subjective', 'image'].includes(q.type) && (
                                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                                        {q.options.map((opt, oi) => (
                                                                            <span key={oi} className="text-xs bg-white px-2 py-0.5 rounded-full border border-gray-200">{opt}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="card text-center py-12">
                            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mx-auto mb-4">
                                <ClipboardList className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-text-primary mb-1">No Questionnaires Yet</h3>
                            <p className="text-text-secondary text-sm max-w-sm mx-auto mb-6">
                                Create disease-specific questionnaires that you can send to patients during video sessions.
                            </p>
                            <button onClick={() => setShowBuilder(true)} className="btn-primary inline-flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Create Your First Questionnaire
                            </button>
                        </div>
                    )}
                </motion.div>
            </main>
        </div>
    );
};

export default Questionnaires;
