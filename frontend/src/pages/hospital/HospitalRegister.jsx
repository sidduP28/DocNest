import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import HospitalNavbar from '../../components/shared/HospitalNavbar';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';
const STEPS = ['Hospital Info', 'Contact & Docs', 'Verification'];

export default function HospitalRegister() {
  const navigate = useNavigate();
  const { register } = useHospitalAuth();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [uploadProgress, setUploadProgress] = useState(0);
  const [certUrl, setCertUrl] = useState('');
  const [form, setForm] = useState({
    name: '', type: 'Private', address: '', city: '', pincode: '',
    location: null, manualLat: '', manualLng: '',
    contactPersonName: '', contactPersonDesignation: '', email: '', password: '', phone: '',
    gstNumber: '', bloodBankLicense: false,
    selfDeclaration: false,
  });

  function set(field, value) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  }

  function validateStep() {
    const errs = {};
    if (step === 0) {
      if (!form.name.trim()) errs.name = 'Hospital name is required';
      if (!form.address.trim()) errs.address = 'Address is required';
    }
    if (step === 1) {
      if (!form.contactPersonName.trim()) errs.contactPersonName = 'Contact person required';
      if (!form.email.includes('@')) errs.email = 'Valid email required';
      if (form.password.length < 6) errs.password = 'Min 6 characters';
    }
    if (step === 2) {
      if (!form.selfDeclaration) errs.selfDeclaration = 'Please check the declaration';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function getLocation() {
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { set('location', { lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocLoading(false); toast.success('Location detected!'); },
      () => { setLocLoading(false); toast.error('Location denied. Enter manually.'); }
    );
  }

  async function uploadCert(file) {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await axios.post(`${API}/api/hospital/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (p) => setUploadProgress(Math.round((p.loaded * 100) / p.total)),
      });
      setCertUrl(res.data.url);
      toast.success('Document uploaded!');
    } catch { toast.error('Upload failed'); }
  }

  async function handleSubmit() {
    if (!validateStep()) return;
    setLoading(true);
    try {
      const { success, uid, error } = await register(form.email, form.password);
      if (!success) { toast.error(error); setLoading(false); return; }

      const loc = form.location || { lat: parseFloat(form.manualLat) || 0, lng: parseFloat(form.manualLng) || 0 };
      await axios.post(`${API}/api/hospital/register`, {
        firebaseUid: uid, name: form.name, type: form.type, address: form.address,
        city: form.city, pincode: form.pincode, location: loc,
        contactPersonName: form.contactPersonName, contactPersonDesignation: form.contactPersonDesignation,
        email: form.email, phone: form.phone, gstNumber: form.gstNumber,
        bloodBankLicense: form.bloodBankLicense, registrationCertUrl: certUrl,
      });

      toast.success('Registration submitted!');
      navigate('/hospital/login', { state: { message: 'Registration submitted. Seeded demo hospitals are pre-verified and can log in immediately.' } });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    }
    setLoading(false);
  }

  const mapCenter = form.location ? [form.location.lat, form.location.lng] : [13.0827, 80.2707];

  return (
    <div className="min-h-screen pt-20" style={{ background: 'linear-gradient(135deg, #100A50 0%, #302090 100%)' }}>
      <HospitalNavbar />
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-300 mb-2">
            {STEPS.map((s, i) => <span key={s} className={i <= step ? 'text-white font-medium' : 'text-gray-500'}>{s}</span>)}
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
            <div className="h-full rounded-full transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%`, background: '#5EC4C4' }} />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-2xl font-black mb-1" style={{ color: '#100A50' }}>
            {step === 0 && 'Hospital Info'}{step === 1 && 'Contact & Documents'}{step === 2 && 'Verification'}
          </h2>
          <p className="text-gray-400 text-sm mb-6">Step {step + 1} of {STEPS.length}</p>

          {/* Step 0 */}
          {step === 0 && (
            <div className="space-y-4">
              <F label="Hospital Name" error={errors.name}><input className="fi" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Apollo Hospitals" /></F>
              <F label="Type">
                <select className="fi" value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {['Government', 'Private', 'Clinic', 'Diagnostic Lab'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </F>
              <F label="Full Address" error={errors.address}><textarea className="fi" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Full hospital address" /></F>
              <div className="grid grid-cols-2 gap-3">
                <F label="City"><input className="fi" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Chennai" /></F>
                <F label="Pincode"><input className="fi" value={form.pincode} onChange={(e) => set('pincode', e.target.value)} placeholder="600006" /></F>
              </div>
              <div>
                <button onClick={getLocation} disabled={locLoading} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{ background: '#4EB0C8' }}>
                  {locLoading ? 'Detecting…' : '📍 Auto-detect GPS Location'}
                </button>
                {form.location && (
                  <div className="h-40 rounded-xl overflow-hidden mt-2 border" style={{ borderColor: '#C8EEE8' }}>
                    <MapContainer center={mapCenter} zoom={14} className="h-full w-full" dragging={false} zoomControl={false}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <Marker position={mapCenter}><Popup>Hospital Location</Popup></Marker>
                    </MapContainer>
                  </div>
                )}
                {!form.location && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <input className="fi" placeholder="Lat e.g. 13.0612" value={form.manualLat} onChange={(e) => set('manualLat', e.target.value)} />
                    <input className="fi" placeholder="Lng e.g. 80.2478" value={form.manualLng} onChange={(e) => set('manualLng', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <F label="Contact Person Name" error={errors.contactPersonName}><input className="fi" value={form.contactPersonName} onChange={(e) => set('contactPersonName', e.target.value)} placeholder="Dr. Admin Name" /></F>
              <F label="Designation"><input className="fi" value={form.contactPersonDesignation} onChange={(e) => set('contactPersonDesignation', e.target.value)} placeholder="Medical Superintendent" /></F>
              <F label="Email" error={errors.email}><input type="email" className="fi" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="admin@hospital.com" /></F>
              <F label="Password" error={errors.password}><input type="password" className="fi" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Min 6 characters" /></F>
              <F label="Phone"><input type="tel" className="fi" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="044-XXXXXXXX" /></F>
              <F label="GST Number (optional)"><input className="fi" value={form.gstNumber} onChange={(e) => set('gstNumber', e.target.value)} placeholder="27AAPFU0939F1ZV" /></F>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.bloodBankLicense} onChange={(e) => set('bloodBankLicense', e.target.checked)} />
                <span className="text-sm" style={{ color: '#100A50' }}>We have a Blood Bank License</span>
              </label>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#100A50' }}>Upload Registration Certificate</label>
                <input type="file" accept="image/*,.pdf"
                  onChange={(e) => uploadCert(e.target.files[0])}
                  className="w-full text-sm border-2 rounded-xl p-2" style={{ borderColor: '#C8EEE8', borderStyle: 'dashed' }} />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: '#f0f0f0' }}>
                    <div className="h-full rounded-full" style={{ width: `${uploadProgress}%`, background: '#4EB0C8' }} />
                  </div>
                )}
                {certUrl && <p className="text-xs text-green-600 mt-1">✓ Document uploaded</p>}
              </div>
              <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border" style={{ borderColor: errors.selfDeclaration ? '#fca5a5' : '#C8EEE8' }}>
                <input type="checkbox" className="mt-0.5" checked={form.selfDeclaration} onChange={(e) => set('selfDeclaration', e.target.checked)} />
                <span className="text-sm text-gray-600">I confirm all information provided is legally accurate and I am authorised to register this hospital on DocNest.</span>
              </label>
              {errors.selfDeclaration && <p className="text-red-500 text-xs">{errors.selfDeclaration}</p>}
              <div className="p-3 rounded-xl text-xs text-gray-500" style={{ background: 'rgba(200,238,232,0.3)' }}>
                ℹ️ New registrations start with "pending" status. For this demo, use the pre-seeded hospitals which are already verified.
              </div>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-3 rounded-full border-2 font-semibold text-sm" style={{ borderColor: '#C8EEE8', color: '#100A50' }}>← Back</button>
            )}
            {step < STEPS.length - 1 ? (
              <button onClick={() => { if (validateStep()) setStep((s) => s + 1); }} className="flex-1 py-3 rounded-full text-white font-semibold text-sm" style={{ background: '#6060C0' }}>Continue →</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 rounded-full text-white font-bold text-sm" style={{ background: '#6060C0' }}>
                {loading ? 'Submitting…' : 'Submit Registration'}
              </button>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-4">Already registered? <Link to="/hospital/login" className="font-semibold" style={{ color: '#6060C0' }}>Login</Link></p>
        </div>
      </div>
      <style>{`.fi { width:100%;border:2px solid #C8EEE8;border-radius:12px;padding:10px 14px;font-size:.85rem;outline:none; } .fi:focus{border-color:#4EB0C8;}`}</style>
    </div>
  );
}

function F({ label, error, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-1.5" style={{ color: '#100A50' }}>{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}
