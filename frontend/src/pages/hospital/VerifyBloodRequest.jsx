import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import { useSocket } from '../../context/SocketContext';
import HospitalNavbar from '../../components/shared/HospitalNavbar';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export default function VerifyBloodRequest() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { getToken, hospital } = useHospitalAuth();
  const { on, off } = useSocket();
  const [codeInput, setCodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState('enter'); // enter | active | expired
  const [timeLeft, setTimeLeft] = useState(15 * 60); // 15 min in seconds
  const [donors, setDonors] = useState([]);
  const [notifiedCount, setNotifiedCount] = useState(0);

  const { requestId, code } = state || {};

  useEffect(() => {
    if (!requestId) navigate('/hospital/blood/raise');
  }, [requestId]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'enter') return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timer); setPhase('expired'); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Socket listeners for donor responses
  useEffect(() => {
    function onDonorConfirmed(data) {
      if (data.requestId !== requestId) return;
      setDonors((prev) => {
        const exists = prev.some((d) => d.donorFirstName === data.donorFirstName);
        if (exists) return prev;
        return [...prev, data];
      });
    }
    function onDonorArrived(data) {
      if (data.requestId !== requestId) return;
      setDonors((prev) => prev.map((d, i) => i === prev.length - 1 ? { ...d, hasArrived: true, ...data } : d));
      toast.success(`${data.donorFullName} has arrived at the hospital!`);
    }
    on('donorConfirmed', onDonorConfirmed);
    on('donorArrived', onDonorArrived);
    return () => { off('donorConfirmed', onDonorConfirmed); off('donorArrived', onDonorArrived); };
  }, [requestId]);

  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  async function handleVerify() {
    if (!codeInput.trim()) return toast.error('Enter the verification code');
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.patch(`${API}/api/blood-requests/${requestId}/verify`, { code: codeInput.trim().toUpperCase() }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifiedCount(res.data.notifiedCount || 0);
      setPhase('active');
      toast.success('Request activated! Donor alerts sent.');
    } catch (err) {
      const msg = err.response?.data?.error || 'Verification failed';
      if (msg.includes('expired')) { setPhase('expired'); } else toast.error(msg);
    }
    setLoading(false);
  }

  async function handleFulfill() {
    const arrivedDonors = donors.filter((d) => d.hasArrived);
    if (arrivedDonors.length === 0) return toast.error('No donors have arrived yet');
    try {
      const token = await getToken();
      await axios.patch(`${API}/api/blood-requests/${requestId}/fulfill`, {
        donorUserIds: arrivedDonors.map((d) => d.userId).filter(Boolean),
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Request marked as fulfilled! Donors\' records updated.');
      navigate('/hospital/dashboard');
    } catch { toast.error('Failed to fulfill'); }
  }

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <HospitalNavbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black mb-6" style={{ color: '#100A50' }}>Blood Request Verification</h1>

        {/* Code display box */}
        {phase === 'enter' && (
          <>
            <div className="bg-white rounded-2xl border-2 p-6 mb-6 text-center shadow-sm" style={{ borderColor: '#4EB0C8' }}>
              <p className="text-sm text-gray-400 mb-1 uppercase tracking-widest">Verification Code</p>
              <p className="text-4xl font-black tracking-widest my-3" style={{ color: '#100A50' }}>{code}</p>
              <div className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full ${timeLeft < 120 ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                ⏱ Expires in: {mins}:{secs}
              </div>
            </div>

            <div className="bg-white rounded-2xl border p-5 mb-4" style={{ borderColor: '#C8EEE8' }}>
              <p className="text-sm text-gray-500 mb-4">
                Show this code to the doctor or senior staff member at the patient's bedside. Have them confirm the code below to activate the blood donor alert system.
              </p>
              <label className="block text-sm font-bold mb-2" style={{ color: '#100A50' }}>Enter verification code to confirm:</label>
              <div className="flex gap-3">
                <input
                  className="flex-1 border-2 rounded-xl px-4 py-3 text-lg font-black tracking-widest uppercase"
                  style={{ borderColor: '#C8EEE8' }}
                  placeholder="BLD-XXXX"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                  onFocus={(e) => (e.target.style.borderColor = '#4EB0C8')}
                  onBlur={(e) => (e.target.style.borderColor = '#C8EEE8')}
                />
                <button onClick={handleVerify} disabled={loading}
                  className="px-6 py-3 rounded-xl text-white font-bold transition-all hover:opacity-90"
                  style={{ background: '#dc2626' }}>
                  {loading ? '…' : 'Confirm'}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Active state */}
        {phase === 'active' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border-2 p-5 text-center" style={{ borderColor: '#5EC4C4' }}>
              <div className="text-3xl mb-2">📡</div>
              <h3 className="text-lg font-black" style={{ color: '#100A50' }}>Request is Now ACTIVE</h3>
              <p className="text-gray-500 text-sm">Donor alerts have been sent to <strong>{notifiedCount}</strong> matching donors nearby.</p>
            </div>

            {/* Responding donors */}
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#C8EEE8' }}>
              <h4 className="font-bold mb-3" style={{ color: '#100A50' }}>Responding Donors ({donors.length})</h4>
              {donors.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">Waiting for donors to respond…</p>
              ) : (
                <div className="space-y-2">
                  {donors.map((d, i) => (
                    <div key={i} className={`p-3 rounded-xl border ${d.hasArrived ? 'border-green-300 bg-green-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          {d.hasArrived ? (
                            <p className="font-bold text-sm text-green-700">{d.donorFullName}</p>
                          ) : (
                            <p className="font-bold text-sm" style={{ color: '#100A50' }}>Donor {i + 1} — {d.donorFirstName}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {d.hasArrived ? `📞 ${d.donorPhone} · ${d.donorBloodGroup}` : `ETA ~${d.etaMinutes} mins`}
                          </p>
                        </div>
                        {d.hasArrived ? (
                          <span className="text-xs px-2 py-1 rounded-full font-bold bg-green-100 text-green-700">✓ ARRIVED</span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-600">On the way</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {donors.some((d) => d.hasArrived) && (
              <button onClick={handleFulfill}
                className="w-full py-4 rounded-full text-white font-bold transition-all hover:opacity-90"
                style={{ background: '#166534' }}>
                ✓ Mark Request as Fulfilled
              </button>
            )}
          </div>
        )}

        {/* Expired state */}
        {phase === 'expired' && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⏰</div>
            <h3 className="text-xl font-bold mb-2" style={{ color: '#100A50' }}>Verification Code Expired</h3>
            <p className="text-gray-500 text-sm mb-6">This verification code has expired. Please raise a new request if the blood requirement is still active.</p>
            <button onClick={() => navigate('/hospital/blood/raise')}
              className="px-8 py-3 rounded-full text-white font-bold" style={{ background: '#dc2626' }}>
              Raise New Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
