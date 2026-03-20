// src/pages/patient/MoodJournal.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flame, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import PatientSidebar from './Sidebar';
import { moodAPI, messageAPI } from '../../services/api';

const MOODS = [
  { score: 1,  emoji: '😭', label: 'Terrible',  color: 'from-red-400 to-rose-500',       bg: 'bg-red-50',    ring: 'ring-red-300',    bar: 'bg-red-400' },
  { score: 3,  emoji: '😟', label: 'Bad',        color: 'from-orange-400 to-red-400',     bg: 'bg-orange-50', ring: 'ring-orange-300', bar: 'bg-orange-400' },
  { score: 5,  emoji: '😐', label: 'Meh',        color: 'from-yellow-400 to-amber-400',   bg: 'bg-yellow-50', ring: 'ring-yellow-300', bar: 'bg-yellow-400' },
  { score: 7,  emoji: '😊', label: 'Good',       color: 'from-lime-400 to-green-400',     bg: 'bg-lime-50',   ring: 'ring-lime-300',   bar: 'bg-lime-400' },
  { score: 9,  emoji: '😄', label: 'Great',      color: 'from-green-400 to-emerald-500',  bg: 'bg-green-50',  ring: 'ring-green-300',  bar: 'bg-green-400' },
  { score: 10, emoji: '🤩', label: 'Amazing',    color: 'from-primary to-teal-500',       bg: 'bg-teal-50',   ring: 'ring-teal-300',   bar: 'bg-primary' },
];

const TAGS = [
  { tag: 'therapy', icon: '🧠' }, { tag: 'exercise', icon: '🏃' },
  { tag: 'sleep',   icon: '😴' }, { tag: 'anxiety',  icon: '😰' },
  { tag: 'work',    icon: '💼' }, { tag: 'family',   icon: '👨‍👩‍👧' },
  { tag: 'meditation', icon: '🧘' }, { tag: 'social', icon: '🤝' },
  { tag: 'progress', icon: '📈' }, { tag: 'nature',  icon: '🌿' },
];

const PROMPTS = [
  "What made you smile today?",
  "What's weighing on your mind?",
  "Describe one thing you're grateful for.",
  "What would make tomorrow better?",
  "What emotion is most present right now?",
  "How did you take care of yourself today?",
];

const isToday = (d) => new Date(d).toDateString() === new Date().toDateString();

const getMoodByScore = (score) =>
  MOODS.reduce((closest, m) => Math.abs(m.score - score) < Math.abs(closest.score - score) ? m : closest);

