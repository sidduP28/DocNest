import { CheckSquare } from 'lucide-react';
import axios from 'axios';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

const STATUS_STYLES = {
  booked:      { bg: '#ede9fe', text: '#5b21b6' },
  confirmed:   { bg: '#dbeafe', text: '#1d4ed8' },
  rescheduled: { bg: '#fef3c7', text: '#92400e' },
  cancelled:   { bg: '#fee2e2', text: '#dc2626' },
  completed:   { bg: '#dcfce7', text: '#166534' },
};

const CONFLICT_STYLES = {
  unaffected:  null,
  notified:    { bg: '#fef9c3', text: '#854d0e', label: 'Notified' },
  rescheduled: { bg: '#e0f2fe', text: '#0369a1', label: 'Rescheduled' },
  switched:    { bg: '#ede9fe', text: '#7c3aed', label: 'Switched Doctor' },
  cancelled:   { bg: '#fee2e2', text: '#dc2626', label: 'Cancelled' },
  waiting:     { bg: '#fef3c7', text: '#d97706', label: 'Waiting' },
};

export default function AppointmentRow({ appt, onUpdate }) {
  const { getToken } = useHospitalAuth();
  const statusSt = STATUS_STYLES[appt.status] || STATUS_STYLES.booked;
  const conflictSt = CONFLICT_STYLES[appt.conflictStatus];

  async function markComplete() {
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/appointments/${appt._id}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Appointment marked complete');
      onUpdate?.();
    } catch { toast.error('Failed to update'); }
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border bg-white" style={{ borderColor: '#C8EEE8' }}>
      {/* Time */}
      <div className="w-16 text-center shrink-0">
        <p className="text-sm font-bold" style={{ color: '#100A50' }}>{appt.slotLabel}</p>
      </div>

      {/* Patient + doctor */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold truncate" style={{ color: '#100A50' }}>{appt.bookingType === 'offline' ? appt.offlinePatientName : appt.userName}</p>
          {appt.bookingType === 'offline' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md font-bold bg-amber-100 text-amber-700">WALK-IN</span>
          )}
        </div>
        <p className="text-xs text-gray-400 truncate">{appt.doctorName} — {appt.specialty}</p>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {appt.checkedIn && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#dcfce7', color: '#166534' }}>
            ✓ Checked In
          </span>
        )}
        {conflictSt && (
          <span className="text-xs px-2 py-0.5 rounded-full font-medium border"
            style={{ background: conflictSt.bg, color: conflictSt.text, borderColor: conflictSt.text + '40' }}>
            ⚠ {conflictSt.label}
          </span>
        )}
        <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
          style={{ background: statusSt.bg, color: statusSt.text }}>
          {appt.status}
        </span>
        {appt.status !== 'completed' && appt.status !== 'cancelled' && (
          <button onClick={markComplete} className="text-xs px-2 py-1 rounded-full text-white font-medium hover:opacity-90"
            style={{ background: '#4EB0C8' }}>
            <CheckSquare size={12} className="inline mr-1" />Done
          </button>
        )}
      </div>
    </div>
  );
}
