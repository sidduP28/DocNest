import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { PatientAuthProvider } from './context/PatientAuthContext';
import { HospitalAuthProvider } from './context/HospitalAuthContext';
import { SocketProvider } from './context/SocketContext';
import { PatientProtectedRoute, HospitalProtectedRoute } from './components/shared/ProtectedRoute';
import AdminPanel from './pages/AdminPanel';
import SymptomChecker from './components/patient/SymptomChecker';

// ----- Patient pages -----
import LandingPage           from './pages/patient/LandingPage';
import PatientLogin          from './pages/patient/PatientLogin';
import PatientRegister       from './pages/patient/PatientRegister';
import PatientDashboard      from './pages/patient/PatientDashboard';
import HospitalMap           from './pages/patient/HospitalMap';
import HospitalDetail        from './pages/patient/HospitalDetail';
import PriceComparison       from './pages/patient/PriceComparison';
import BookAppointment       from './pages/patient/BookAppointment';
import AppointmentConfirmation from './pages/patient/AppointmentConfirmation';

// ----- Hospital pages -----
import HospitalRegister      from './pages/hospital/HospitalRegister';
import HospitalLogin         from './pages/hospital/HospitalLogin';
import HospitalDashboard     from './pages/hospital/HospitalDashboard';
import ManageDoctors         from './pages/hospital/ManageDoctors';
import RaiseBloodRequest     from './pages/hospital/RaiseBloodRequest';
import VerifyBloodRequest    from './pages/hospital/VerifyBloodRequest';
import ManageAppointments    from './pages/hospital/ManageAppointments';
import DoctorEmergency       from './pages/hospital/DoctorEmergency';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f8fafc' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="spinner" />
        <p className="text-sm font-medium" style={{ color: '#6060C0' }}>Loading DocNest…</p>
      </div>
    </div>
  );
}

function GlobalSymptomChecker() {
  const location = useLocation();
  const isHospitalOrAdmin = location.pathname.startsWith('/hospital') || location.pathname.startsWith('/admin');
  if (isHospitalOrAdmin) return null;
  return <SymptomChecker />;
}

export default function App() {
  return (
    <BrowserRouter>
      <SocketProvider>
        <PatientAuthProvider>
          <HospitalAuthProvider>
            {/* Global toast notifications */}
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  borderRadius: '12px',
                  background: '#100A50',
                  color: '#ffffff',
                  fontSize: '14px',
                  fontWeight: 500,
                  padding: '12px 16px',
                },
                success: { iconTheme: { primary: '#5EC4C4', secondary: '#fff' } },
                error:   { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
              }}
            />

            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                {/* ── Patient routes ──────────────────────── */}
                <Route path="/admin"      element={<AdminPanel />} />
                <Route path="/"           element={<LandingPage />} />
                <Route path="/login"      element={<PatientLogin />} />
                <Route path="/register"   element={<PatientRegister />} />

                <Route path="/dashboard"  element={<PatientProtectedRoute><PatientDashboard /></PatientProtectedRoute>} />
                <Route path="/hospitals"  element={<PatientProtectedRoute><HospitalMap /></PatientProtectedRoute>} />
                <Route path="/hospitals/:id" element={<PatientProtectedRoute><HospitalDetail /></PatientProtectedRoute>} />
                <Route path="/hospitals/:id/book" element={<PatientProtectedRoute><BookAppointment /></PatientProtectedRoute>} />
                <Route path="/booking/confirmed"  element={<PatientProtectedRoute><AppointmentConfirmation /></PatientProtectedRoute>} />
                <Route path="/compare"    element={<PatientProtectedRoute><PriceComparison /></PatientProtectedRoute>} />

                {/* ── Hospital routes ──────────────────────── */}
                <Route path="/hospital/register" element={<HospitalRegister />} />
                <Route path="/hospital/login"    element={<HospitalLogin />} />

                <Route path="/hospital/dashboard"    element={<HospitalProtectedRoute><HospitalDashboard /></HospitalProtectedRoute>} />
                <Route path="/hospital/doctors"      element={<HospitalProtectedRoute><ManageDoctors /></HospitalProtectedRoute>} />
                <Route path="/hospital/blood/raise"  element={<HospitalProtectedRoute><RaiseBloodRequest /></HospitalProtectedRoute>} />
                <Route path="/hospital/blood/verify" element={<HospitalProtectedRoute><VerifyBloodRequest /></HospitalProtectedRoute>} />
                <Route path="/hospital/appointments" element={<HospitalProtectedRoute><ManageAppointments /></HospitalProtectedRoute>} />
                <Route path="/hospital/emergency"    element={<HospitalProtectedRoute><DoctorEmergency /></HospitalProtectedRoute>} />

                {/* ── Fallback ─────────────────────────────── */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
            <GlobalSymptomChecker />
          </HospitalAuthProvider>
        </PatientAuthProvider>
      </SocketProvider>
    </BrowserRouter>
  );
}
