import { useState } from 'react';
import { X, Navigation, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import toast from 'react-hot-toast';

const URGENCY_STYLES = {
  critical: { bg: '#fee2e2', text: '#dc2626', label: '🔴 CRITICAL' },
  urgent:   { bg: '#fef3c7', text: '#d97706', label: '🟠 URGENT' },
  planned:  { bg: '#c8eee8', text: '#0d7377', label: '🟢 PLANNED' },
};

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export default function BloodSOSModal({ request, onClose }) {
  const [phase, setPhase] = useState('ask'); // ask | confirmed | arrived
  const { patient, firebaseUser } = usePatientAuth();
  const urg = URGENCY_STYLES[request?.urgencyLevel] || URGENCY_STYLES.urgent;

  async function handleDonate() {
    try {
      const token = await firebaseUser?.getIdToken();
      await axios.patch(`${API}/api/blood-requests/${request.requestId}/respond`, {
        userId: patient?._id,
        userName: patient?.name,
        userPhone: patient?.phone,
        userBloodGroup: patient?.bloodGroup,
        etaMinutes: 15,
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Open OpenStreetMap directions
      const url = `https://www.openstreetmap.org/directions?from=${patient?.location?.lat || ''},${patient?.location?.lng || ''}&to=${request.hospitalLocation?.lat},${request.hospitalLocation?.lng}`;
      window.open(url, '_blank');
      setPhase('confirmed');
    } catch {
      toast.error('Could not confirm donation. Try again.');
    }
  }

  async function handleArrived() {
    try {
      const token = await firebaseUser?.getIdToken();
      await axios.patch(`${API}/api/blood-requests/${request.requestId}/arrived`, {
        userId: patient?._id,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setPhase('arrived');
      toast.success('Arrival confirmed! Thank you for saving a life! ❤️');
    } catch {
      toast.error('Could not confirm arrival. Try again.');
    }
  }

  if (!request) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(16,10,80,0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
        {/* Urgency banner */}
        <div className="px-6 py-4 text-center text-lg font-black tracking-wide"
          style={{ background: urg.bg, color: urg.text }}>
          {urg.label} — BLOOD REQUIRED
        </div>

        <div className="p-6">
          {phase === 'ask' && (
            <>
              {/* Blood group circle */}
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-lg"
                  style={{ background: 'linear-gradient(135deg, #6060C0, #4EB0C8)' }}>
                  {request.bloodGroup}
                </div>
              </div>

              <h2 className="text-center text-xl font-bold mb-1" style={{ color: '#100A50' }}>Blood Donation Needed</h2>
              <p className="text-center text-sm text-gray-500 mb-4">{request.hospitalName}</p>

              <div className="rounded-xl p-4 mb-5 space-y-2" style={{ background: 'rgba(200,238,232,0.3)' }}>
                <InfoRow label="Distance" value={`${request.distance} km away`} />
                <InfoRow label="Units Needed" value={`${request.unitsNeeded} unit(s)`} />
                <InfoRow label="Department" value={request.department || 'Not specified'} />
              </div>

              <div className="flex flex-col gap-3">
                <button onClick={handleDonate}
                  className="w-full py-3 rounded-full text-white font-bold text-base transition-all hover:opacity-90"
                  style={{ background: '#5EC4C4' }}>
                  ❤️ I'll Donate
                </button>
                <button onClick={onClose}
                  className="w-full py-3 rounded-full font-semibold text-sm border-2 transition-all hover:bg-gray-50"
                  style={{ borderColor: '#6060C0', color: '#6060C0' }}>
                  Can't Help Now
                </button>
              </div>
            </>
          )}

          {phase === 'confirmed' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#c8eee8' }}>
                <Navigation size={32} style={{ color: '#0d7377' }} />
              </div>
              <h3 className="text-lg font-bold mb-2" style={{ color: '#100A50' }}>
                You're on your way to {request.hospitalName}
              </h3>
              <p className="text-gray-500 text-sm mb-6">Thank you for saving a life! 💙</p>
              <button onClick={handleArrived}
                className="w-full py-3 rounded-full text-white font-bold transition-all hover:opacity-90"
                style={{ background: '#6060C0' }}>
                I'm at the Hospital
              </button>
            </div>
          )}

          {phase === 'arrived' && (
            <div className="text-center py-4">
              <CheckCircle size={64} className="mx-auto mb-4" style={{ color: '#5EC4C4' }} />
              <h3 className="text-lg font-bold mb-2" style={{ color: '#100A50' }}>Arrival Confirmed!</h3>
              <p className="text-sm text-gray-500 mb-4">The hospital team will contact you shortly.</p>
              <button onClick={onClose} className="text-sm underline text-gray-400">Close</button>
            </div>
          )}
        </div>

        {phase === 'ask' && (
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 rounded-full text-gray-400 hover:text-gray-600 bg-white">
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold" style={{ color: '#100A50' }}>{value}</span>
    </div>
  );
}
