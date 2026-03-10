import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, Users, Calendar, BarChart3, MessageCircle, Settings,
  Search, AlertTriangle, TrendingUp, TrendingDown, Minus,
  Video, FileText
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import { patientAPI, sessionAPI } from '../../services/api';

const adminLinks = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Patients', path: '/admin/patients', icon: Users },
  { name: 'Calendar', path: '/admin/calendar', icon: Calendar },
  { name: 'Analytics', path: '/admin/analytics', icon: BarChart3 },
  { name: 'Messages', path: '/admin/messages', icon: MessageCircle, badge: '5' },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

const AdminPatients = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRisk, setFilterRisk] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patients, setPatients] = useState([]);
  const [patientDetail, setPatientDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const { data } = await patientAPI.getAll({ search: searchQuery, riskLevel: filterRisk });
      setPatients(data.patients || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery, filterRisk]);

  const handleSelectPatient = async (patient) => {
    setSelectedPatient(patient);
    try {
      const { data } = await patientAPI.getById(patient._id);
      setPatientDetail(data);
    } catch (err) {
      console.error(err);
    }
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
      <Sidebar links={adminLinks} userRole="admin" />

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
              <button onClick={() => { setSelectedPatient(null); setPatientDetail(null); }} className="text-sm text-primary font-medium hover:text-primary-dark flex items-center gap-1">
                ← Back to all patients
              </button>
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Patient Info */}
                <div className="card">
                  <div className="text-center mb-6">
                    <div className="w-20 h-20 rounded-3xl bg-primary-light flex items-center justify-center text-4xl mx-auto mb-4">
                      👤
                    </div>
                    <h3 className="font-display font-bold text-xl text-text-primary">{selectedPatient.name}</h3>
                    <p className="text-sm text-text-secondary">{selectedPatient.gender || ''}</p>
                    <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full font-medium uppercase ${getRiskBadge(selectedPatient.riskLevel)}`}>
                      {selectedPatient.riskLevel || 'low'} risk
                    </span>
                  </div>
                  <div className="space-y-3">
                    <div className="p-3 rounded-xl bg-gray-50">
                      <p className="text-xs text-text-secondary">Diagnosis</p>
                      <p className="text-sm font-medium text-text-primary">{selectedPatient.diagnosis || 'Not assessed yet'}</p>
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

                {/* Session History */}
                <div className="lg:col-span-2 card">
                  <h3 className="font-display font-bold text-lg text-text-primary mb-5">Session History</h3>
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
                        {note.assessment && <p className="text-sm text-text-secondary leading-relaxed mb-1">{note.assessment}</p>}
                        {note.plan && <p className="text-sm text-text-secondary leading-relaxed">{note.plan}</p>}
                      </div>
                    ))}
                    {(!patientDetail?.sessionNotes || patientDetail.sessionNotes.length === 0) && (
                      <p className="text-center py-8 text-text-secondary text-sm">No session notes yet</p>
                    )}
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
                    <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center text-2xl flex-shrink-0">
                      👤
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary truncate">{patient.name}</p>
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
