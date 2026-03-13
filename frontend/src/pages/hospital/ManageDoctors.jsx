import { useState, useEffect } from 'react';
import axios from 'axios';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import { useSocket } from '../../context/SocketContext';
import HospitalNavbar from '../../components/shared/HospitalNavbar';
import { Users, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import WaitTimeBadge from '../../components/patient/WaitTimeBadge';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

const SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Orthopedics', 'Neurology',
  'Dermatology', 'Pediatrics', 'Gynecology', 'General Surgery',
  'ENT', 'Oncology', 'Nephrology', 'Ophthalmology', 'Psychiatry',
  'Urology', 'Endocrinology', 'Gastroenterology', 'Pulmonology'
];

function generateTimeSlots() {
  const slots = [];
  let currentHour = 8;
  let currentMinute = 0;
  while (currentHour <= 20) {
    const ampm = currentHour >= 12 ? 'PM' : 'AM';
    const displayHour = currentHour > 12 ? currentHour - 12 : (currentHour === 0 ? 12 : currentHour);
    const timeString = `${displayHour.toString().padStart(2, '0')}:${currentMinute === 0 ? '00' : '30'} ${ampm}`;
    slots.push(timeString);
    currentMinute += 30;
    if (currentMinute === 60) {
      currentHour += 1;
      currentMinute = 0;
    }
    if (currentHour === 20 && currentMinute > 0) break; // End at 08:00 PM
  }
  return slots;
}
const ALL_TIME_SLOTS = generateTimeSlots();

