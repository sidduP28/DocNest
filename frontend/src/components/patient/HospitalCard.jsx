import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock, Building2 } from 'lucide-react';
import WaitTimeBadge from './WaitTimeBadge';

const TYPE_COLORS = {
  Government: { bg: '#dcfce7', text: '#166534' },
  Private:    { bg: '#ede9fe', text: '#5b21b6' },
  Clinic:     { bg: '#dbeafe', text: '#1d4ed8' },
  'Diagnostic Lab': { bg: '#fef3c7', text: '#92400e' },
};

export default function HospitalCard({ hospital, userLat, userLng }) {
  const navigate = useNavigate();
  const typeColor = TYPE_COLORS[hospital.type] || { bg: '#f1f5f9', text: '#475569' };
  const specialties = [...new Set(hospital.doctors?.map((d) => d.specialty))];

  return (
    <div
      className="bg-white rounded-xl border cursor-pointer card-hover p-4"
      style={{ borderColor: '#C8EEE8' }}
      onClick={() => navigate(`/hospitals/${hospital._id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-sm leading-tight" style={{ color: '#100A50' }}>{hospital.name}</h3>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: typeColor.bg, color: typeColor.text }}>
              {hospital.type}
            </span>
            {hospital.verificationStatus === 'verified' && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: '#c8eee8', color: '#0d7377' }}>
                ✓ Verified
              </span>
            )}
          </div>
        </div>
        <WaitTimeBadge estimatedWaitMinutes={hospital.avgWaitMinutes} waitColor={hospital.avgWaitColor} waitLabel={hospital.avgWaitMinutes !== undefined ? `~${hospital.avgWaitMinutes} min` : 'No data'} />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-3 text-sm text-gray-500">
        {hospital.distance !== undefined && (
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-dn-teal-mid" />
            {hospital.distance.toFixed(1)} km
          </span>
        )}
        <span className="flex items-center gap-1">
          <Star size={12} className="text-yellow-400 fill-yellow-400" />
          {hospital.ratings?.toFixed(1)}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} style={{ color: '#4EB0C8' }} />
          Avg wait: {hospital.avgWaitMinutes !== undefined ? `${hospital.avgWaitMinutes} min` : 'N/A'}
        </span>
      </div>

      {/* Specialties */}
      {specialties.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {specialties.slice(0, 4).map((s) => (
            <span key={s} className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(200,238,232,0.5)', color: '#100A50' }}>
              {s}
            </span>
          ))}
          {specialties.length > 4 && (
            <span className="text-xs px-2 py-0.5 rounded-full text-gray-400">
              +{specialties.length - 4} more
            </span>
          )}
        </div>
      )}
    </div>
  );
}
