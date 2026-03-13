import { useState } from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export default function DoctorEmergencyModal({ event, onClose }) {
  const [choice, setChoice] = useState(null); // reschedule | switch | cancel | null
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedNewDoctor, setSelectedNewDoctor] = useState(null);
  const [phase, setPhase] = useState('options'); // options | done
  const [doneMessage, setDoneMessage] = useState('');
  const { patient, firebaseUser } = usePatientAuth();

  if (!event) return null;

  const { doctorName, specialty, affectedAppointmentId, appointmentSlotLabel, checkedIn, alternativeDoctors = [], hospitalName } = event;

  // Generate next 3 available dates
  const nextDates = Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    return d;
  });

  async function getToken() { return firebaseUser?.getIdToken(); }

  async function handleReschedule() {
    if (!selectedSlot || !selectedDate) return toast.error('Select a date and slot');
    try {
      const slot = new Date(selectedDate);
      const [time, period] = selectedSlot.split(' ');
      const [h, m] = time.split(':');
      let hours = parseInt(h);
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      slot.setHours(hours, parseInt(m), 0, 0);
      const token = await getToken();
      await axios.patch(`${API}/api/appointments/${affectedAppointmentId}/reschedule`, {
        slot: slot.toISOString(), slotLabel: selectedSlot,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setDoneMessage(`Rescheduled successfully to ${selectedDate.toDateString()} at ${selectedSlot}`);
      setPhase('done');
    } catch { toast.error('Reschedule failed'); }
  }

  async function handleSwitchDoctor() {
    if (!selectedNewDoctor || !selectedSlot) return toast.error('Select doctor and slot');
    try {
      const slot = new Date();
      const token = await getToken();
      await axios.patch(`${API}/api/appointments/${affectedAppointmentId}/switch-doctor`, {
        doctorId: selectedNewDoctor.id, doctorName: selectedNewDoctor.name,
        slot: slot.toISOString(), slotLabel: selectedSlot,
      }, { headers: { Authorization: `Bearer ${token}` } });
      setDoneMessage(`Switched to ${selectedNewDoctor.name} at ${selectedSlot}`);
      setPhase('done');
    } catch { toast.error('Switch failed'); }
  }

  async function handleCancel() {
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/appointments/${affectedAppointmentId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDoneMessage('Appointment cancelled. Refund will be processed within 24 hours.');
      setPhase('done');
    } catch { toast.error('Cancel failed'); }
  }

  async function handleWait() {
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/appointments/${affectedAppointmentId}/wait`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast('Noted! We will notify you if Dr. ' + doctorName + ' returns.', { icon: '⏳' });
      onClose();
    } catch { onClose(); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(16,10,80,0.85)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b" style={{ borderColor: '#C8EEE8' }}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-bold uppercase tracking-widest mb-1 text-orange-500">⚠️ Doctor Emergency</div>
              <h2 className="text-lg font-bold" style={{ color: '#100A50' }}>
                Dr. {doctorName} is unavailable
              </h2>
              <p className="text-sm text-gray-500">Your appointment at {appointmentSlotLabel} is affected.</p>
              {checkedIn && (
                <p className="text-xs mt-2 p-2 bg-yellow-50 rounded-lg text-yellow-700 border border-yellow-100">
                  You are already at the hospital. Please approach the reception — staff have been notified.
                </p>
              )}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>
        </div>

        <div className="p-6">
          {phase === 'options' && (
            <>
              <p className="text-sm font-semibold mb-4" style={{ color: '#100A50' }}>Choose an option:</p>
              <div className="space-y-3">
                {/* Reschedule */}
                <div className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${choice === 'reschedule' ? 'border-dn-teal-mid' : 'border-gray-200 hover:border-dn-mint-light'}`}
                  style={choice === 'reschedule' ? { borderColor: '#4EB0C8', background: 'rgba(200,238,232,0.2)' } : {}}
                  onClick={() => setChoice(choice === 'reschedule' ? null : 'reschedule')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#100A50' }}>📅 Reschedule with Dr. {doctorName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Pick a new date and time slot</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${choice === 'reschedule' ? 'border-dn-teal-mid bg-dn-teal-mid' : 'border-gray-300'}`}
                      style={choice === 'reschedule' ? { borderColor: '#4EB0C8', background: '#4EB0C8' } : {}} />
                  </div>
                  {choice === 'reschedule' && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-500 mb-2">Select Date:</p>
                      <div className="flex gap-2 mb-3">
                        {nextDates.map((d) => (
                          <button key={d.toDateString()} onClick={(e) => { e.stopPropagation(); setSelectedDate(d); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${selectedDate?.toDateString() === d.toDateString() ? 'text-white' : 'border-gray-200 text-gray-600'}`}
                            style={selectedDate?.toDateString() === d.toDateString() ? { background: '#6060C0', borderColor: '#6060C0', color: 'white' } : {}}>
                            {d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </button>
                        ))}
                      </div>
                      {selectedDate && (
                        <>
                          <p className="text-xs text-gray-500 mb-2">Select Slot:</p>
                          <div className="flex flex-wrap gap-2">
                            {['09:00 AM','10:00 AM','11:00 AM','02:00 PM','03:00 PM'].map((t) => (
                              <button key={t} onClick={(e) => { e.stopPropagation(); setSelectedSlot(t); }}
                                className={`slot-pill ${selectedSlot === t ? 'selected' : 'available'}`}>
                                {t}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                      {selectedDate && selectedSlot && (
                        <button onClick={(e) => { e.stopPropagation(); handleReschedule(); }}
                          className="mt-3 w-full py-2 rounded-full text-white text-sm font-semibold" style={{ background: '#4EB0C8' }}>
                          Confirm Reschedule
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Switch Doctor */}
                <div className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${choice === 'switch' ? '' : 'border-gray-200 hover:border-dn-mint-light'}`}
                  style={choice === 'switch' ? { borderColor: '#6060C0', background: 'rgba(96,96,192,0.05)' } : {}}
                  onClick={() => setChoice(choice === 'switch' ? null : 'switch')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm" style={{ color: '#100A50' }}>🔄 See other {specialty} doctors</p>
                      <p className="text-xs text-gray-500">Available now at {hospitalName}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${choice === 'switch' ? 'bg-dn-indigo-deep' : 'border-gray-300'}`}
                      style={choice === 'switch' ? { borderColor: '#6060C0', background: '#6060C0' } : { borderColor: '#d1d5db' }} />
                  </div>
                  {choice === 'switch' && (
                    <div className="mt-3 space-y-2">
                      {alternativeDoctors.length === 0 ? (
                        <p className="text-xs text-gray-400">No other {specialty} doctors available right now.</p>
                      ) : alternativeDoctors.map((d) => (
                        <div key={d.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedNewDoctor?.id === d.id ? '' : 'border-gray-200'}`}
                          style={selectedNewDoctor?.id === d.id ? { borderColor: '#6060C0', background: 'rgba(96,96,192,0.08)' } : {}}
                          onClick={(e) => { e.stopPropagation(); setSelectedNewDoctor(d); }}>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold" style={{ color: '#100A50' }}>{d.name}</p>
                            {d.isBackup && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#c8eee8', color: '#0d7377' }}>Recommended</span>}
                          </div>
                          {d.nextSlot && <p className="text-xs text-gray-500 mt-0.5">Next slot: {d.nextSlot}</p>}
                        </div>
                      ))}
                      {selectedNewDoctor && (
                        <button onClick={(e) => { e.stopPropagation(); setSelectedSlot(selectedNewDoctor.nextSlot); handleSwitchDoctor(); }}
                          className="w-full py-2 rounded-full text-white text-sm font-semibold mt-2" style={{ background: '#6060C0' }}>
                          Switch to {selectedNewDoctor.name}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Cancel */}
                <div className={`rounded-xl border-2 p-4 cursor-pointer transition-all ${choice === 'cancel' ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:border-red-200'}`}
                  onClick={() => setChoice(choice === 'cancel' ? null : 'cancel')}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-red-600">❌ Cancel & Get Refund</p>
                      <p className="text-xs text-gray-500">Refund within 24 hours</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 ${choice === 'cancel' ? 'bg-red-500 border-red-500' : 'border-gray-300'}`} />
                  </div>
                  {choice === 'cancel' && (
                    <button onClick={(e) => { e.stopPropagation(); handleCancel(); }}
                      className="mt-3 w-full py-2 rounded-full text-white text-sm font-semibold bg-red-500">
                      Confirm Cancellation
                    </button>
                  )}
                </div>
              </div>

              <button onClick={handleWait}
                className="w-full mt-4 text-sm text-center underline text-gray-400 hover:text-gray-600">
                Wait for Dr. {doctorName}
              </button>
            </>
          )}

          {phase === 'done' && (
            <div className="text-center py-6">
              <div className="text-5xl mb-4">✅</div>
              <p className="text-lg font-bold mb-2" style={{ color: '#100A50' }}>Done!</p>
              <p className="text-sm text-gray-500 mb-6">{doneMessage}</p>
              <button onClick={onClose} className="px-6 py-2.5 rounded-full text-white font-semibold" style={{ background: '#6060C0' }}>
                Back to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
