import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import PatientNavbar from '../../components/shared/PatientNavbar';
import toast from 'react-hot-toast';
import { isToday } from 'date-fns';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export default function AppointmentConfirmation() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { getToken } = usePatientAuth();
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  const { appointment, hospital, doctor } = state || {};
  if (!appointment) { navigate('/dashboard'); return null; }

  const isAppointmentToday = isToday(new Date(appointment.slot));

  async function handleCheckin() {
    setLoading(true);
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/appointments/${appointment._id}/checkin`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCheckedIn(true);
      toast.success('Checked in successfully!');
    } catch { toast.error('Check-in failed'); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <PatientNavbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Success checkmark */}
        <div className="text-center mb-6">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #dcfce7, #a7f3d0)' }}>
            <div className="w-16 h-16 border-4 border-green-500 rounded-full flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black text-green-600">Booking Confirmed!</h1>
          <p className="text-gray-400 text-sm mt-1">Your appointment has been successfully scheduled</p>
        </div>

        {/* Booking reference */}
        <div className="text-center mb-6">
          <p className="text-xs text-gray-400 mb-1 uppercase tracking-widest">Booking Reference</p>
          <div className="inline-block px-8 py-3 rounded-xl border-2 font-black text-2xl tracking-widest"
            style={{ borderColor: '#6060C0', color: '#6060C0', background: 'rgba(96,96,192,0.05)' }}>
            {appointment.bookingRef || 'BKG-XXXXX'}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-2xl border p-5 mb-4 shadow-sm" style={{ borderColor: '#C8EEE8' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#4EB0C8' }}>Details</p>
          <div className="space-y-3 text-sm">
            {[
              ['Hospital', hospital?.name || appointment.hospitalName],
              ['Doctor', doctor?.name || appointment.doctorName],
              ['Specialty', doctor?.specialty || appointment.specialty],
              ['Date', new Date(appointment.slot).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })],
              ['Time', appointment.slotLabel],
              ['Status', appointment.status],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <span className="text-gray-400">{label}</span>
                <span className="font-semibold capitalize" style={{ color: '#100A50' }}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Check In button */}
        {isAppointmentToday && !checkedIn && (
          <button onClick={handleCheckin} disabled={loading}
            className="w-full py-3 rounded-full text-white font-bold text-base mb-3 transition-all hover:opacity-90"
            style={{ background: '#4EB0C8' }}>
            {loading ? 'Checking in…' : '📍 Check In Now'}
          </button>
        )}
        {checkedIn && (
          <div className="w-full py-3 rounded-full text-center font-bold text-base mb-3"
            style={{ background: '#dcfce7', color: '#166534' }}>
            ✓ Checked In Successfully
          </div>
        )}
        {!isAppointmentToday && (
          <p className="text-center text-xs text-gray-400 mb-3">Check-in available on appointment day</p>
        )}

        <button onClick={() => navigate('/dashboard')}
          className="w-full py-3 rounded-full border-2 font-semibold text-sm hover:bg-gray-50 transition-all"
          style={{ borderColor: '#C8EEE8', color: '#100A50' }}>
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
}
