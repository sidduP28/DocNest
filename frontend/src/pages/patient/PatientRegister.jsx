import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { usePatientAuth } from '../../context/PatientAuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import PatientNavbar from '../../components/shared/PatientNavbar';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const BG_COLORS = {
  'A+': '#fee2e2', 'A-': '#fce7f3', 'B+': '#e0e7ff', 'B-': '#ede9fe',
  'O+': '#dcfce7', 'O-': '#d1fae5', 'AB+': '#fef9c3', 'AB-': '#ffedd5',
};
const BG_TEXT = {
  'A+': '#991b1b', 'A-': '#9d174d', 'B+': '#3730a3', 'B-': '#5b21b6',
  'O+': '#166534', 'O-': '#065f46', 'AB+': '#854d0e', 'AB-': '#9a3412',
};

const STEPS = ['Account', 'Contact', 'Blood Group', 'Location'];

export default function PatientRegister() {
  const navigate = useNavigate();
  const { register, getToken, setPatient } = usePatientAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '',
    phone: '', city: '', pincode: '',
    bloodGroup: '',
    location: null, manualCity: '', manualPincode: '',
  });

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  function validateStep() {
    const errs = {};
    if (step === 0) {
      if (!form.name.trim()) errs.name = 'Name is required';
      if (!form.email.includes('@')) errs.email = 'Valid email required';
      if (form.password.length < 6) errs.password = 'Min 6 characters';
      if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    }
    if (step === 1) {
      if (!form.phone.match(/^\d{10}$/)) errs.phone = '10-digit phone number required';
      if (!form.city.trim()) errs.city = 'City is required';
    }
    if (step === 2) {
      if (!form.bloodGroup) errs.bloodGroup = 'Please select your blood group';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function getLocation() {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set('location', { lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
        toast.success('Location detected!');
      },
      () => {
        setLocLoading(false);
        toast.error('Location denied. Use manual entry.');
      }
    );
  }

  async function handleSubmit() {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const { success, uid, error } = await register(form.email, form.password);
      if (!success) { toast.error(error); setLoading(false); return; }

      // Create MongoDB profile
      const location = form.location || { lat: 13.0827, lng: 80.2707 };
      const res = await axios.post(`${API}/api/patient/register`, {
        firebaseUid: uid, name: form.name, email: form.email,
        phone: form.phone, city: form.city || form.manualCity,
        pincode: form.pincode || form.manualPincode,
        bloodGroup: form.bloodGroup, location,
      });
      setPatient(res.data);
      toast.success('Welcome to DocNest!');
      navigate('/dashboard');
    } catch (err) {
      if (!err.response) {
        // Network error — backend not reachable (e.g. no backend on Vercel)
        toast.error('Server unavailable. Your Firebase account was created but profile could not be saved. Please contact support.');
      } else {
        toast.error(err.response?.data?.error || 'Registration failed');
      }
    }
    setLoading(false);
  }

  const mapCenter = form.location ? [form.location.lat, form.location.lng] : [13.0827, 80.2707];

  return (
    <div className="min-h-screen pt-20" style={{ background: 'linear-gradient(135deg, #100A50 0%, #302090 100%)' }}>
      <PatientNavbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-xs text-gray-300 mb-2">
            {STEPS.map((s, i) => (
              <span key={s} className={`font-medium ${i <= step ? 'text-white' : 'text-gray-500'}`}>{s}</span>
            ))}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: '#5EC4C4' }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-black mb-1" style={{ color: '#100A50' }}>
            {step === 0 && 'Create Account'}
            {step === 1 && 'Contact Info'}
            {step === 2 && 'Blood Group'}
            {step === 3 && 'Your Location'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">Step {step + 1} of {STEPS.length}</p>

          {/* Step 0 */}
          {step === 0 && (
            <div className="space-y-4">
              <Field label="Full Name" error={errors.name}>
                <input className="form-input" placeholder="Arjun Sharma" value={form.name} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Email" error={errors.email}>
                <input type="email" className="form-input" placeholder="arjun@email.com" value={form.email} onChange={(e) => set('email', e.target.value)} />
              </Field>
              <Field label="Password" error={errors.password}>
                <input type="password" className="form-input" placeholder="Min 6 characters" value={form.password} onChange={(e) => set('password', e.target.value)} />
              </Field>
              <Field label="Confirm Password" error={errors.confirm}>
                <input type="password" className="form-input" placeholder="Re-enter password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
              </Field>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <Field label="Phone Number" error={errors.phone}>
                <input type="tel" className="form-input" placeholder="9841234567" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
              </Field>
              <Field label="City" error={errors.city}>
                <input className="form-input" placeholder="Chennai" value={form.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="Pincode">
                <input className="form-input" placeholder="600006" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} />
              </Field>
            </div>
          )}

          {/* Step 2 — Blood group */}
          {step === 2 && (
            <div>
              <p className="text-sm text-gray-500 mb-4">Select your blood group — this enables the Emergency Blood Network</p>
              {errors.bloodGroup && <p className="text-red-500 text-xs mb-3">{errors.bloodGroup}</p>}
              <div className="grid grid-cols-4 gap-3">
                {BLOOD_GROUPS.map((bg) => (
                  <button key={bg} onClick={() => set('bloodGroup', bg)}
                    className={`h-16 rounded-xl font-black text-xl transition-all border-2 ${form.bloodGroup === bg ? 'scale-105 shadow-lg' : 'hover:scale-102'}`}
                    style={{
                      background: BG_COLORS[bg],
                      color: BG_TEXT[bg],
                      borderColor: form.bloodGroup === bg ? BG_TEXT[bg] : 'transparent',
                    }}>
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 — Location */}
          {step === 3 && (
            <div>
              <button onClick={getLocation} disabled={locLoading}
                className="w-full py-3 rounded-xl font-semibold text-white mb-4 transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: '#4EB0C8' }}>
                {locLoading ? <span className="spinner w-5 h-5 border-2" /> : '📍'}
                {locLoading ? 'Detecting…' : 'Allow Location Access'}
              </button>

              {form.location && (
                <div className="h-48 rounded-xl overflow-hidden mb-4 border" style={{ borderColor: '#C8EEE8' }}>
                  <MapContainer center={mapCenter} zoom={14} className="h-full w-full" dragging={false} zoomControl={false}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={mapCenter}>
                      <Popup>Your Location</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              )}

              {!form.location && (
                <div className="mt-2 p-4 rounded-xl border" style={{ borderColor: '#C8EEE8', background: '#f8fafc' }}>
                  <p className="text-sm text-gray-500 mb-2">Or enter manually:</p>
                  <input className="form-input mb-2" placeholder="City" value={form.manualCity} onChange={(e) => set('manualCity', e.target.value)} />
                  <input className="form-input" placeholder="Pincode" value={form.manualPincode} onChange={(e) => set('manualPincode', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-3 rounded-full border-2 font-semibold text-sm hover:bg-gray-50"
                style={{ borderColor: '#C8EEE8', color: '#100A50' }}>
                ← Back
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => { if (validateStep()) setStep((s) => s + 1); }}
                className="flex-1 py-3 rounded-full text-white font-semibold text-sm hover:opacity-90"
                style={{ background: '#6060C0' }}>
                Continue →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 py-3 rounded-full text-white font-bold text-sm hover:opacity-90"
                style={{ background: '#6060C0' }}>
                {loading ? 'Creating Account…' : 'Create Account 🎉'}
              </button>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold" style={{ color: '#6060C0' }}>Login</Link>
          </p>
        </div>
      </div>

      <style>{`.form-input { width: 100%; border: 2px solid #C8EEE8; border-radius: 12px; padding: 10px 14px; font-size: 0.9rem; outline: none; transition: border-color 0.2s; } .form-input:focus { border-color: #4EB0C8; }`}</style>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{ color: '#100A50' }}>{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
