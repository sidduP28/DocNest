import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // Auto-login if password is in sessionStorage (just for dev convenience, not strictly needed)
  useEffect(() => {
    const stored = sessionStorage.getItem('adminSecret');
    if (stored === 'docnest-admin-2024') {
      setIsAuthenticated(true);
      fetchPending();
    }
  }, []);

  function handleLogin(e) {
    e.preventDefault();
    if (password === 'docnest-admin-2024') {
      sessionStorage.setItem('adminSecret', password);
      setIsAuthenticated(true);
      setError('');
      fetchPending();
    } else {
      setError('Incorrect password');
    }
  }

  async function fetchPending() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/admin/doctors/pending`, {
        headers: { 'x-admin-password': 'docnest-admin-2024' }
      });
      setPendingDoctors(res.data);
    } catch (err) {
      toast.error('Failed to load pending doctors');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(hospitalId, doctorId, name) {
    try {
      await axios.patch(`${API}/api/admin/doctors/${hospitalId}/${doctorId}/approve`, {}, {
        headers: { 'x-admin-password': 'docnest-admin-2024' }
      });
      toast.success(`Dr. ${name} approved`);
      setPendingDoctors(prev => prev.filter(d => d.doctorId !== doctorId));
    } catch (err) {
      toast.error('Failed to approve doctor');
    }
  }

  async function handleRejectConfirm(hospitalId, doctorId, name) {
    if (!rejectReason.trim()) return toast.error('Please provide a reason');
    try {
      await axios.patch(`${API}/api/admin/doctors/${hospitalId}/${doctorId}/reject`, { reason: rejectReason }, {
        headers: { 'x-admin-password': 'docnest-admin-2024' }
      });
      toast.success(`Dr. ${name} rejected`);
      setPendingDoctors(prev => prev.filter(d => d.doctorId !== doctorId));
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error('Failed to reject doctor');
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border" style={{ borderColor: '#C8EEE8' }}>
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black" style={{ color: '#100A50' }}>DocNest Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Project Admin Access</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Admin Password"
                className="w-full px-4 py-3 rounded-xl border-2 outline-none focus:border-teal-500 transition-colors"
                style={{ borderColor: '#C8EEE8' }}
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
            </div>
            <button type="submit" className="w-full py-3 rounded-xl text-white font-bold" style={{ background: '#6060C0' }}>
              Enter
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black dark-text" style={{ color: '#100A50' }}>Pending Doctor Approvals</h1>
            <p className="text-sm text-gray-500 mt-1">Review new doctor profiles before they go live.</p>
          </div>
          <div className="px-4 py-2 rounded-xl border bg-amber-50 text-amber-700 border-amber-200 font-bold">
            {pendingDoctors.length} pending
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12"><div className="spinner mx-auto" /></div>
        ) : pendingDoctors.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <p className="text-gray-500">No pending doctor approvals right now.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingDoctors.map(doc => (
              <div key={doc.doctorId} className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: '#C8EEE8' }}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-lg" style={{ color: '#100A50' }}>Dr. {doc.doctorName}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">Pending</span>
                    </div>
                    <p className="text-sm font-medium text-gray-700">{doc.specialty} · <span className="text-gray-500 font-normal">{doc.qualification}</span></p>
                    <p className="text-sm text-gray-500 mt-0.5">Hospital: <span className="font-medium text-gray-700">{doc.hospitalName}</span></p>
                    <p className="text-xs text-gray-400 mt-1">
                      Submitted: {doc.submittedAt ? new Date(doc.submittedAt).toLocaleString() : 'Recently'}
                    </p>
                  </div>
                </div>

                <div className="mb-5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Slots submitted:</p>
                  <div className="flex flex-wrap gap-2">
                    {doc.slots.map(t => (
                      <span key={t} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium">
                        {t}
                      </span>
                    ))}
                    {doc.slots.length === 0 && <span className="text-xs text-gray-400">No slots submitted</span>}
                  </div>
                </div>

                {rejectingId === doc.doctorId ? (
                  <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start flex-col gap-2">
                    <label className="text-sm font-bold text-red-900">Reason for rejection:</label>
                    <input 
                      autoFocus
                      className="w-full px-3 py-2 rounded-lg border border-red-200 outline-none focus:border-red-400 text-sm"
                      placeholder="e.g. Qualification details are missing"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                    />
                    <div className="flex gap-2 w-full mt-1">
                      <button onClick={() => handleRejectConfirm(doc.hospitalId, doc.doctorId, doc.doctorName)}
                        className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-bold hover:bg-red-700">
                        Confirm Reject
                      </button>
                      <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                        className="flex-1 bg-white border border-gray-300 text-gray-600 rounded-lg py-2 text-sm font-bold hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <button onClick={() => handleApprove(doc.hospitalId, doc.doctorId, doc.doctorName)}
                      className="flex-1 py-2.5 rounded-xl text-white font-bold text-sm bg-teal-500 hover:bg-teal-600 transition-colors">
                      ✓ Approve
                    </button>
                    <button onClick={() => setRejectingId(doc.doctorId)}
                      className="flex-1 py-2.5 rounded-xl border-2 border-red-200 text-red-600 font-bold text-sm hover:bg-red-50 transition-colors">
                      ✗ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
