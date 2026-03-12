import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
  Search, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Video, FileText, ClipboardList, ChevronDown, ChevronUp, Save, Loader2, X, Edit2, Check
} from 'lucide-react';
import toast from 'react-hot-toast';
import Sidebar from '../../components/layout/Sidebar';
import { patientAPI, sessionAPI, messageAPI } from '../../services/api';

const AdminPatients = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientDetail, setPatientDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [totalUnread, setTotalUnread] = useState(0);

  const [expandedApt, setExpandedApt] = useState(null);
  const [aptDetail, setAptDetail] = useState({});
  const [aptDetailLoading, setAptDetailLoading] = useState(null);
  const [reportText, setReportText] = useState('');
  const [savingReport, setSavingReport] = useState(false);

  const [isEditingRisk, setIsEditingRisk] = useState(false);
  const [editRisk, setEditRisk] = useState('');
  const [isEditingDiagnosis, setIsEditingDiagnosis] = useState(false);
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [savingPatient, setSavingPatient] = useState(false);

  const dynamicLinks = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Patients', path: '/admin/patients', icon: Users },
    { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
    { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
    { name: 'Questionnaires', path: '/admin/questionnaires', icon: ClipboardList },
    { name: 'Messages', path: '/admin/messages', icon: MessageCircle, badge: totalUnread > 0 ? totalUnread.toString() : null },
    { name: 'Settings', path: '/admin/settings', icon: Settings },
  ];

  const fetchPatients = async () => {
    try {
      const [{ data }, { data: msgData }] = await Promise.all([
        patientAPI.getAll({ search: searchQuery, riskLevel: filterRisk }),
        messageAPI.getConversations().catch(() => ({ data: { conversations: [] } }))
      ]);
      setPatients(data.patients || []);
      const unread = (msgData.conversations || []).reduce((sum, c) => sum + (c.unreadCount || 0), 0);
      setTotalUnread(unread);
      return data.patients || [];
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // ✅ On mount: fetch patients, then auto-select if ?selected= param exists
  useEffect(() => {
    const autoSelectId = searchParams.get('selected');
    fetchPatients().then((fetchedPatients) => {
      if (autoSelectId && fetchedPatients.length > 0) {
        const match = fetchedPatients.find(p => p._id === autoSelectId);
        if (match) {
          handleSelectPatient(match);
        }
      }
    });
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [searchQuery, filterRisk]);

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    setExpandedApt(null);
    setAptDetail({});
    // Update URL so it's shareable / back-navigable
    setSearchParams({ selected: patient._id });
    try {
      const { data } = await patientAPI.getById(patient._id);
      setPatientDetail(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBackToList = () => {
    setSelectedPatient(null);
    setPatientDetail(null);
    setSearchParams({});
  };

  const handleExpandApt = async (aptId) => {
    if (expandedApt === aptId) {
      setExpandedApt(null);
      return;
    }
    setExpandedApt(aptId);
    if (aptDetail[aptId]) return;
    setAptDetailLoading(aptId);
    try {
      const { data } = await sessionAPI.getSessionDetail(aptId);
      setAptDetail(prev => ({ ...prev, [aptId]: data }));
    } catch (err) {
      console.error(err);
    } finally {
      setAptDetailLoading(null);
    }
  };

  const handleSaveReport = async (aptId, patientId) => {
    if (!reportText.trim()) {
      toast.error('Please enter a report');
      return;
    }
    setSavingReport(true);
    try {
      const existing = aptDetail[aptId]?.sessionNote;
      if (existing?._id) {
        await sessionAPI.updateNote(existing._id, { report: reportText.trim() });
      } else {
        await sessionAPI.createNote({
          appointment: aptId,
          patient: patientId,
          report: reportText.trim(),
          isSharedWithPatient: true,
        });
      }
      toast.success('Report saved!');
      const { data } = await sessionAPI.getSessionDetail(aptId);
      setAptDetail(prev => ({ ...prev, [aptId]: data }));
      setReportText('');
    } catch (err) {
      toast.error('Failed to save report');
    } finally {
      setSavingReport(false);
    }
  };

  const handleUpdatePatient = async (field, value) => {
    try {
      setSavingPatient(true);
      await patientAPI.update(selectedPatient._id, { [field]: value });
      setSelectedPatient(prev => ({ ...prev, [field]: value }));
      setPatients(patients.map(p => p._id === selectedPatient._id ? { ...p, [field]: value } : p));
      toast.success('Updated successfully');
      setIsEditingRisk(false);
      setIsEditingDiagnosis(false);
    } catch (err) {
      toast.error('Failed to update patient');
    } finally {
      setSavingPatient(false);
    }
  };

  const getAptDisplayStatus = (apt) => {
    if (apt.status === 'cancelled') return { label: 'Cancelled', style: 'bg-gray-100 text-gray-500' };
    if (apt.status === 'completed') return { label: 'Ended', style: 'bg-success/10 text-success' };

    const aptDate = new Date(apt.date);
    const [timeStr, modifier] = (apt.time || '12:00 PM').split(' ');
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours, 10);
    if (hours === 12) hours = 0;
    if (modifier === 'PM') hours += 12;

    aptDate.setHours(hours, parseInt(minutes || 0, 10), 0, 0);
    const now = new Date();
    const endTime = new Date(aptDate.getTime() + (apt.duration || 50) * 60000);

    if (now < aptDate) return { label: 'Upcoming', style: 'bg-primary/10 text-primary' };
    if (now >= aptDate && now <= endTime) return { label: 'Ongoing', style: 'bg-warning/10 text-warning animate-pulse' };
    return { label: 'Ended', style: 'bg-gray-100 text-text-secondary' };
  };

  const getRiskBadge = (level) => {
    const styles = { low: 'bg-success/10 text-success', medium: 'bg-warning/10 text-warning', high: 'bg-danger/10 text-danger' };
    return styles[level] || styles.low;
  };

  const getTrendIcon = (trend) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-success" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-danger" />;
    return <Minus className="w-4 h-4 text-warning" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar links={dynamicLinks} userRole="admin" />

      <main className="lg:ml-[260px] pt-20 lg:pt-6 p-4 md:p-6 lg:p-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-text-primary">
                My <span className="gradient-text">Patients</span>
              </h1>
              <p className="text-text-secondary mt-1">{patients.length} patients under your care</p>
            </div>
          </div>

          {/* Search & Filter */}
          <div className="card mb-6 flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary/50" />
              <input
                type="text"
                placeholder="Search patients by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field !pl-12"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {['all', 'high', 'medium', 'low'].map((level) => (
                <button
                  key={level}
                  onClick={() => setFilterRisk(level)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition-all
                    ${filterRisk === level ? 'bg-primary text-white shadow-glow' : 'bg-gray-50 text-text-secondary hover:bg-gray-100'}`}
                >
                  {level === 'all' ? 'All' : level}
                </button>
              ))}
            </div>
          </div>

          {selectedPatient ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <button
                onClick={handleBackToList}
                className="text-sm text-primary font-medium hover:text-primary-dark flex items-center gap-1"
              >
                ← Back to all patients
              </button>
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Patient Info */}
                <div className="card">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-primary-light flex items-center justify-center text-4xl mx-auto mb-4 overflow-hidden">
                      {selectedPatient.profilePic ? (
                        <img src={selectedPatient.profilePic} alt={selectedPatient.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>👤</span>
                      )}
                    </div>
                    <h3 className="font-display font-bold text-xl text-text-primary">{selectedPatient.name}</h3>
                    <p className="text-sm text-text-secondary">{selectedPatient.gender || ''}</p>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {isEditingRisk ? (
                        <div className="flex items-center gap-1">
                          <select
                            value={editRisk}
                            onChange={(e) => setEditRisk(e.target.value)}
                            className="text-xs p-1 border rounded"
                          >
                            <option value="low">Low Risk</option>
                            <option value="medium">Medium Risk</option>
                            <option value="high">High Risk</option>
                            <option value="critical">Critical Risk</option>
                          </select>
                          <button onClick={() => handleUpdatePatient('riskLevel', editRisk)} disabled={savingPatient} className="text-success"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setIsEditingRisk(false)} className="text-text-secondary"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium uppercase ${getRiskBadge(selectedPatient.riskLevel)}`}>
                            {selectedPatient.riskLevel || 'low'} risk
                          </span>
                          <button onClick={() => { setEditRisk(selectedPatient.riskLevel || 'low'); setIsEditingRisk(true); }} className="p-1 hover:bg-gray-100 rounded text-text-secondary">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 mt-4 px-4">
                      <button 
                        onClick={() => navigate('/admin/messages', { state: { targetPartner: selectedPatient } })}
                        className="btn-primary flex items-center justify-center gap-2 !py-2.5 text-sm w-full"
                      >
                        <MessageCircle className="w-4 h-4" /> Message Patient
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-gray-50 group/diag relative">
                      <div className="flex justify-between items-start">
                        <p className="text-xs text-text-secondary">Diagnosis</p>
                        {!isEditingDiagnosis && (
                          <button onClick={() => { setEditDiagnosis(selectedPatient.diagnosis || ''); setIsEditingDiagnosis(true); }} className="p-1 hover:bg-gray-200 rounded text-text-secondary opacity-0 group-hover/diag:opacity-100 transition-opacity">
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      {isEditingDiagnosis ? (
                        <div className="flex items-center gap-1 mt-1">
                          <input type="text" value={editDiagnosis} onChange={e => setEditDiagnosis(e.target.value)} className="flex-1 text-sm p-1 border rounded" autoFocus />
                          <button onClick={() => handleUpdatePatient('diagnosis', editDiagnosis)} disabled={savingPatient} className="text-success"><Check className="w-4 h-4" /></button>
                          <button onClick={() => setIsEditingDiagnosis(false)} className="text-text-secondary"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <p className="text-sm font-medium text-text-primary mt-0.5">{selectedPatient.diagnosis || 'Not assessed yet'}</p>
                      )}
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50">
                      <p className="text-xs text-text-secondary">Email</p>
                      <p className="text-sm font-medium text-text-primary">{selectedPatient.email}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50">
                      <p className="text-xs text-text-secondary">Phone</p>
                      <p className="text-sm font-medium text-text-primary">{selectedPatient.phone || '—'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-gray-50">
                      <p className="text-xs text-text-secondary">Sessions Completed</p>
                      <p className="text-sm font-medium text-text-primary">{patientDetail?.sessionCount || selectedPatient.sessions || 0}</p>
                    </div>
                  </div>
                </div>

                {/* Session & Note History */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="card">
                    <h3 className="font-display font-bold text-lg text-text-primary mb-5">Appointment History</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="text-xs font-semibold text-text-secondary uppercase tracking-wider border-b border-gray-100">
                            <th className="pb-3 px-2">Date</th>
                            <th className="pb-3 px-2">Time</th>
                            <th className="pb-3 px-2 text-right">Status</th>
                            <th className="pb-3 px-2 text-right w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {(patientDetail?.appointments || []).map((apt, i) => {
                            const aptId = apt._id || `apt-${i}`;
                            const detail = aptDetail[aptId];
                            const isExpanded = expandedApt === aptId;
                            const isLoading = aptDetailLoading === aptId;
                            return (
                              <>
                                <tr
                                  key={aptId}
                                  className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                                  onClick={() => handleExpandApt(aptId)}
                                >
                                  <td className="py-3 px-2 whitespace-nowrap">
                                    <span className="text-sm font-medium text-text-primary">
                                      {new Date(apt.date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                  </td>
                                  <td className="py-3 px-2 text-sm text-text-secondary">{apt.time}</td>
                                  <td className="py-3 px-2 text-right">
                                    {(() => {
                                      const status = getAptDisplayStatus(apt);
                                      return (
                                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase ${status.style}`}>
                                          {status.label}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="py-3 px-2 text-right">
                                    {isLoading ? (
                                      <Loader2 className="w-4 h-4 animate-spin text-primary ml-auto" />
                                    ) : (
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleExpandApt(aptId); }}
                                        className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-lg hover:bg-primary/20 transition-colors inline-flex items-center justify-center gap-1 ml-auto"
                                      >
                                        Details {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                      </button>
                                    )}
                                  </td>
                                </tr>

                                {isExpanded && (
                                  <tr key={`${aptId}-detail`}>
                                    <td colSpan="4" className="p-4 bg-gray-50/50">
                                      {isLoading ? (
                                        <div className="flex justify-center py-4">
                                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                        </div>
                                      ) : detail ? (
                                        <div className="space-y-4">
                                          {/* Session Description (auto-saved during call) */}
                                          <div>
                                            <h5 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1">
                                              <FileText className="w-4 h-4 text-primary" /> Session Notes
                                            </h5>
                                            {detail.sessionNote?.sessionDescription ? (
                                              <p className="text-sm text-text-secondary bg-white p-3 rounded-xl border border-gray-100">
                                                {detail.sessionNote.sessionDescription}
                                              </p>
                                            ) : (
                                              <p className="text-xs text-text-secondary italic">No session notes recorded.</p>
                                            )}
                                          </div>

                                          {/* Report */}
                                          <div>
                                            <h5 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-1">
                                              <FileText className="w-4 h-4 text-primary" /> Report
                                            </h5>
                                            {detail.sessionNote?.report ? (
                                              <p className="text-sm text-text-secondary bg-green-50 p-3 rounded-xl border border-green-200">
                                                {detail.sessionNote.report}
                                              </p>
                                            ) : (
                                              <div className="space-y-2">
                                                <textarea
                                                  value={reportText}
                                                  onChange={(e) => setReportText(e.target.value)}
                                                  placeholder="Write a session report..."
                                                  rows={3}
                                                  className="input-field text-sm resize-none"
                                                />
                                                <button
                                                  onClick={() => handleSaveReport(aptId, selectedPatient?._id)}
                                                  disabled={savingReport}
                                                  className="btn-primary text-sm flex items-center gap-1 !py-2"
                                                >
                                                  {savingReport ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                                  Save Report
                                                </button>
                                              </div>
                                            )}
                                          </div>

                                          {/* Questionnaire Responses */}
                                          <div className="pt-4 border-t border-gray-100">
                                            <h5 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1">
                                              <ClipboardList className="w-4 h-4 text-primary" /> Questionnaire Responses
                                            </h5>
                                            {detail.questionnaireResponses?.length > 0 ? (
                                              <div className="space-y-3">
                                                {detail.questionnaireResponses.map((qr, qi) => (
                                                  <div key={qi} className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                                    <div className="flex items-center justify-between mb-3">
                                                      <div>
                                                        <p className="text-sm font-bold text-purple-700">{qr.template?.title || 'Questionnaire'}</p>
                                                        {qr.template?.diseaseName && (
                                                          <span className="text-xs text-purple-500">{qr.template.diseaseName}</span>
                                                        )}
                                                      </div>
                                                      {qr.totalScore > 0 && (
                                                        <span className="text-sm font-bold bg-purple-100 text-purple-700 px-3 py-1 rounded-lg">
                                                          Score: {qr.totalScore}
                                                        </span>
                                                      )}
                                                    </div>
                                                    <div className="space-y-2">
                                                      {(qr.responses || []).map((r, ri) => (
                                                        <div key={ri} className="bg-white p-3 rounded-lg border border-purple-100">
                                                          <p className="text-xs text-text-secondary mb-1">{r.questionText}</p>
                                                          <p className="text-sm font-medium text-text-primary break-words">
                                                            {r.type === 'image' && typeof r.answer === 'string' && r.answer.startsWith('http') ? (
                                                              <a href={r.answer} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                                                                View Uploaded Image
                                                              </a>
                                                            ) : r.answer}
                                                          </p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            ) : (
                                              <p className="text-sm text-text-secondary italic">No questionnaires submitted for this session.</p>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-sm text-text-secondary italic text-center py-4">No details available</p>
                                      )}
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })}
                        </tbody>
                      </table>
                      {(!patientDetail?.appointments || patientDetail.appointments.length === 0) && (
                        <p className="text-center py-8 text-text-secondary text-sm">No appointment history found</p>
                      )}
                    </div>
                  </div>

                  {/* Clinical Session Notes */}
                  <div className="card">
                    <h3 className="font-display font-bold text-lg text-text-primary mb-5">Clinical Session Notes</h3>
                    <div className="space-y-3">
                      {(patientDetail?.sessionNotes || []).map((note, i) => (
                        <div key={note._id || i} className="p-4 rounded-2xl border border-gray-100 hover:border-primary/20 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold text-text-primary">
                              {new Date(note.createdAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${getRiskBadge(note.riskLevel)}`}>
                              {note.progressStatus || 'Initial'}
                            </span>
                          </div>
                          {note.sessionDescription && (
                            <p className="text-sm text-text-secondary leading-relaxed mb-1">{note.sessionDescription}</p>
                          )}
                          {note.assessment && <p className="text-sm text-text-secondary leading-relaxed mb-1">{note.assessment}</p>}
                          {note.plan && <p className="text-sm text-text-secondary leading-relaxed">{note.plan}</p>}
                        </div>
                      ))}
                      {(!patientDetail?.sessionNotes || patientDetail.sessionNotes.length === 0) && (
                        <p className="text-center py-8 text-text-secondary text-sm">No clinical notes yet</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patients.map((patient) => (
                <motion.div
                  key={patient._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="card group hover:-translate-y-1 cursor-pointer"
                  onClick={() => handleSelectPatient(patient)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
                      {patient.profilePic ? (
                        <img src={patient.profilePic} alt={patient.name} className="w-full h-full object-cover" />
                      ) : '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary truncate group-hover:text-primary transition-colors">{patient.name}</p>
                      <p className="text-xs text-text-secondary">{patient.gender || ''} • {patient.sessions || 0} sessions</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${getRiskBadge(patient.riskLevel)}`}>
                      {patient.riskLevel === 'high' && <AlertTriangle className="w-3 h-3 inline mr-0.5" />}
                      {patient.riskLevel || 'low'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-50 mb-3">
                    <p className="text-xs text-text-secondary mb-1">Diagnosis</p>
                    <p className="text-sm font-medium text-text-primary truncate">{patient.diagnosis || 'Not assessed yet'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {getTrendIcon(patient.moodTrend)}
                      <span className="text-sm font-semibold text-text-primary">{patient.moodScore != null ? `${patient.moodScore}/10` : '—'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              {patients.length === 0 && (
                <div className="col-span-full text-center py-16 text-text-secondary">No patients found</div>
              )}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
};

export default AdminPatients;