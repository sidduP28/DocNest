import { Droplets, Clock, Users } from 'lucide-react';

const URGENCY_STYLES = {
  critical: { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
  urgent:   { bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
  planned:  { bg: '#c8eee8', text: '#0d7377', border: '#80d5ce' },
};

const STATUS_STYLES = {
  pending_verification: { label: '⏳ Awaiting Verification', bg: '#f1f5f9', text: '#475569' },
  active:    { label: '📡 Active', bg: '#ede9fe', text: '#5b21b6' },
  donors_responding: { label: '🚀 Donors Responding', bg: '#dcfce7', text: '#166534' },
  fulfilled: { label: '✓ Fulfilled', bg: '#c8eee8', text: '#0d7377' },
  expired:   { label: '⏰ Expired', bg: '#f1f5f9', text: '#9ca3af' },
};

export default function BloodRequestCard({ request }) {
  const urg = URGENCY_STYLES[request.urgencyLevel] || URGENCY_STYLES.urgent;
  const statusSt = STATUS_STYLES[request.status] || STATUS_STYLES.pending_verification;

  return (
    <div className="bg-white rounded-xl border p-4" style={{ borderColor: '#C8EEE8' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-lg"
            style={{ background: 'linear-gradient(135deg, #dc2626, #ef4444)' }}>
            {request.bloodGroupNeeded}
          </div>
          <div>
            <p className="font-bold text-sm" style={{ color: '#100A50' }}>
              {request.unitsNeeded} unit(s) of {request.bloodGroupNeeded}
            </p>
            <p className="text-xs text-gray-500">{request.department}</p>
          </div>
        </div>
        <span className="text-xs px-2.5 py-1 rounded-full font-semibold border capitalize"
          style={{ background: urg.bg, color: urg.text, borderColor: urg.border }}>
          {request.urgencyLevel}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400 mb-3">
        <span className="flex items-center gap-1"><Clock size={11} />{new Date(request.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        <span className="flex items-center gap-1"><Users size={11} />{request.respondingDonors?.length || 0} responding</span>
      </div>

      <span className="text-xs px-2.5 py-1 rounded-full font-medium"
        style={{ background: statusSt.bg, color: statusSt.text }}>
        {statusSt.label}
      </span>

      {request.verificationCode && request.status === 'pending_verification' && (
        <div className="mt-3 p-3 rounded-lg text-center border" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
          <p className="text-xs text-blue-500 mb-1">Verification Code</p>
          <p className="text-xl font-black" style={{ color: '#100A50' }}>{request.verificationCode}</p>
        </div>
      )}
    </div>
  );
}
