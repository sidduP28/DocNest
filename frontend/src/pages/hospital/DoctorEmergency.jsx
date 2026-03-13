import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import { useSocket } from '../../context/SocketContext';
import HospitalNavbar from '../../components/shared/HospitalNavbar';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';
const REASONS = ['Called to surgery', 'Left premises', 'Personal emergency', 'Sudden illness'];

export default function DoctorEmergency() {
  const navigate = useNavigate();
  const { hospital, getToken } = useHospitalAuth();
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [returnTime, setReturnTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const doctors = hospital?.doctors || [];

  async function handleMarkEmergency() {
    if (!selectedDoc) return toast.error('Select a doctor');
    setLoading(true);
    try {
      const token = await getToken();
      await axios.patch(
        `${API}/api/hospitals/${hospital._id}/doctors/${selectedDoc._id}/emergency`,
        { reason, estimatedReturnTime: returnTime || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setDone(true);
      toast.success(`${selectedDoc.name} marked emergency. Affected patients notified.`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <HospitalNavbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fee2e2' }}>
            <AlertTriangle size={22} className="text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black" style={{ color: '#100A50' }}>Doctor Emergency</h1>
            <p className="text-gray-400 text-sm">Notify patients of an unavailable doctor</p>
          </div>
        </div>

        {done ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">✅</div>
            <h3 className="text-lg font-bold mb-2" style={{ color: '#100A50' }}>Patients Notified</h3>
            <p className="text-gray-500 text-sm mb-6">All patients with appointments for {selectedDoc?.name} have been notified and given options to reschedule, switch doctor, or cancel.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => navigate('/hospital/doctors')} className="px-6 py-2.5 rounded-full text-white font-semibold" style={{ background: '#6060C0' }}>
                Manage Doctors
              </button>
              <button onClick={() => { setDone(false); setSelectedDoc(null); }} className="px-6 py-2.5 rounded-full border-2 font-semibold text-gray-600" style={{ borderColor: '#C8EEE8' }}>
                Another Emergency
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Doctor selection */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#C8EEE8' }}>
              <h3 className="font-bold mb-3 text-sm" style={{ color: '#100A50' }}>Select Doctor</h3>
              <div className="space-y-2">
                {doctors.filter((d) => d.availabilityStatus === 'available').map((doc) => (
                  <div key={doc._id}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedDoc?._id === doc._id ? '' : 'border-gray-200 hover:border-dn-mint-light'}`}
                    style={selectedDoc?._id === doc._id ? { borderColor: '#dc2626', background: '#fff5f5' } : {}}
                    onClick={() => setSelectedDoc(doc)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm" style={{ color: '#100A50' }}>{doc.name}</p>
                        <p className="text-xs text-gray-400">{doc.specialty} — {doc.qualification}</p>
                      </div>
                      {selectedDoc?._id === doc._id && (
                        <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {doctors.filter((d) => d.availabilityStatus === 'available').length === 0 && (
                  <p className="text-sm text-gray-400 py-4 text-center">No available doctors to mark emergency</p>
                )}
              </div>
            </div>

            {/* Emergency details */}
            {selectedDoc && (
              <div className="bg-white rounded-2xl border p-5 space-y-4 animate-fadeIn" style={{ borderColor: '#C8EEE8' }}>
                <h3 className="font-bold text-sm" style={{ color: '#100A50' }}>Emergency Details</h3>
                <div>
                  <label className="block text-xs font-semibold mb-2 text-gray-500">Reason</label>
                  <div className="grid grid-cols-2 gap-2">
                    {REASONS.map((r) => (
                      <button key={r} type="button" onClick={() => setReason(r)}
                        className={`p-2 rounded-lg border text-xs font-medium text-left transition-all ${reason === r ? 'border-red-300 text-red-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                        style={reason === r ? { background: '#fff5f5' } : {}}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 text-gray-500">Estimated Return Time (optional)</label>
                  <input type="datetime-local" value={returnTime} onChange={(e) => setReturnTime(e.target.value)}
                    className="w-full border-2 rounded-xl px-4 py-2.5 text-sm" style={{ borderColor: '#C8EEE8' }} />
                </div>

                <div className="p-3 rounded-xl text-xs text-red-600 border border-red-200" style={{ background: '#fff5f5' }}>
                  ⚠️ This will immediately alert all patients who have appointments with{' '}
                  <strong>{selectedDoc.name}</strong> today and give them options to reschedule, switch to another doctor, cancel for a refund, or wait.
                </div>

                <button onClick={handleMarkEmergency} disabled={loading}
                  className="w-full py-3 rounded-full text-white font-bold transition-all hover:opacity-90"
                  style={{ background: '#dc2626' }}>
                  {loading ? 'Notifying patients…' : `🚨 Mark Dr. ${selectedDoc.name.split(' ')[selectedDoc.name.split(' ').length - 1]} as Emergency`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