export default function ManageDoctors() {
  const { hospital, getToken, setHospital } = useHospitalAuth();
  const { socket } = useSocket();
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Wait Time and Offline Appts State
  const [waitData, setWaitData] = useState({});
  const [offlineAppts, setOfflineAppts] = useState([]);

  // Add Doctor Form State
  const [newDoc, setNewDoc] = useState({ name: '', specialty: SPECIALTIES[0], qualification: '', slots: [] });

  async function loadWaitAndOffline() {
    if (!hospital) return;
    try {
      const token = await getToken();
      const [waitRes, apptRes] = await Promise.all([
        axios.get(`${API}/api/hospitals/${hospital._id}/waittime`),
        axios.get(`${API}/api/appointments/hospital/${hospital._id}?date=today&type=offline`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      const wMap = {};
      if (waitRes.data && waitRes.data.doctors) {
        waitRes.data.doctors.forEach(d => wMap[d.doctorId] = d);
      }
      setWaitData(wMap);
      setOfflineAppts(apptRes.data || []);
    } catch { }
  }

  async function refresh() {
    try {
      const res = await axios.get(`${API}/api/hospitals/${hospital._id}`);
      setHospital(res.data);
    } catch { toast.error('Failed to refresh'); }
  }

  useEffect(() => { loadWaitAndOffline(); }, [hospital]);

  useEffect(() => {
    if (!socket || !hospital) return;
    
    const hId = hospital._id;
    socket.emit('joinHospitalRoom', { hospitalId: hId });

    socket.on('doctorApproved', (data) => {
      if (data.hospitalId === hId) {
        toast.success(`Dr. ${data.doctorName} has been approved and is now live.`);
        refresh();
      }
    });

    socket.on('doctorRejected', (data) => {
      if (data.hospitalId === hId) {
        toast.error(`Dr. ${data.doctorName}'s profile was not approved. Reason: ${data.reason}`);
        refresh();
      }
    });

    socket.on('queueUpdate', (data) => {
      if (data.hospitalId === hId) {
        setWaitData(prev => ({
          ...prev,
          [data.doctorId]: {
            ...prev[data.doctorId],
            ...data
          }
        }));
      }
    });

    socket.on('slotsUpdated', (data) => {
      if (data.hospitalId === hId) {
        refresh();
        loadWaitAndOffline();
      }
    });

    return () => {
      socket.off('doctorApproved');
      socket.off('doctorRejected');
      socket.off('queueUpdate');
      socket.off('slotsUpdated');
    };
  }, [socket, hospital]);

  function toggleNewDocSlot(time) {
    setNewDoc(prev => {
      if (prev.slots.includes(time)) return { ...prev, slots: prev.slots.filter(s => s !== time) };
      return { ...prev, slots: [...prev.slots, time].sort((a, b) => new Date('1970/01/01 ' + a) - new Date('1970/01/01 ' + b)) };
    });
  }

  async function handleAddDoctor(e) {
    e.preventDefault();
    if (!newDoc.name || !newDoc.qualification) return toast.error('Please fill all required fields');
    if (newDoc.slots.length === 0) return toast.error('Please select at least one time slot');

    try {
      setLoading(true);
      const token = await getToken();
      await axios.post(`${API}/api/hospitals/${hospital._id}/doctors`, newDoc, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Doctor submitted for approval. They will appear once approved by DocNest admin.');
      setNewDoc({ name: '', specialty: SPECIALTIES[0], qualification: '', slots: [] });
      setShowAddForm(false);
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add doctor');
    } finally {
      setLoading(false);
    }
  }

  const doctors = hospital?.doctors || [];

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <HospitalNavbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#100A50' }}>Manage Doctors</h1>
            <p className="text-gray-400 text-sm">{doctors.length} doctor(s) at {hospital?.name}</p>
          </div>
          <button 
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 rounded-xl text-white font-bold text-sm bg-teal-500 hover:bg-teal-600 transition-colors">
            {showAddForm ? 'Cancel' : '+ Add Doctor'}
          </button>
        </div>

        {/* Add Doctor Form Panel */}
        {showAddForm && (
          <div className="bg-white rounded-2xl border p-5 mb-8 shadow-sm" style={{ borderColor: '#C8EEE8' }}>
            <h2 className="text-lg font-bold mb-4" style={{ color: '#100A50' }}>Submit New Doctor</h2>
            <form onSubmit={handleAddDoctor} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Doctor Name *</label>
                  <input className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-teal-500 text-sm" style={{ borderColor: '#e2e8f0' }}
                    placeholder="Dr. John Doe" value={newDoc.name} onChange={e => setNewDoc({...newDoc, name: e.target.value})} required/>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Specialty *</label>
                  <select className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-teal-500 text-sm" style={{ borderColor: '#e2e8f0' }}
                    value={newDoc.specialty} onChange={e => setNewDoc({...newDoc, specialty: e.target.value})}>
                    {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Qualification *</label>
                <input className="w-full px-3 py-2 rounded-lg border-2 outline-none focus:border-teal-500 text-sm" style={{ borderColor: '#e2e8f0' }}
                  placeholder="e.g. MD, DM Cardiology" value={newDoc.qualification} onChange={e => setNewDoc({...newDoc, qualification: e.target.value})} required/>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center justify-between">
                  <span>Initial Slots *</span>
                  <span className="text-teal-600 font-medium">{newDoc.slots.length} selected</span>
                </label>
                <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-gray-100 bg-gray-50 max-h-48 overflow-y-auto">
                  {ALL_TIME_SLOTS.map(time => {
                    const isSelected = newDoc.slots.includes(time);
                    return (
                      <button type="button" key={time} onClick={() => toggleNewDocSlot(time)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border ${
                          isSelected ? 'bg-teal-50 text-teal-700 border-teal-200 shadow-sm' : 'bg-white text-gray-500 text-opacity-70 hover:bg-gray-100 hover:text-gray-700'
                        }`}>
                        {time}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" disabled={loading} className="w-full py-3 rounded-xl text-white font-bold" style={{ background: '#100A50' }}>
                  {loading ? 'Submitting...' : 'Submit Doctor for Approval'}
                </button>
              </div>
            </form>
          </div>
        )}

        {doctors.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users size={48} className="mx-auto mb-4" />
            <p>No doctors registered for this hospital</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Reverse array to show newest at top usually */}
            {[...doctors].reverse().map((doc) => (
              <ManageDoctorCard 
                key={doc._id} 
                doc={doc} 
                hospitalId={hospital._id} 
                onUpdate={refresh} 
                getToken={getToken} 
                waitInfo={waitData[doc._id]}
                doctorOfflineAppts={offlineAppts.filter(a => a.doctorId === doc._id && a.status !== 'cancelled')}
                reloadWaitAndAppts={loadWaitAndOffline}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ManageDoctorCard({ doc, hospitalId, onUpdate, getToken, waitInfo, doctorOfflineAppts, reloadWaitAndAppts }) {
  const [expanded, setExpanded] = useState(false);
  
  // Slot Manager State
  const [stagedBlocks, setStagedBlocks] = useState([]);     // slot _ids
  const [stagedUnblocks, setStagedUnblocks] = useState([]); // slot _ids
  const [stagedNewSlots, setStagedNewSlots] = useState([]); // time strings
  const [savingSlots, setSavingSlots] = useState(false);

  // Offline walk-ins & slots state
  const [walkInsInput, setWalkInsInput] = useState(waitInfo?.offlineWalkIns || doc.offlineWalkIns || 0);
  const [showOfflineForm, setShowOfflineForm] = useState(false);
  const [offlineName, setOfflineName] = useState('');
  const [offlinePhone, setOfflinePhone] = useState('');
  const [selectedOfflineSlot, setSelectedOfflineSlot] = useState('');

  const isApproved = doc.approvalStatus === 'approved';
  const isPending = doc.approvalStatus === 'pending_approval';
  const isRejected = doc.approvalStatus === 'rejected';

  useEffect(() => {
    setWalkInsInput(waitInfo?.offlineWalkIns || doc.offlineWalkIns || 0);
  }, [waitInfo?.offlineWalkIns, doc.offlineWalkIns]);

  // Helper to determine active background based on status
  let cardClass = "bg-white rounded-2xl border p-4 shadow-sm relative overflow-hidden transition-all ";
  if (isPending) cardClass += "border-amber-200 bg-amber-50 bg-opacity-30";
  else if (isRejected) cardClass += "border-red-200 bg-red-50 bg-opacity-30";
  else cardClass += "border-gray-200";

  function handleSlotClick(slot) {
    if (slot.isBooked) return; // Cannot alter booked slots
    if (slot.isBlocked) {
      if (stagedUnblocks.includes(slot._id)) {
        setStagedUnblocks(p => p.filter(id => id !== slot._id)); // Unstage
      } else {
        setStagedUnblocks(p => [...p, slot._id]); // Stage unblock
      }
    } else {
      if (stagedBlocks.includes(slot._id)) {
        setStagedBlocks(p => p.filter(id => id !== slot._id)); // Unstage
      } else {
        setStagedBlocks(p => [...p, slot._id]); // Stage block
      }
    }
  }

  function toggleNewSlot(time) {
    setStagedNewSlots(prev => {
      if (prev.includes(time)) return prev.filter(t => t !== time);
      return [...prev, time].sort((a, b) => new Date('1970/01/01 ' + a) - new Date('1970/01/01 ' + b));
    });
  }

  function handleDiscard() {
    setStagedBlocks([]);
    setStagedUnblocks([]);
    setStagedNewSlots([]);
    setExpanded(false);
  }

  async function handleSaveSlots() {
    try {
      setSavingSlots(true);
      const addSlots = stagedNewSlots;
      const blockSlots = stagedBlocks.map(id => doc.slots.find(s => s._id === id).time);
      const unblockSlots = stagedUnblocks.map(id => doc.slots.find(s => s._id === id).time);

      if (addSlots.length === 0 && blockSlots.length === 0 && unblockSlots.length === 0) {
        setExpanded(false);
        return;
      }

      const token = await getToken();
      await axios.patch(`${API}/api/hospitals/${hospitalId}/doctors/${doc._id}/slots`, 
        { addSlots, blockSlots, unblockSlots },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Slots updated for Dr. ${doc.name}`);
      
      setStagedBlocks([]);
      setStagedUnblocks([]);
      setStagedNewSlots([]);
      setExpanded(false);
      onUpdate();
    } catch (err) {
      toast.error('Failed to update slots. Please try again.');
    } finally {
      setSavingSlots(false);
    }
  }

  async function handleUpdateWalkIns() {
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/hospitals/${hospitalId}/doctors/${doc._id}/walkins`, 
        { offlineWalkIns: walkInsInput },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Walk-in count updated for Dr. ${doc.name}`);
    } catch {
      toast.error('Failed to update walk-in count');
    }
  }

  async function handleBookOffline(e) {
    e.preventDefault();
    if (!offlineName || !selectedOfflineSlot) return;
    try {
      const token = await getToken();
      await axios.post(`${API}/api/hospitals/${hospitalId}/doctors/${doc._id}/offline-appointment`,
        { offlinePatientName: offlineName, offlinePatientPhone: offlinePhone, selectedSlot: selectedOfflineSlot },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Offline appointment booked for ${offlineName} at ${selectedOfflineSlot}. Slot is now blocked for online booking.`);
      setOfflineName('');
      setOfflinePhone('');
      setSelectedOfflineSlot('');
      setShowOfflineForm(false);
      reloadWaitAndAppts();
      onUpdate();
    } catch (err) {
      if (err.response?.status === 409) toast.error('That slot was just taken. Please select another.');
      else toast.error('Failed to book offline appointment');
    }
  }

  async function handleCancelOffline(apptId) {
    if (!window.confirm('Cancel this offline appointment?')) return;
    try {
      const token = await getToken();
      await axios.delete(`${API}/api/hospitals/${hospitalId}/doctors/${doc._id}/offline-appointment/${apptId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Offline appointment cancelled. Slot is available again.');
      reloadWaitAndAppts();
      onUpdate();
    } catch { toast.error('Failed to cancel appointment'); }
  }

  return (
    <div className={cardClass}>
      {/* Header section */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-bold text-lg" style={{ color: '#100A50' }}>Dr. {doc.name}</h3>
          <p className="text-sm font-medium text-gray-700">{doc.specialty}</p>
          <p className="text-xs text-gray-500 mt-0.5">{doc.qualification}</p>
        </div>
      </div>

      {isApproved && (
        <>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Unslotted walk-ins currently waiting</p>
            <div className="flex items-center gap-3">
              <input type="number" min="0" max="100" value={walkInsInput} onChange={e => setWalkInsInput(e.target.value)} 
                className="w-20 px-3 py-1 border-2 rounded-lg outline-none focus:border-indigo-500 text-sm font-bold text-center" />
              <button onClick={handleUpdateWalkIns} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 transition-colors">Update</button>
              
              <div className="ml-auto">
                {waitInfo && <WaitTimeBadge estimatedWaitMinutes={waitInfo.estimatedWaitMinutes} waitColor={waitInfo.waitColor} waitLabel={`Est. wait: ${waitInfo.waitLabel}`} size="lg"/>}
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Use this for walk-ins who haven't been assigned a slot yet</p>
            <div className="flex gap-4 mt-3 text-xs text-indigo-900 bg-indigo-50 p-2 rounded-lg border border-indigo-100/50">
              <span className="font-medium">Online bookings remaining today: <b>{waitInfo?.remainingOnlineBookings || 0}</b></span>
              <span className="font-medium">Total queue: <b>{waitInfo?.totalQueue || 0} patients</b></span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <button onClick={() => setShowOfflineForm(!showOfflineForm)} className="w-full mb-3 flex justify-between items-center text-sm font-bold text-indigo-600 hover:text-indigo-700">
              Book Offline / Walk-in Appointment
              {showOfflineForm ? <ChevronUp size={16} /> : <div className="bg-indigo-100 p-0.5 rounded-full text-indigo-600"><span className="text-lg leading-none">+</span></div>}
            </button>
            
            {showOfflineForm && (
              <form onSubmit={handleBookOffline} className="mb-4 bg-gray-50 p-3 rounded-xl border border-gray-200 animate-fadeIn">
                <input required className="w-full text-sm px-3 py-2 border rounded-lg mb-2" placeholder="Walk-in patient name" value={offlineName} onChange={e => setOfflineName(e.target.value)} />
                <input className="w-full text-sm px-3 py-2 border rounded-lg mb-3" placeholder="Phone number (optional)" value={offlinePhone} onChange={e => setOfflinePhone(e.target.value)} />
                
                <p className="text-xs font-bold text-gray-500 mb-2">Assign a time slot</p>
                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto mb-2">
                  {doc.slots.map(s => {
                    const unavailable = s.isBooked || s.isBlocked;
                    if (unavailable) {
                      return <div key={s._id} className="text-[10px] px-2 py-1 rounded bg-gray-100 text-gray-400 border cursor-not-allowed">
                        {s.isBlocked ? '✕' : '■'} {s.time}
                      </div>;
                    }
                    const isSelected = selectedOfflineSlot === s.time;
                    return <button type="button" key={s._id} onClick={() => setSelectedOfflineSlot(s.time)}
                      className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors ${isSelected ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-indigo-900 hover:bg-indigo-50 border-indigo-200'}`}>
                      ● {s.time}
                    </button>
                  })}
                </div>
                <div className="text-[9px] text-gray-500 flex gap-3 mb-3">
                  <span>● Available</span>
                  <span>■ Booked (online)</span>
                  <span>✕ Blocked (offline/admin)</span>
                </div>
                <button disabled={!offlineName || !selectedOfflineSlot} type="submit" className="w-full py-2 bg-[#100A50] text-white font-bold text-sm rounded-lg disabled:opacity-50">
                  Confirm Offline Booking
                </button>
              </form>
            )}

            {doctorOfflineAppts && doctorOfflineAppts.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Today's Offline Appointments</p>
                {doctorOfflineAppts.map(ap => (
                  <div key={ap._id} className="flex items-center justify-between text-xs p-2 rounded-lg border bg-white shadow-sm hover:border-gray-300">
                    <div>
                      <p className="font-bold text-[#100A50]">{ap.offlinePatientName} <span className="font-medium text-gray-400">— {ap.slotLabel}</span></p>
                      {ap.offlinePatientPhone && <p className="text-[10px] text-gray-400">{ap.offlinePatientPhone}</p>}
                    </div>
                    <button onClick={() => handleCancelOffline(ap._id)} className="px-2 py-1 text-red-500 hover:bg-red-50 rounded border border-red-100 text-xs font-medium transition-colors" title="Cancel Appointment">
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-4 pt-4 border-t border-gray-100">
          <button 
            onClick={() => setExpanded(!expanded)}
            className="w-full flex justify-between items-center text-sm font-bold text-teal-600 hover:text-teal-700">
            Manage Slots
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {expanded && (
            <div className="mt-4 animate-fadeIn">
              {/* CURRENT SLOTS */}
              <div className="mb-4">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Current Slots</p>
                <div className="flex flex-wrap gap-2">
                  {doc.slots.length === 0 ? <p className="text-xs text-gray-400">No active slots.</p> : null}
                  {doc.slots.map(slot => {
                    const isBooked = slot.isBooked;
                    const isOriginallyBlocked = slot.isBlocked;
                    const isStagedBlock = stagedBlocks.includes(slot._id);
                    const isStagedUnblock = stagedUnblocks.includes(slot._id);

                    // Determine visual state
                    let btnClass = "px-2 py-1 text-xs font-medium rounded-lg border transition-all ";
                    let label = slot.time;
                    let title = "";

                    if (isBooked) {
                      btnClass += "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";
                      label += " 🔒";
                      title = "Booked by patient — cannot block";
                    } else if (isOriginallyBlocked) {
                      if (isStagedUnblock) {
                        btnClass += "bg-teal-50 text-teal-700 border-teal-200 border-dashed opacity-80 cursor-pointer";
                        label += " (Will Unblock)";
                      } else {
                        btnClass += "bg-red-50 text-red-600 border-red-200 cursor-pointer hover:bg-red-100";
                        label += " [Blocked]";
                      }
                    } else { // Usually available
                      if (isStagedBlock) {
                        btnClass += "bg-red-50 text-red-600 border-red-200 border-dashed line-through opacity-80 cursor-pointer";
                      } else {
                        btnClass += "bg-white text-gray-700 border-gray-300 cursor-pointer hover:border-gray-500 hover:bg-gray-50";
                      }
                    }

                    return (
                      <button key={slot._id} type="button" onClick={() => handleSlotClick(slot)} className={btnClass} title={title}>
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ADD NEW SLOTS */}
              <div className="mb-4 pt-3 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Add New Slots</p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-xl border border-gray-100">
                  {ALL_TIME_SLOTS.map(time => {
                    const alreadyExists = doc.slots.some(s => s.time === time);
                    if (alreadyExists) return null; // Don't show options they already have

                    const isSelected = stagedNewSlots.includes(time);
                    return (
                      <button key={`new-${time}`} type="button" onClick={() => toggleNewSlot(time)}
                        className={`px-2 py-1 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
                          isSelected ? 'bg-teal-500 text-white border-teal-600 shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'
                        }`}>
                        {time} {isSelected && '+'}
                      </button>
                    )
                  })}
                  {ALL_TIME_SLOTS.every(time => doc.slots.some(s => s.time === time)) && (
                    <p className="text-xs text-gray-400 italic">All possible slots already exist.</p>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 mt-4">
                <button onClick={handleSaveSlots} disabled={savingSlots}
                  className="flex-1 py-2 bg-indigo-900 text-white text-sm font-bold rounded-xl transition-colors hover:bg-indigo-800">
                  {savingSlots ? "Saving..." : "Save Changes"}
                </button>
                <button onClick={handleDiscard} className="px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50">
                  Discard
                </button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
