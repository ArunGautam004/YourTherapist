import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
  Plus, Trash2, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import { moodAPI } from '../../services/api';

const patientLinks = [
  { name: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
  { name: 'My Sessions', path: '/patient/sessions', icon: Clock },
  { name: 'Book Appointment', path: '/patient/book', icon: Calendar },
  { name: 'Mood Journal', path: '/patient/journal', icon: BookOpen },
  { name: 'Messages', path: '/patient/messages', icon: MessageCircle, badge: '3' },
  { name: 'Settings', path: '/patient/settings', icon: Settings },
];

const moods = [
  { score: 1, emoji: '😢', label: 'Terrible' },
  { score: 3, emoji: '😟', label: 'Bad' },
  { score: 5, emoji: '😐', label: 'Okay' },
  { score: 7, emoji: '😊', label: 'Good' },
  { score: 8, emoji: '😄', label: 'Great' },
  { score: 10, emoji: '🤩', label: 'Amazing' },
];

const tagOptions = ['therapy', 'exercise', 'sleep', 'anxiety', 'work', 'family', 'meditation', 'breathing', 'social', 'progress'];

const MoodJournal = () => {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState([]);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchEntries = async () => {
    try {
      const { data } = await moodAPI.getEntries(30);
      setEntries(data.entries || []);
      setStats(data.stats || {});

      // Pre-fill today's mood if it exists
      const today = new Date().toDateString();
      const todayEntry = (data.entries || []).find(e => new Date(e.date).toDateString() === today);
      if (todayEntry) {
        const m = moods.find(m => m.score === todayEntry.score);
        if (m) setSelectedMood(m);
        setNote(todayEntry.note || '');
        setTags(todayEntry.tags || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEntries(); }, []);

  // Check if we already have an entry for today
  const hasTodayEntry = entries.some(e => new Date(e.date).toDateString() === new Date().toDateString());

  const handleSubmit = async () => {
    if (!selectedMood) return toast.error('Please select a mood');
    setSubmitting(true);
    try {
      const { data } = await moodAPI.create({
        score: selectedMood.score,
        emoji: selectedMood.emoji,
        label: selectedMood.label,
        note,
        tags,
      });
      toast.success(data.updated ? 'Mood updated! ✨' : 'Mood logged! 🎉');
      fetchEntries();
    } catch (err) {
      toast.error('Failed to log mood');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await moodAPI.delete(id);
      toast.success('Entry deleted');
      fetchEntries();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const toggleTag = (tag) => {
    setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={patientLinks} userRole="patient" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary mb-2">
            Mood <span className="gradient-text">Journal</span>
          </h1>
          <p className="text-text-secondary mb-8">Track your emotional well-being over time</p>

          <div className="grid lg:grid-cols-5 gap-6">
            {/* Mood Logger */}
            <div className="lg:col-span-3 card">
              <h2 className="font-display font-bold text-lg text-text-primary mb-4">How are you feeling?</h2>

              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-between mb-6">
                {moods.map((mood) => (
                  <button
                    key={mood.score}
                    onClick={() => setSelectedMood(mood)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200
                      ${selectedMood?.score === mood.score ? 'bg-primary-light scale-110 shadow-soft' : 'hover:bg-gray-50'}`}
                  >
                    <span className="text-3xl">{mood.emoji}</span>
                    <span className="text-xs text-text-secondary font-medium">{mood.label}</span>
                  </button>
                ))}
              </div>

              {/* Tags */}
              <div className="mb-4">
                <p className="text-sm font-medium text-text-primary mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all capitalize
                        ${tags.includes(tag) ? 'bg-primary text-white' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'}`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="How are you feeling? (optional)"
                rows={3}
                className="input-field resize-none mb-4"
              />

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <Plus className="w-4 h-4" /> {submitting ? 'Saving...' : hasTodayEntry ? 'Update Mood' : 'Log Mood'}
              </button>
            </div>

            {/* Stats */}
            <div className="lg:col-span-2 space-y-4">
              <div className="card">
                <h3 className="font-display font-bold text-text-primary mb-3">Weekly Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-primary-light text-center">
                    <p className="text-2xl font-bold text-primary">{stats.avgMood || '-'}</p>
                    <p className="text-xs text-text-secondary">Avg Mood</p>
                  </div>
                  <div className="p-3 rounded-xl bg-success/10 text-center">
                    <p className="text-2xl font-bold text-success">{stats.streak || 0}</p>
                    <p className="text-xs text-text-secondary">Day Streak</p>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary-light text-center">
                    <p className="text-2xl font-bold text-secondary">{stats.totalEntries || 0}</p>
                    <p className="text-xs text-text-secondary">Entries</p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 text-center">
                    <p className="text-2xl font-bold text-amber-600">
                      {stats.changePercent ? `${stats.changePercent > 0 ? '+' : ''}${stats.changePercent}%` : '-'}
                    </p>
                    <p className="text-xs text-text-secondary">Change</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="card mt-6">
            <h2 className="font-display font-bold text-lg text-text-primary mb-4">Recent Entries</h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : entries.length > 0 ? (
              <div className="space-y-2">
                {entries.slice(0, 10).map((entry) => (
                  <div key={entry._id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 transition-colors group">
                    <span className="text-2xl">{entry.emoji || '😐'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-primary">{entry.label || 'Mood'}</span>
                        <span className="text-xs text-primary font-bold">{entry.score}/10</span>
                        {entry.tags?.map(t => (
                          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary capitalize">{t}</span>
                        ))}
                      </div>
                      {entry.note && <p className="text-xs text-text-secondary truncate">{entry.note}</p>}
                    </div>
                    <span className="text-xs text-text-secondary">
                      {new Date(entry.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                    </span>
                    <button
                      onClick={() => handleDelete(entry._id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-text-secondary text-sm py-6">No mood entries yet. Start logging above!</p>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default MoodJournal;
