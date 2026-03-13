import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import PatientNavbar from '../../components/shared/PatientNavbar';
import toast from 'react-hot-toast';
import { Calendar, Clock, User, Building2 } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export default function BookAppointment() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { patient, firebaseUser, getToken } = usePatientAuth();
  const [loading, setLoading] = useState(false);

  const { hospital, doctor, slot, slotId } = state || {};

  if (!hospital || !doctor || !slot) {
    navigate('/hospitals');
    return null;
  }

  async function handleConfirm() {
    setLoading(true);
    try {
      const today = new Date();
      const [time, period] = slot.split(' ');
      const [h, m] = time.split(':');
      let hours = parseInt(h);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      today.setHours(hours, parseInt(m), 0, 0);

      const token = await getToken();
      const res = await axios.post(`${API}/api/appointments`, {
        userId: patient._id,
        userName: patient.name,
        hospitalId: hospital._id,
        hospitalName: hospital.name,
        doctorId: doctor._id,
        doctorName: doctor.name,
        specialty: doctor.specialty,
        slot: today.toISOString(),
        slotLabel: slot,
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success('Appointment booked!');
      navigate('/booking/confirmed', { state: { appointment: res.data, hospital, doctor } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Booking failed. Please try again.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <PatientNavbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-black mb-6" style={{ color: '#100A50' }}>Confirm Booking</h1>

        {/* Booking summary card */}
        <div className="bg-white rounded-2xl border-2 p-6 mb-4 shadow-sm" style={{ borderColor: '#C8EEE8' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#4EB0C8' }}>Appointment Summary</p>
          <div className="space-y-3">
            <Detail icon={Building2} label="Hospital" value={hospital.name} />
            <Detail icon={User} label="Doctor" value={doctor.name} />
            <Detail icon={User} label="Specialty" value={doctor.specialty} />
            <Detail icon={Clock} label="Time Slot" value={slot} highlight />
            <Detail icon={Calendar} label="Date" value={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
          </div>
        </div>

        {/* Patient details */}
        <div className="bg-white rounded-2xl border p-6 mb-6" style={{ borderColor: '#C8EEE8' }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#4EB0C8' }}>Patient Details</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Name</span>
              <span className="font-semibold" style={{ color: '#100A50' }}>{patient?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Phone</span>
              <span className="font-semibold" style={{ color: '#100A50' }}>{patient?.phone || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Confirm button */}
        <button onClick={handleConfirm} disabled={loading}
          className="w-full py-4 rounded-full text-white font-bold text-lg transition-all hover:opacity-90 hover:scale-[1.02] shadow-lg"
          style={{ background: loading ? '#9ca3af' : '#6060C0' }}>
          {loading ? 'Booking…' : '✓ Confirm Booking'}
        </button>

        <p className="text-center text-xs text-gray-400 mt-3">Free cancellation available before your appointment</p>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, label, value, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-400 text-sm">
        <Icon size={14} />
        <span>{label}</span>
      </div>
      <span className={`text-sm font-semibold ${highlight ? 'text-lg font-black' : ''}`}
        style={{ color: highlight ? '#6060C0' : '#100A50' }}>
        {value}
      </span>
    </div>
  );
}
