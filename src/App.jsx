import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import About from './pages/About';
import Services from './pages/Services';
import Contact from './pages/Contact';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import ForgotPassword from './pages/ForgotPassword';
import CompleteProfile from './pages/CompleteProfile';
import PatientDashboard from './pages/patient/Dashboard';
import BookAppointment from './pages/patient/BookAppointment';
import PatientSessions from './pages/patient/Sessions';
import MoodJournal from './pages/patient/MoodJournal';
import PatientMessages from './pages/patient/Messages';
import PatientSettings from './pages/patient/Settings';
import AdminDashboard from './pages/admin/Dashboard';
import AdminPatients from './pages/admin/Patients';
import AdminCalendar from './pages/admin/Calendar';
import AdminAnalytics from './pages/admin/Analytics';
import AdminMessages from './pages/admin/Messages';
import AdminSettings from './pages/admin/Settings';
import AdminQuestionnaires from './pages/admin/Questionnaires';
import VideoSession from './pages/VideoSession';
import VerifyOTP from './pages/VerifyOTP';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: { borderRadius: '16px', background: '#333', color: '#fff', fontSize: '14px' },
          }}
        />
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-otp" element={<VerifyOTP />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />

          {/* Complete Profile (post-registration) */}
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* Patient Routes */}
          <Route path="/patient/dashboard" element={
            <ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>
          } />
          <Route path="/patient/sessions" element={
            <ProtectedRoute allowedRoles={['patient']}><PatientSessions /></ProtectedRoute>
          } />
          <Route path="/patient/book" element={
            <ProtectedRoute allowedRoles={['patient']}><BookAppointment /></ProtectedRoute>
          } />
          <Route path="/patient/journal" element={
            <ProtectedRoute allowedRoles={['patient']}><MoodJournal /></ProtectedRoute>
          } />
          <Route path="/patient/messages" element={
            <ProtectedRoute allowedRoles={['patient']}><PatientMessages /></ProtectedRoute>
          } />
          <Route path="/patient/settings" element={
            <ProtectedRoute allowedRoles={['patient']}><PatientSettings /></ProtectedRoute>
          } />

          {/* Admin/Doctor Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/admin/patients" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin']}><AdminPatients /></ProtectedRoute>
          } />
          <Route path="/admin/calendar" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin']}><AdminCalendar /></ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin']}><AdminAnalytics /></ProtectedRoute>
          } />
          <Route path="/admin/messages" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin']}><AdminMessages /></ProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin']}><AdminSettings /></ProtectedRoute>
          } />
          <Route path="/admin/questionnaires" element={
            <ProtectedRoute allowedRoles={['doctor', 'admin']}><AdminQuestionnaires /></ProtectedRoute>
          } />

          {/* Session — accessible by both roles */}
          <Route path="/session/:id" element={
            <ProtectedRoute allowedRoles={['patient', 'doctor', 'admin']}><VideoSession /></ProtectedRoute>
          } />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;