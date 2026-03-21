import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const hasCompletedMandatoryProfile = (u) => {
    if (!u) return false;
    const hasPhone = typeof u.phone === 'string' && u.phone.trim().length >= 10;
    const hasProfilePic = typeof u.profilePic === 'string' && u.profilePic.trim().length > 5;
    const hasGender = ['Male', 'Female', 'Other'].includes(u.gender);
    return hasPhone && hasProfilePic && hasGender;
  };

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Force complete-profile for any user missing mandatory profile fields.
  if (!hasCompletedMandatoryProfile(user) && location.pathname !== '/complete-profile') {
    return <Navigate to="/complete-profile" replace />;
  }

  return children;
};

export default ProtectedRoute;
