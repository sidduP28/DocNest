import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { Activity } from 'lucide-react';
import PatientNavbar from '../../components/shared/PatientNavbar';
import toast from 'react-hot-toast';

export default function PatientLogin() {
  const navigate = useNavigate();
  const { login, loginWithGoogle, patient } = usePatientAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (patient) { navigate('/dashboard'); return null; }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { success, error: err } = await login(form.email, form.password);
    if (success) { toast.success('Welcome back!'); navigate('/dashboard'); }
    else setError(err);
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const { success, user, error: err } = await loginWithGoogle();
    if (success) {
      // If profile doesn't exist, redirect to register
      if (!user) { toast.success('Logged in!'); navigate('/dashboard'); }
      else { navigate('/dashboard'); }
    } else setError(err);
    setLoading(false);
  }

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #100A50 0%, #302090 100%)' }}>
      <PatientNavbar />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'rgba(94,196,196,0.15)', border: '2px solid rgba(94,196,196,0.3)' }}>
            <Activity size={32} style={{ color: '#5EC4C4' }} />
          </div>
          <h1 className="text-3xl font-black text-white">Welcome Back</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to DocNest Patient Portal</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm font-medium" style={{ background: '#fee2e2', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#100A50' }}>Email</label>
              <input type="email" required
                value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{ borderColor: '#C8EEE8' }}
                onFocus={(e) => (e.target.style.borderColor = '#4EB0C8')}
                onBlur={(e) => (e.target.style.borderColor = '#C8EEE8')}
                placeholder="arjun@docnest.demo" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ color: '#100A50' }}>Password</label>
              <input type="password" required
                value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                style={{ borderColor: '#C8EEE8' }}
                onFocus={(e) => (e.target.style.borderColor = '#4EB0C8')}
                onBlur={(e) => (e.target.style.borderColor = '#C8EEE8')}
                placeholder="Demo@1234" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-full text-white font-bold transition-all hover:opacity-90"
              style={{ background: '#6060C0' }}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px" style={{ background: '#C8EEE8' }} />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px" style={{ background: '#C8EEE8' }} />
          </div>

          <button onClick={handleGoogle} disabled={loading}
            className="w-full py-3 rounded-full border-2 font-semibold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-all"
            style={{ borderColor: '#C8EEE8', color: '#100A50' }}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <div className="mt-4 text-center space-y-2">
            <p className="text-xs text-gray-400">
              No account?{' '}
              <Link to="/register" className="font-semibold" style={{ color: '#6060C0' }}>Register here</Link>
            </p>
            <p className="text-xs text-gray-400">
              Hospital admin?{' '}
              <Link to="/hospital/login" className="font-semibold" style={{ color: '#4EB0C8' }}>Hospital Login →</Link>
            </p>
            <div className="mt-3 p-2 rounded-lg text-xs text-gray-400" style={{ background: '#f8fafc', borderColor: '#C8EEE8' }}>
              Demo: arjun@docnest.demo / Demo@1234
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
