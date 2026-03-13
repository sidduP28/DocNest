import { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import { Activity } from 'lucide-react';
import HospitalNavbar from '../../components/shared/HospitalNavbar';
import toast from 'react-hot-toast';

export default function HospitalLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, hospital } = useHospitalAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (hospital) { navigate('/hospital/dashboard'); return null; }
  const msg = location.state?.message;

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { success, error: err } = await login(form.email, form.password);
    if (success) { toast.success('Welcome to your Hospital Portal!'); navigate('/hospital/dashboard'); }
    else setError(err);
    setLoading(false);
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #100A50 0%, #201470 100%)' }}>
      <HospitalNavbar />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(94,196,196,0.15)', border: '2px solid rgba(94,196,196,0.3)' }}>
            <Activity size={32} style={{ color: '#5EC4C4' }} />
          </div>
          <h1 className="text-3xl font-black text-white">Hospital Portal</h1>
          <p className="text-gray-400 text-sm mt-1">DocNest Partner Dashboard</p>
        </div>

        {msg && <div className="mb-4 p-3 rounded-xl text-sm" style={{ background: 'rgba(200,238,232,0.2)', color: '#A8E4DC', border: '1px solid rgba(200,238,232,0.3)' }}>{msg}</div>}

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {error && <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: '#fee2e2', color: '#dc2626' }}>{error}</div>}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#100A50' }}>Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none" style={{ borderColor: '#C8EEE8' }}
                onFocus={(e) => (e.target.style.borderColor = '#4EB0C8')} onBlur={(e) => (e.target.style.borderColor = '#C8EEE8')}
                placeholder="apollo@docnest.demo" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#100A50' }}>Password</label>
              <input type="password" required value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none" style={{ borderColor: '#C8EEE8' }}
                onFocus={(e) => (e.target.style.borderColor = '#4EB0C8')} onBlur={(e) => (e.target.style.borderColor = '#C8EEE8')}
                placeholder="Demo@1234" />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-full text-white font-bold transition-all hover:opacity-90" style={{ background: '#6060C0' }}>
              {loading ? 'Signing in…' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-4 p-3 rounded-xl text-xs" style={{ background: '#f8fafc' }}>
            <p className="font-semibold mb-1" style={{ color: '#100A50' }}>Demo Hospital Logins (password: Demo@1234):</p>
            {['apollo@docnest.demo', 'fortis@docnest.demo', 'kauvery@docnest.demo', 'ggh@docnest.demo', 'miot@docnest.demo'].map((e) => (
              <p key={e} className="text-gray-500 cursor-pointer hover:text-dn-indigo-deep" onClick={() => setForm({ email: e, password: 'Demo@1234' })}>{e}</p>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            New hospital? <Link to="/hospital/register" className="font-semibold" style={{ color: '#6060C0' }}>Register here →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
