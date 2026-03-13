import { useState } from 'react';
import axios from 'axios';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import toast from 'react-hot-toast';
import WaitTimeBadge from '../patient/WaitTimeBadge';

const STATUS_STYLES = {
  available:  { bg: '#dcfce7', text: '#166534', label: '✓ Available' },
  emergency:  { bg: '#fee2e2', text: '#dc2626', label: '🚨 Emergency' },
  off_duty:   { bg: '#f1f5f9', text: '#475569', label: '⚫ Off Duty' },
};

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';
const REASONS = ['Called to surgery', 'Left premises', 'Personal emergency'];

export default function DoctorCard({ doctor, hospitalId, onUpdate }) {
  const { getToken, hospital } = useHospitalAuth();
  const [showEmergencyPanel, setShowEmergencyPanel] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);
  const [returnTime, setReturnTime] = useState('');
  const [loading, setLoading] = useState(false);
  const st = STATUS_STYLES[doctor.availabilityStatus] || STATUS_STYLES.available;

  async function markEmergency() {
    setLoading(true);
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/hospitals/${hospitalId}/doctors/${doctor._id}/emergency`,
        { reason, estimatedReturnTime: returnTime || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${doctor.name} marked as in emergency. Patients notified.`);
      setShowEmergencyPanel(false);
      onUpdate?.();
    } catch { toast.error('Failed to update status'); }
    setLoading(false);
  }

  async function markAvailable() {
    setLoading(true);
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/hospitals/${hospitalId}/doctors/${doctor._id}/available`, {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`${doctor.name} is now available`);
      onUpdate?.();
    } catch { toast.error('Failed to update status'); }
    setLoading(false);
  }

  return (
    <div className="bg-white rounded-xl border p-4 card-hover" style={{ borderColor: '#C8EEE8' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0"
            style={{ background: 'linear-gradient(135deg, #6060C0, #4EB0C8)' }}>
            {doctor.name.split(' ').map((n) => n[0]).slice(1, 3).join('')}
          </div>
          <div>
            <h4 className="font-bold text-sm" style={{ color: '#100A50' }}>{doctor.name}</h4>
            <p className="text-xs text-gray-500">{doctor.specialty} — {doctor.qualification}</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold shrink-0"
          style={{ background: st.bg, color: st.text }}>
          {st.label}
        </span>
      </div>

      {/* Slot summary */}
      <p className="text-xs text-gray-400 mb-3">
        {doctor.slots?.filter((s) => !s.isBooked).length || 0} / {doctor.slots?.length || 0} slots available
      </p>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        {doctor.availabilityStatus !== 'emergency' ? (
          <button onClick={() => setShowEmergencyPanel((v) => !v)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full font-semibold border-2 border-red-300 text-red-600 hover:bg-red-50 transition-all">
            🚨 Mark Emergency
          </button>
        ) : (
          <button onClick={markAvailable} disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full font-semibold text-white transition-all"
            style={{ background: '#5EC4C4' }}>
            ✓ Doctor Available Again
          </button>
        )}
      </div>

      {/* Emergency inline panel */}
      {showEmergencyPanel && (
        <div className="mt-3 p-3 rounded-xl border animate-fadeIn" style={{ background: '#fff0f0', borderColor: '#fca5a5' }}>
          <p className="text-xs font-bold text-red-600 mb-2">Mark Emergency</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)}
            className="w-full text-xs border rounded-lg p-2 mb-2" style={{ borderColor: '#fca5a5' }}>
            {REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <label className="text-xs text-gray-500 block mb-1">Estimated return (optional)</label>
          <input type="datetime-local" value={returnTime} onChange={(e) => setReturnTime(e.target.value)}
            className="w-full text-xs border rounded-lg p-2 mb-3" style={{ borderColor: '#fca5a5' }} />
          <div className="flex gap-2">
            <button onClick={markEmergency} disabled={loading}
              className="flex-1 py-2 rounded-full text-white text-xs font-bold bg-red-500">
              {loading ? 'Saving…' : 'Confirm'}
            </button>
            <button onClick={() => setShowEmergencyPanel(false)}
              className="flex-1 py-2 rounded-full text-xs border border-gray-300 text-gray-500">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
