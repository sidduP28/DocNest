import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePatientAuth } from '../../context/PatientAuthContext';
import WaitTimeBadge from './WaitTimeBadge';
import toast from 'react-hot-toast';

export default function DoctorSlotPicker({ doctor, hospitalId, hospitalName, hospital, waitInfo }) {
  const [selectedSlot, setSelectedSlot] = useState(null);
  const { patient } = usePatientAuth();
  const navigate = useNavigate();

  const isEmergency = doctor.availabilityStatus === 'emergency';
  const isOffDuty = doctor.availabilityStatus === 'off_duty';
  const isUnavailable = isEmergency || isOffDuty;

  function handleSlotClick(slot) {
    if (slot.isBooked || slot.isBlocked || isUnavailable) return;
    setSelectedSlot(slot._id === selectedSlot?._id ? null : slot);
  }

  function handleConfirm() {
    if (!selectedSlot) return;
    navigate(`/hospitals/${hospitalId}/book`, {
      state: {
        hospital, doctor,
        slot: selectedSlot.time,
        slotId: selectedSlot._id,
      },
    });
  }

  return (
    <div className="bg-white rounded-xl border p-4 card-hover" style={{ borderColor: '#C8EEE8' }}>
      {/* Doctor info header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-lg"
          style={{ background: 'linear-gradient(135deg, #6060C0, #4EB0C8)' }}>
          {doctor.name.split(' ').map((n) => n[0]).slice(1, 3).join('')}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-sm" style={{ color: '#100A50' }}>{doctor.name}</h4>
            {waitInfo && <WaitTimeBadge estimatedWaitMinutes={waitInfo.estimatedWaitMinutes} waitColor={waitInfo.waitColor} waitLabel={waitInfo.waitLabel} />}
            {isEmergency && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700 border border-red-200">
                🚨 Emergency
              </span>
            )}
            {isOffDuty && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-600">
                Off Duty
              </span>
            )}
            {!isUnavailable && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#dcfce7', color: '#166534' }}>
                ✓ Available
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{doctor.specialty} — {doctor.qualification}</p>
        </div>
      </div>

      {/* Emergency overlay message */}
      {isUnavailable && (
        <div className="rounded-lg p-3 mb-4 text-sm font-medium text-center border"
          style={{ background: '#fef2f2', borderColor: '#fca5a5', color: '#dc2626' }}>
          {isEmergency ? '🚨 Doctor in Emergency — Slot booking unavailable' : '🔴 Doctor Off Duty Today'}
          {doctor.estimatedReturnTime && (
            <p className="text-xs text-red-500 mt-1 font-normal">
              Expected return: {new Date(doctor.estimatedReturnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      )}

      {/* Slots grid */}
      <div className="relative">
        {isUnavailable && (
          <div className="absolute inset-0 bg-white bg-opacity-75 rounded-lg z-10 flex items-center justify-center">
            <span className="text-sm text-gray-400 font-medium">Slots unavailable</span>
          </div>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {doctor.slots?.filter(s => !s.isBooked && !s.isBlocked).map((slot) => (
            <button
              key={slot._id}
              onClick={() => handleSlotClick(slot)}
              disabled={isUnavailable}
              className={`slot-pill ${
                selectedSlot?._id === slot._id ? 'selected' : 'available'
              }`}
            >
              {slot.time}
            </button>
          ))}
          {(!doctor.slots || doctor.slots.filter(s => !s.isBooked && !s.isBlocked).length === 0) && (
            <p className="text-xs text-gray-400">
              No slots available for Dr. {doctor.name} today. Please check back later or choose another doctor.
            </p>
          )}
        </div>
        {!isUnavailable && doctor.slots && doctor.slots.length > 0 && (
          <p className="text-[10px] text-gray-400 mt-2 italic">
            Only available slots are shown. Booked and blocked slots are hidden.
          </p>
        )}
      </div>

      {/* Booking summary panel */}
      {selectedSlot && !isUnavailable && (
        <div className="animate-fadeIn rounded-xl p-4 border mt-2"
          style={{ background: 'rgba(200,238,232,0.3)', borderColor: '#A8E4DC' }}>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#4EB0C8' }}>Booking Summary</p>
          <div className="space-y-1 text-sm mb-3" style={{ color: '#100A50' }}>
            <div className="flex justify-between"><span className="text-gray-500">Hospital</span><span className="font-medium">{hospitalName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Doctor</span><span className="font-medium">{doctor.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Specialty</span><span className="font-medium">{doctor.specialty}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Time</span><span className="font-bold" style={{ color: '#6060C0' }}>{selectedSlot.time}</span></div>
          </div>
          <button
            onClick={handleConfirm}
            className="w-full py-2.5 rounded-full text-white font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02]"
            style={{ background: '#6060C0' }}>
            Confirm Booking →
          </button>
        </div>
      )}
    </div>
  );
}
