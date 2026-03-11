import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, BookOpen, MessageCircle, Settings,
  Clock, FileText, ClipboardList, ChevronDown, ChevronUp,
  Video, CheckCircle2, XCircle, Loader2, AlertCircle, User
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { sessionAPI } from '../../services/api';

const patientLinks = [
  { name: 'Dashboard', path: '/patient/dashboard', icon: LayoutDashboard },
  { name: 'My Sessions', path: '/patient/sessions', icon: Clock },
  { name: 'Book Appointment', path: '/patient/book', icon: Calendar },
  { name: 'Mood Journal', path: '/patient/journal', icon: BookOpen },
  { name: 'Messages', path: '/patient/messages', icon: MessageCircle },
  { name: 'Settings', path: '/patient/settings', icon: Settings },
];

const statusConfig = {
  completed: { label: 'Completed', style: 'bg-success/10 text-success', icon: CheckCircle2 },
  cancelled: { label: 'Cancelled', style: 'bg-gray-100 text-gray-400', icon: XCircle },
  scheduled: { label: 'Upcoming', style: 'bg-primary/10 text-primary', icon: Clock },
  'no-show': { label: 'No Show', style: 'bg-danger/10 text-danger', icon: AlertCircle },
};

const PatientSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filter, setFilter] = useState('all'); // all | completed | upcoming

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await sessionAPI.getMyHistory();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Failed to load session history:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);

  const filteredSessions = sessions.filter((s) => {
    const status = s.appointment?.status;
    if (filter === 'completed') return status === 'completed';
    if (filter === 'upcoming') return status === 'scheduled';
    return true;
  });

  const getStatus = (apt) => {
    return statusConfig[apt.status] || statusConfig.scheduled;
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={patientLinks} userRole="patient" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
              My <span className="gradient-text">Sessions</span>
            </h1>
            <p className="text-text-secondary mt-1">Your therapy session history, notes, and questionnaire responses.</p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 mb-6">
            {[
              { key: 'all', label: 'All Sessions' },
              { key: 'completed', label: 'Completed' },
              { key: 'upcoming', label: 'Upcoming' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all
                  ${filter === tab.key
                    ? 'bg-primary text-white shadow-glow'
                    : 'bg-white text-text-secondary hover:bg-gray-50 shadow-soft'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Session List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="card text-center py-16">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-text-secondary font-medium">No sessions found</p>
              <Link to="/patient/book" className="text-primary text-sm font-medium mt-2 inline-block hover:underline">
                Book your first session →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map(({ appointment: apt, sessionNote, questionnaireResponses }) => {
                const status = getStatus(apt);
                const StatusIcon = status.icon;
                const isExpanded = expandedId === apt._id;
                const hasNote = !!sessionNote?.sessionDescription;
                const hasResponses = questionnaireResponses?.length > 0;
                const hasContent = hasNote || hasResponses;

                return (
                  <motion.div
                    key={apt._id}
                    layout
                    className="card overflow-hidden"
                  >
                    {/* Session Row */}
                    <div
                      className={`flex items-center gap-4 ${hasContent ? 'cursor-pointer' : ''}`}
                      onClick={() => hasContent && setExpandedId(isExpanded ? null : apt._id)}
                    >
                      {/* Doctor Avatar */}
                      <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {apt.doctor?.profilePic ? (
                          <img src={apt.doctor.profilePic} alt={apt.doctor.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-6 h-6 text-primary" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-text-primary truncate">
                          {apt.doctor?.name
                            ? (apt.doctor.name.toLowerCase().startsWith('dr') ? apt.doctor.name : `Dr. ${apt.doctor.name}`)
                            : 'Doctor'}
                        </p>
                        <p className="text-xs text-text-secondary mt-0.5">
                          {apt.doctor?.specialization || 'Therapist'} • {formatDate(apt.date)} at {apt.time}
                        </p>
                        {/* Badges */}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          {hasNote && (
                            <span className="flex items-center gap-1 text-[11px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                              <FileText className="w-3 h-3" /> Session Note
                            </span>
                          )}
                          {hasResponses && (
                            <span className="flex items-center gap-1 text-[11px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                              <ClipboardList className="w-3 h-3" /> {questionnaireResponses.length} Questionnaire{questionnaireResponses.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Status + Expand */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={`hidden sm:flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full ${status.style}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {status.label}
                        </span>
                        {apt.meetingLink && apt.status === 'scheduled' && (
                          <Link
                            to={apt.meetingLink}
                            onClick={(e) => e.stopPropagation()}
                            className="btn-primary !px-3 !py-1.5 text-xs flex items-center gap-1"
                          >
                            <Video className="w-3.5 h-3.5" /> Join
                          </Link>
                        )}
                        {hasContent && (
                          <button className="p-1.5 rounded-xl hover:bg-gray-100 text-text-secondary transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                      {isExpanded && hasContent && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-5 pt-5 border-t border-gray-100 space-y-5">

                            {/* Session Note */}
                            {hasNote && (
                              <div>
                                <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-primary" />
                                  Doctor's Session Notes
                                </h4>
                                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
                                  <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                                    {sessionNote.sessionDescription}
                                  </p>
                                  <p className="text-xs text-text-secondary mt-3">
                                    Noted on {new Date(sessionNote.createdAt).toLocaleDateString('en', {
                                      month: 'long', day: 'numeric', year: 'numeric'
                                    })}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Questionnaire Responses */}
                            {hasResponses && (
                              <div>
                                <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                                  <ClipboardList className="w-4 h-4 text-primary" />
                                  Your Questionnaire Responses
                                </h4>
                                <div className="space-y-4">
                                  {questionnaireResponses.map((qr, qi) => (
                                    <div key={qi} className="bg-purple-50 border border-purple-100 rounded-2xl p-4">
                                      {/* Template Header */}
                                      <div className="flex items-start justify-between mb-3">
                                        <div>
                                          <p className="text-sm font-bold text-purple-700">
                                            {qr.template?.title || 'Questionnaire'}
                                          </p>
                                          {qr.template?.diseaseName && (
                                            <p className="text-xs text-purple-500 mt-0.5">{qr.template.diseaseName}</p>
                                          )}
                                        </div>
                                        {qr.totalScore > 0 && (
                                          <span className="text-sm font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-xl">
                                            Score: {qr.totalScore}
                                          </span>
                                        )}
                                      </div>

                                      {/* Responses */}
                                      <div className="space-y-2">
                                        {(qr.responses || []).map((r, ri) => (
                                          <div key={ri} className="bg-white rounded-xl p-3 border border-purple-100">
                                            <p className="text-xs text-text-secondary mb-1">{r.questionText}</p>
                                            <p className="text-sm font-medium text-text-primary break-words">
                                              {r.type === 'image' && typeof r.answer === 'string' && r.answer.startsWith('http') ? (
                                                <a
                                                  href={r.answer}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-primary hover:underline"
                                                >
                                                  View Image →
                                                </a>
                                              ) : (
                                                r.answer || <span className="text-gray-400 italic">No answer</span>
                                              )}
                                            </p>
                                          </div>
                                        ))}
                                      </div>

                                      <p className="text-xs text-purple-400 mt-3">
                                        Submitted {new Date(qr.createdAt).toLocaleDateString('en', {
                                          month: 'short', day: 'numeric', year: 'numeric'
                                        })}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default PatientSessions;