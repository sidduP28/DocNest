import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import HospitalNavbar from '../../components/shared/HospitalNavbar';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const BG_COLORS = { 'A+':'#fee2e2','A-':'#fce7f3','B+':'#e0e7ff','B-':'#ede9fe','O+':'#dcfce7','O-':'#d1fae5','AB+':'#fef9c3','AB-':'#ffedd5' };
const BG_TEXT   = { 'A+':'#991b1b','A-':'#9d174d','B+':'#3730a3','B-':'#5b21b6','O+':'#166534','O-':'#065f46','AB+':'#854d0e','AB-':'#9a3412' };

export default function RaiseBloodRequest() {
  const navigate = useNavigate();
  const { hospital, getToken } = useHospitalAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    bloodGroupNeeded: '', unitsNeeded: 1, urgencyLevel: 'urgent',
    department: '', patientRefCode: '',
  });

  const [doctors, setDoctors] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDoctorName, setSelectedDoctorName] = useState('');

  const canRaise = hospital?.verificationStatus === 'verified';

  useEffect(() => {
    if (!hospital?._id) return;
    setLoadingDoctors(true);
    // Use the hospital object from context which includes all registered doctors
    const activeDocs = (hospital.doctors || []).filter(
      (doc) => doc.availabilityStatus !== 'off_duty'
    );
    setDoctors(activeDocs);
    setLoadingDoctors(false);
  }, [hospital]);

  if (!canRaise) {
    return (
      <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
        <HospitalNavbar />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#100A50' }}>Verification Required</h2>
          <p className="text-gray-500 text-sm">Blood request feature is available only for fully verified hospitals.</p>
          <p className="text-gray-400 text-sm mt-2">For this demo, use the pre-verified seeded hospitals (apollo, fortis, kauvery, ggh, miot).</p>
        </div>
      </div>
    );
  }

  function set(field, value) { setForm((p) => ({ ...p, [field]: value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.bloodGroupNeeded) return toast.error('Please select a blood group');
    if (!selectedDoctorName) return toast.error('Please select a doctor');
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.post(`${API}/api/blood-requests`, {
        hospitalId: hospital._id, doctorName: selectedDoctorName, ...form,
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Blood request created! Proceed to verification.');
      navigate('/hospital/blood/verify', { state: { requestId: res.data._id, code: res.data.verificationCode } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create request');
    }
    setLoading(false);
  }

  const URGENCY_OPTIONS = [
    { value: 'critical', label: '🔴 CRITICAL', desc: 'Immediate threat to life', bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
    { value: 'urgent',   label: '🟠 URGENT',   desc: 'Within 2-4 hours', bg: '#fef3c7', text: '#d97706', border: '#fcd34d' },
    { value: 'planned',  label: '🟢 PLANNED',  desc: 'Scheduled procedure', bg: '#c8eee8', text: '#0d7377', border: '#80d5ce' },
  ];

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <HospitalNavbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black mb-1" style={{ color: '#100A50' }}>Raise Blood Request</h1>
        <p className="text-gray-400 text-sm mb-6">Alert matching donors within 25 km of {hospital?.name}</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Blood Group */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#C8EEE8' }}>
            <label className="block text-sm font-bold mb-3" style={{ color: '#100A50' }}>Blood Group Needed *</label>
            <div className="grid grid-cols-4 gap-2">
              {BLOOD_GROUPS.map((bg) => (
                <button type="button" key={bg} onClick={() => set('bloodGroupNeeded', bg)}
                  className={`h-14 rounded-xl font-black text-xl border-2 transition-all ${form.bloodGroupNeeded === bg ? 'scale-105 shadow-md' : ''}`}
                  style={{ background: BG_COLORS[bg], color: BG_TEXT[bg], borderColor: form.bloodGroupNeeded === bg ? BG_TEXT[bg] : 'transparent' }}>
                  {bg}
                </button>
              ))}
            </div>
          </div>

          {/* Units + Urgency */}
          <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#C8EEE8' }}>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#100A50' }}>Units Needed *</label>
                <input type="number" min={1} max={10} className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500" style={{ borderColor: '#C8EEE8' }}
                  value={form.unitsNeeded} onChange={(e) => set('unitsNeeded', Number(e.target.value))} />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2" style={{ color: '#100A50' }}>Department</label>
                <input className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500" style={{ borderColor: '#C8EEE8' }}
                  placeholder="Trauma ICU" value={form.department} onChange={(e) => set('department', e.target.value)} />
              </div>
            </div>
            <label className="block text-sm font-bold mb-3" style={{ color: '#100A50' }}>Urgency Level *</label>
            <div className="grid grid-cols-3 gap-3">
              {URGENCY_OPTIONS.map((opt) => (
                <button type="button" key={opt.value} onClick={() => set('urgencyLevel', opt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${form.urgencyLevel === opt.value ? 'shadow-md scale-[1.02]' : ''}`}
                  style={{ background: opt.bg, borderColor: form.urgencyLevel === opt.value ? opt.border : 'transparent', color: opt.text }}>
                  <p className="font-black text-sm">{opt.label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Doctor + Ref */}
          <div className="bg-white rounded-2xl border p-5 space-y-4" style={{ borderColor: '#C8EEE8' }}>
            <div>
              <label className="block text-sm font-bold mb-2" style={{ color: '#100A50' }}>Doctor Name</label>
              {loadingDoctors ? (
                <select className="w-full border-2 rounded-xl px-4 py-2.5 text-sm text-gray-400 outline-none focus:border-teal-500" style={{ borderColor: '#C8EEE8' }} disabled>
                  <option>Loading doctors...</option>
                </select>
              ) : doctors.length === 0 ? (
                <p className="text-sm text-red-600 mb-2">No doctors available. Please add a doctor first.</p>
              ) : (
                <select 
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500 bg-white" 
                  style={{ borderColor: '#C8EEE8' }}
                  value={selectedDoctorId}
                  onChange={(e) => {
                    const docId = e.target.value;
                    setSelectedDoctorId(docId);
                    const doc = doctors.find(d => d._id === docId);
                    setSelectedDoctorName(doc ? doc.name : '');
                  }}
                >
                  <option value="" disabled>Select the attending doctor</option>
                  {doctors.map(doc => (
                    <option key={doc._id} value={doc._id}>
                      Dr. {doc.name} — {doc.specialty}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-bold mb-1" style={{ color: '#100A50' }}>Patient Reference Code</label>
              <p className="text-xs text-gray-400 mb-2">⚠️ Do not enter the patient's real name here</p>
              <input className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-teal-500" style={{ borderColor: '#C8EEE8' }}
                placeholder="e.g. PAT-2024-0042" value={form.patientRefCode} onChange={(e) => set('patientRefCode', e.target.value)} />
            </div>
          </div>

          <button type="submit" disabled={loading || doctors.length === 0}
            className={`w-full py-4 rounded-full text-white font-bold text-lg transition-all ${loading || doctors.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'}`}
            style={{ background: '#dc2626' }}>
            {loading ? 'Creating Request…' : '🩸 Raise Blood Request →'}
          </button>
        </form>
      </div>
    </div>
  );
}
