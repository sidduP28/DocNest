import { Navigate } from 'react-router-dom';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { useHospitalAuth } from '../../context/HospitalAuthContext';

export function PatientProtectedRoute({ children }) {
  const { patient, firebaseUser, loading } = usePatientAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-sm" style={{ color: '#6060C0' }}>Loading DocNest…</p>
        </div>
      </div>
    );
  }
  
  if (!firebaseUser) return <Navigate to="/login" replace />;
  
  if (firebaseUser && !patient) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ background: '#f8fafc' }}>
        <h2 className="text-xl font-bold mb-2">Almost there!</h2>
        <p className="text-gray-500 mb-4 text-sm max-w-sm">We securely verified your account, but couldn't fetch your profile right now (servers might be waking up).</p>
        <button onClick={() => window.location.reload()} className="px-6 py-2 rounded-full text-white font-bold" style={{ background: '#4EB0C8' }}>
          Reload Page
        </button>
      </div>
    );
  }

  return children;
}

export function HospitalProtectedRoute({ children }) {
  const { hospital, loading } = useHospitalAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-sm" style={{ color: '#6060C0' }}>Loading Portal…</p>
        </div>
      </div>
    );
  }
  if (!hospital) return <Navigate to="/hospital/login" replace />;
  return children;
}
