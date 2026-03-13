import { Navigate } from 'react-router-dom';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { useHospitalAuth } from '../../context/HospitalAuthContext';

export function PatientProtectedRoute({ children }) {
  const { patient, loading } = usePatientAuth();
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
  if (!patient) return <Navigate to="/login" replace />;
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