const MoodJournal = () => {
  const [selectedMood, setSelectedMood] = useState(null);
  const [note, setNote]       = useState('');
  const [tags, setTags]       = useState([]);
  const [entries, setEntries] = useState([]);
  const [stats, setStats]     = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
  const [hoveredMood, setHoveredMood] = useState(null);

  useEffect(() => {
    messageAPI.getConversations()
      .then(({ data }) => {
        const u = (data.conversations || []).reduce((s, c) => s + (c.unreadCount || 0), 0);
        setTotalUnread(u);
      }).catch(() => {});
  }, []);

  const fetchEntries = async () => {
    try {
      const { data } = await moodAPI.getEntries(30);
      setEntries(data.entries || []);
      setStats(data.stats || {});
      const todayEntry = (data.entries || []).find(e => isToday(e.date));
      if (todayEntry) {
        const m = getMoodByScore(todayEntry.score);
        setSelectedMood(m);
        setNote(todayEntry.note || '');
        setTags(todayEntry.tags || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchEntries(); }, []);

  const hasTodayEntry = entries.some(e => isToday(e.date));

  const handleSubmit = async () => {
    if (!selectedMood) return toast.error('Pick a mood first!');
    setSubmitting(true);
    try {
      const { data } = await moodAPI.create({
        score: selectedMood.score,
        emoji: selectedMood.emoji,
        label: selectedMood.label,
        note, tags,
      });
      toast.success(data.updated ? 'Mood updated! ✨' : `Logged ${selectedMood.label} mood 🎉`);
      fetchEntries();
    } catch { toast.error('Failed to log mood'); }
    finally { setSubmitting(false); }
  };

  const toggleTag = (tag) => setTags(tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);

  const activeMood = hoveredMood || selectedMood;

  return (
    <div className="min-h-screen bg-background">
      <PatientSidebar unreadMessages={totalUnread} />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto">
          <div className="mb-6">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
              Mood <span className="gradient-text">Journal</span> 📓
            </h1>
            <p className="text-text-secondary mt-1">Your daily emotional check-in — small habit, big impact.</p>
          </div>

          <div className="grid lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-4">
              <motion.div
                className={`relative overflow-hidden rounded-3xl p-6 transition-all duration-500 ${
                  activeMood ? `bg-gradient-to-br ${activeMood.color} shadow-soft-xl` : 'bg-gradient-to-br from-gray-100 to-gray-50'
                }`}
                layout
              >
                <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 pointer-events-none" />
                <div className="relative">
                  <p className="text-white/80 text-sm font-medium mb-2">{hasTodayEntry ? '✏️ Update today\'s mood' : '☀️ How are you feeling today?'}</p>
                  <div className="flex items-center gap-4">
                    <motion.span key={activeMood?.emoji || 'none'} initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-6xl">
                      {activeMood?.emoji || '🌫️'}
                    </motion.span>
                    <div>
                      <motion.p key={activeMood?.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="font-display text-2xl font-bold text-white">
                        {activeMood?.label || 'Select a mood'}
                      </motion.p>
                      {activeMood && <p className="text-white/70 text-sm">{activeMood.score}/10</p>}
                    </div>
                  </div>
                </div>
              </motion.div>

              <div className="card">
                <p className="text-sm font-semibold text-text-secondary mb-4 uppercase tracking-wider">Tap to select</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {MOODS.map((mood) => (
                    <motion.button
                      key={mood.score}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                      onHoverStart={() => setHoveredMood(mood)}
                      onHoverEnd={() => setHoveredMood(null)}
                      onClick={() => setSelectedMood(mood)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 border-2 ${
                        selectedMood?.score === mood.score
                          ? `${mood.bg} border-current ring-2 ${mood.ring} shadow-soft`
                          : 'bg-gray-50 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-2xl">{mood.emoji}</span>
                      <span className="text-[10px] font-semibold text-text-secondary">{mood.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="card">
                <p className="text-sm font-semibold text-text-primary mb-3">What's influencing your mood?</p>
                <div className="flex flex-wrap gap-2">
                  {TAGS.map(({ tag, icon }) => (
                    <motion.button
                      key={tag}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleTag(tag)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all capitalize ${
                        tags.includes(tag) ? 'bg-primary text-white shadow-soft' : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                      }`}
                    >
                      <span>{icon}</span> {tag}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div className="card">
                <p className="text-sm font-semibold text-text-primary mb-2">Journal Entry</p>
                <p className="text-xs text-text-secondary mb-3 italic">✍️ {prompt}</p>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write your thoughts here..."
                  rows={4}
                  className="input-field resize-none"
                />
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmit}
                  disabled={submitting || !selectedMood}
                  className="btn-primary w-full mt-3 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>{hasTodayEntry ? '✏️' : '✅'}</span>}
                  {submitting ? 'Saving...' : hasTodayEntry ? 'Update Today\'s Mood' : 'Save Mood'}
                </motion.button>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-4">
              <motion.div className="card bg-gradient-to-br from-orange-400 to-amber-500 text-white overflow-hidden relative" whileHover={{ scale: 1.01 }}>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-1">
                    <Flame className="w-5 h-5" />
                    <span className="text-sm font-semibold opacity-90">Current Streak</span>
                  </div>
                  <p className="font-display text-5xl font-bold">{stats.streak || 0}</p>
                  <p className="text-white/80 text-sm mt-1">
                    {stats.streak >= 7 ? '🏆 Week streak! You\'re on fire!' : stats.streak >= 3 ? '🌟 Keep it going!' : 'Log daily to build your streak'}
                  </p>
                </div>
              </motion.div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card text-center p-4">
                  <p className="font-display text-3xl font-bold text-primary">{stats.avgMood || '—'}</p>
                  <p className="text-xs text-text-secondary mt-1">Avg Mood</p>
                  <p className="text-[10px] text-text-secondary/60">This week</p>
                </div>
                <div className="card text-center p-4">
                  <div className="flex items-center justify-center gap-1">
                    <p className="font-display text-3xl font-bold text-secondary">{stats.totalEntries || 0}</p>
                  </div>
                  <p className="text-xs text-text-secondary mt-1">Total Logs</p>
                  <p className="text-[10px] text-text-secondary/60">All time</p>
                </div>
                <div className="col-span-2 card p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-text-secondary">Mood Change</p>
                    {stats.changePercent > 0 ? <TrendingUp className="w-4 h-4 text-green-500" /> : stats.changePercent < 0 ? <TrendingDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-text-secondary" />}
                  </div>
                  <p className={`font-display text-2xl font-bold ${stats.changePercent > 0 ? 'text-green-500' : stats.changePercent < 0 ? 'text-red-400' : 'text-text-secondary'}`}>
                    {stats.changePercent ? `${stats.changePercent > 0 ? '+' : ''}${stats.changePercent}%` : '—'}
                  </p>
                  <p className="text-[10px] text-text-secondary/60">vs last week</p>
                </div>
              </div>

              <div className="card">
                <p className="text-sm font-semibold text-text-primary mb-3">Last 7 Days</p>
                <div className="flex items-end gap-1.5 h-20">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - (6 - i));
                    const entry = entries.find(e => new Date(e.date).toDateString() === d.toDateString());
                    const mood = entry ? getMoodByScore(entry.score) : null;
                    const isToday = i === 6;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group" title={entry ? `${entry.label} (${entry.score}/10)` : 'No entry'}>
                        <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity mb-0.5">{entry?.emoji || ''}</span>
                        <div
                          className={`w-full rounded-t-xl transition-all duration-500 ${mood ? mood.bar : 'bg-gray-200'} ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                          style={{ height: entry ? `${(entry.score / 10) * 100}%` : '8%', minHeight: 5 }}
                        />
                        <span className={`text-[9px] font-medium ${isToday ? 'text-primary font-bold' : 'text-text-secondary'}`}>
                          {d.toLocaleDateString('en', { weekday: 'narrow' })}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="card mt-5">
            <button onClick={() => setShowHistory(!showHistory)} className="w-full flex items-center justify-between">
              <div>
                <h2 className="font-display font-bold text-lg text-text-primary text-left">Mood History</h2>
                <p className="text-xs text-text-secondary mt-0.5">Past entries are permanent — only today's mood can be updated</p>
              </div>
              {showHistory ? <ChevronUp className="w-5 h-5 text-text-secondary" /> : <ChevronDown className="w-5 h-5 text-text-secondary" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="mt-4 space-y-2">
                    {loading ? (
                      <div className="flex justify-center py-6"><div className="w-7 h-7 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>
                    ) : entries.length > 0 ? (
                      entries.slice(0, 20).map((entry) => {
                        const today = isToday(entry.date);
                        const mood  = getMoodByScore(entry.score);
                        return (
                          <motion.div key={entry._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${mood.bg} ${today ? 'ring-2 ring-primary/30 border-primary/20' : 'border-transparent'}`}>
                            <span className="text-2xl flex-shrink-0">{entry.emoji || mood.emoji}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-text-primary">{entry.label}</span>
                                <span className="text-xs font-bold text-primary">{entry.score}/10</span>
                                {today && <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary text-white font-medium">Today</span>}
                                {(entry.tags || []).map(t => {
                                  const tagData = TAGS.find(td => td.tag === t);
                                  return <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/70 text-text-secondary border capitalize flex items-center gap-0.5">{tagData?.icon} {t}</span>;
                                })}
                              </div>
                              {entry.note && <p className="text-xs text-text-secondary truncate mt-0.5 italic">"{entry.note}"</p>}
                            </div>
                            <span className="text-xs text-text-secondary whitespace-nowrap flex-shrink-0">
                              {new Date(entry.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                            </span>
                          </motion.div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <span className="text-4xl">📓</span>
                        <p className="text-text-secondary text-sm mt-2">No entries yet — start logging above!</p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default MoodJournal;