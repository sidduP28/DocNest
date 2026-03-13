import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { useSocket } from '../../context/SocketContext';
import PatientNavbar from '../../components/shared/PatientNavbar';
import HospitalCard from '../../components/patient/HospitalCard';
import BloodSOSModal from '../../components/patient/BloodSOSModal';
import DoctorEmergencyModal from '../../components/patient/DoctorEmergencyModal';
import { haversine } from '../../utils/haversine';
import { Calendar, Droplets, Heart, CheckCircle, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday } from 'date-fns';

const API = import.meta.env.VITE_API_BASE_URL || '';
const BG_COLORS = { 'A+':'#fee2e2','A-':'#fce7f3','B+':'#e0e7ff','B-':'#ede9fe','O+':'#dcfce7','O-':'#d1fae5','AB+':'#fef9c3','AB-':'#ffedd5' };
const BG_TEXT   = { 'A+':'#991b1b','A-':'#9d174d','B+':'#3730a3','B-':'#5b21b6','O+':'#166534','O-':'#065f46','AB+':'#854d0e','AB-':'#9a3412' };

export default function PatientDashboard() {
  const navigate = useNavigate();
  const { patient, updatePatient, firebaseUser, getToken } = usePatientAuth();
  const { joinRoom, on, off } = useSocket();
  const [hospitals, setHospitals] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [bloodSOS, setBloodSOS] = useState(null);
  const [emergencyEvent, setEmergencyEvent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (patient?._id) joinRoom(patient._id);
  }, [patient?._id]);

  useEffect(() => {
    async function load() {
      try {
        const [hospRes, apptRes] = await Promise.all([
          axios.get(`${API}/api/hospitals?lat=${patient?.location?.lat}&lng=${patient?.location?.lng}&radius=50`),
          axios.get(`${API}/api/appointments/patient/${patient?._id}`, {
            headers: { Authorization: `Bearer ${await getToken()}` },
          }),
        ]);
        setHospitals(hospRes.data.slice(0, 3));
        setAppointments(apptRes.data.filter((a) => a.status !== 'cancelled' && a.status !== 'completed'));
      } catch { }
      setLoading(false);
    }
    if (patient) load();
  }, [patient]);

  // Socket listeners
  useEffect(() => {
    function onBloodSOS(data) {
      if (!patient?.donorStatus) return;
      if (data.bloodGroup !== patient?.bloodGroup) return;
      setBloodSOS(data);
    }
    function onDoctorEmergency(data) { setEmergencyEvent(data); }
    function onDoctorReturned(data) {
      toast.success(`Good news! Dr. ${data.doctorName} is available again. Your original slot is reinstated.`, { duration: 6000 });
    }
    on('bloodSOS', onBloodSOS);
    on('doctorEmergency', onDoctorEmergency);
    on('doctorReturned', onDoctorReturned);
    return () => { off('bloodSOS', onBloodSOS); off('doctorEmergency', onDoctorEmergency); off('doctorReturned', onDoctorReturned); };
  }, [patient]);

  async function handleCheckin(apptId) {
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/appointments/${apptId}/checkin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Checked in!');
      setAppointments((prev) => prev.map((a) => a._id === apptId ? { ...a, checkedIn: true, status: 'confirmed' } : a));
    } catch { toast.error('Check-in failed'); }
  }

  const bloodGroupStyle = patient?.bloodGroup ? { bg: BG_COLORS[patient.bloodGroup] || '#f0f0f0', text: BG_TEXT[patient.bloodGroup] || '#333' } : null;

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <PatientNavbar />

      {/* Blood SOS modal */}
      {bloodSOS && <BloodSOSModal request={bloodSOS} onClose={() => setBloodSOS(null)} />}
      {emergencyEvent && <DoctorEmergencyModal event={emergencyEvent} onClose={() => setEmergencyEvent(null)} />}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Welcome banner */}
        <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #100A50 0%, #302090 70%, #4EB0C8 100%)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-dn-mint-light text-sm font-medium">Good day 👋</p>
              <h2 className="text-2xl font-black">{patient?.name}</h2>
              {bloodGroupStyle && (
                <span className="inline-block mt-2 px-3 py-1 rounded-full text-sm font-black"
                  style={{ background: bloodGroupStyle.bg, color: bloodGroupStyle.text }}>
                  {patient.bloodGroup}
                </span>
              )}
            </div>
            {/* Donor toggle */}
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-sm">Blood Donor</span>
              <button
                onClick={() => updatePatient(patient._id, { donorStatus: !patient.donorStatus })}
                className={`relative w-12 h-6 rounded-full transition-colors ${patient?.donorStatus ? '' : 'bg-gray-500'}`}
                style={{ background: patient?.donorStatus ? '#5EC4C4' : '#6b7280' }}>
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${patient?.donorStatus ? 'translate-x-6' : ''}`} />
              </button>
              <Heart size={16} style={{ color: patient?.donorStatus ? '#dc2626' : '#9ca3af' }} className="fill-current" />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { icon: Calendar, label: 'Appointments', value: appointments.length, color: '#6060C0' },
            { icon: Droplets, label: 'Donations', value: patient?.donationCount || 0, color: '#5EC4C4' },
            { icon: Heart, label: 'Donor Status', value: patient?.donorStatus ? 'Active' : 'Paused', color: patient?.donorStatus ? '#dc2626' : '#9ca3af' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border p-4 text-center card-hover" style={{ borderColor: '#C8EEE8' }}>
              <Icon size={24} className="mx-auto mb-2" style={{ color }} />
              <p className="text-2xl font-black" style={{ color: '#100A50' }}>{value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        {/* Appointments */}
        <section className="mb-6">
          <h3 className="text-lg font-bold mb-3" style={{ color: '#100A50' }}>My Appointments</h3>
          {loading ? (
            <div className="space-y-3">{[1, 2].map((k) => <div key={k} className="skeleton h-16 rounded-xl" />)}</div>
          ) : appointments.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center" style={{ borderColor: '#C8EEE8' }}>
              <Calendar size={40} className="mx-auto mb-3 text-gray-300" />
              <p className="text-gray-400 text-sm">No upcoming appointments</p>
              <button onClick={() => navigate('/hospitals')} className="mt-3 text-sm font-semibold" style={{ color: '#6060C0' }}>
                Book your first appointment →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((a) => (
                <div key={a._id} className="bg-white rounded-xl border p-4 flex items-center justify-between gap-3" style={{ borderColor: '#C8EEE8' }}>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#100A50' }}>{a.doctorName}</p>
                    <p className="text-xs text-gray-500">{a.hospitalName} · {a.slotLabel}</p>
                    <p className="text-xs text-gray-400">{format(new Date(a.slot), 'dd MMM yyyy')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize`}
                      style={{ background: a.status === 'booked' ? '#ede9fe' : '#dcfce7', color: a.status === 'booked' ? '#5b21b6' : '#166534' }}>
                      {a.status}
                    </span>
                    {isToday(new Date(a.slot)) && !a.checkedIn && (
                      <button onClick={() => handleCheckin(a._id)}
                        className="text-xs px-3 py-1.5 rounded-full text-white font-semibold flex items-center gap-1"
                        style={{ background: '#4EB0C8' }}>
                        <LogIn size={11} /> Check In
                      </button>
                    )}
                    {a.checkedIn && <CheckCircle size={16} style={{ color: '#5EC4C4' }} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Nearby hospitals */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold" style={{ color: '#100A50' }}>Nearby Hospitals</h3>
            <button onClick={() => navigate('/hospitals')} className="text-sm font-semibold" style={{ color: '#6060C0' }}>View all →</button>
          </div>
          {loading ? (
            <div className="space-y-3">{[1,2,3].map((k) => <div key={k} className="skeleton h-24 rounded-xl" />)}</div>
          ) : (
            <div className="space-y-3">
              {hospitals.map((h) => <HospitalCard key={h._id} hospital={h} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
