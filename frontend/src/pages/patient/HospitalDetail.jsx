import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { useSocket } from '../../context/SocketContext';
import PatientNavbar from '../../components/shared/PatientNavbar';
import DoctorSlotPicker from '../../components/patient/DoctorSlotPicker';
import WaitTimeBadge from '../../components/patient/WaitTimeBadge';
import { MapPin, Phone, Star, ArrowLeft } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || '';
const TABS = ['Doctors', 'Tests & Prices', 'About'];
const TEST_LABELS = { bloodTest: 'Blood Test', MRI: 'MRI', xRay: 'X-Ray', ECG: 'ECG', urineCulture: 'Urine Culture', ctScan: 'CT Scan' };

export default function HospitalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patient } = usePatientAuth();
  const { socket } = useSocket();
  const [hospital, setHospital] = useState(null);
  const [allHospitals, setAllHospitals] = useState([]);
  const [waitData, setWaitData] = useState({});
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [hRes, allRes] = await Promise.all([
        axios.get(`${API}/api/hospitals/${id}`),
        axios.get(`${API}/api/hospitals`)
      ]);
      setHospital(hRes.data);
      setAllHospitals(allRes.data);
      
      // Fetch wait time separately so it doesn't block hospital details if it fails
      try {
        const waitRes = await axios.get(`${API}/api/hospitals/${id}/waittime`);
        const wMap = {};
        if (waitRes.data && waitRes.data.doctors) {
          waitRes.data.doctors.forEach(d => wMap[d.doctorId] = d);
        }
        setWaitData(wMap);
      } catch (waitErr) {
        console.warn('Wait time data fetch failed:', waitErr);
      }
    } catch (err) {
      console.error('Error loading hospital data:', err);
    }
  }

  useEffect(() => {
    async function load() {
      await loadData();
      setLoading(false);
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    
    // Join the hospital room to receive its specific updates
    socket.emit('joinHospitalRoom', { hospitalId: id });
    
    // Listen for slot updates from the hospital admin side
    socket.on('slotsUpdated', (data) => {
      if (data.hospitalId === id) {
        // Silently reload the hospital data so patient sees new slots
        loadData();
      }
    });

    socket.on('queueUpdate', (data) => {
      if (data.hospitalId === id) {
        setWaitData(prev => ({ ...prev, [data.doctorId]: data }));
      }
    });

    return () => {
      socket.off('slotsUpdated');
      socket.off('queueUpdate');
    };
  }, [socket, id]);

  function getAvgPrice(testKey) {
    const prices = allHospitals.map((h) => h.testPrices?.[testKey]).filter(Boolean);
    return prices.length ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
  }

  if (loading) return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <PatientNavbar />
      <div className="spinner" />
    </div>
  );

  if (!hospital) return (
    <div className="min-h-screen pt-16 flex items-center justify-center">
      <PatientNavbar />
      <p className="text-gray-400">Hospital not found</p>
    </div>
  );

  const mapCenter = [hospital.location?.lat || 13.0827, hospital.location?.lng || 80.2707];

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <PatientNavbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        {/* Hospital Header */}
        <div className="bg-white rounded-2xl border p-5 mb-4" style={{ borderColor: '#C8EEE8' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <h1 className="text-xl font-black" style={{ color: '#100A50' }}>{hospital.name}</h1>
                {hospital.verificationStatus === 'verified' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: '#c8eee8', color: '#0d7377' }}>✓ Verified</span>
                )}
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: hospital.type === 'Government' ? '#dcfce7' : '#ede9fe', color: hospital.type === 'Government' ? '#166534' : '#5b21b6' }}>
                  {hospital.type}
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1 mb-1"><MapPin size={14} />{hospital.address}</p>
              <p className="text-sm text-gray-500 flex items-center gap-1"><Phone size={14} />{hospital.phone}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((i) => (
                  <Star key={i} size={14} className={i <= Math.round(hospital.ratings) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'} />
                ))}
                <span className="text-sm font-bold ml-1" style={{ color: '#100A50' }}>{hospital.ratings?.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white rounded-xl border p-1 mb-4" style={{ borderColor: '#C8EEE8' }}>
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${tab === i ? 'text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
              style={tab === i ? { background: '#6060C0' } : {}}>
              {t}
            </button>
          ))}
        </div>

        {/* DOCTORS TAB */}
        {tab === 0 && (
          <div className="space-y-4">
            {hospital.doctors?.length === 0 && <p className="text-center text-gray-400 py-8">No doctors listed</p>}
            {hospital.doctors?.map((doc) => (
              <DoctorSlotPicker key={doc._id} doctor={doc} hospitalId={hospital._id} hospitalName={hospital.name} hospital={hospital} waitInfo={waitData[doc._id]} />
            ))}
          </div>
        )}

        {/* TESTS & PRICES TAB */}
        {tab === 1 && (
          <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#C8EEE8' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="text-left p-4 font-semibold text-gray-500">Test</th>
                  <th className="text-right p-4 font-semibold text-gray-500">This Hospital</th>
                  <th className="text-right p-4 font-semibold text-gray-500">Platform Avg</th>
                  <th className="text-right p-4 font-semibold text-gray-500">Savings</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(TEST_LABELS).map(([key, label]) => {
                  const price = hospital.testPrices?.[key];
                  const avg = getAvgPrice(key);
                  const savings = avg - (price || 0);
                  return (
                    <tr key={key} className="border-t" style={{ borderColor: '#C8EEE8' }}>
                      <td className="p-4 font-medium" style={{ color: '#100A50' }}>{label}</td>
                      <td className="p-4 text-right font-bold" style={{ color: '#100A50' }}>₹{price?.toLocaleString() || '-'}</td>
                      <td className="p-4 text-right text-gray-400">₹{avg?.toLocaleString()}</td>
                      <td className="p-4 text-right">
                        {price !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${savings > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {savings > 0 ? `Save ₹${savings}` : `+₹${Math.abs(savings)}`}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <button onClick={() => navigate(`/compare?test=${key}`)}
                          className="text-xs px-3 py-1 rounded-full text-white font-medium"
                          style={{ background: '#6060C0' }}>
                          Compare
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ABOUT TAB */}
        {tab === 2 && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border p-5" style={{ borderColor: '#C8EEE8' }}>
              <h3 className="font-bold mb-3" style={{ color: '#100A50' }}>Hospital Information</h3>
              <div className="space-y-2 text-sm">
                <InfoRow label="Type" value={hospital.type} />
                <InfoRow label="Address" value={hospital.address} />
                <InfoRow label="Phone" value={hospital.phone} />
                <InfoRow label="Email" value={hospital.email || 'N/A'} />
                <InfoRow label="Verification" value={hospital.verificationStatus === 'verified' ? '✓ Fully Verified' : hospital.verificationStatus} />
                <InfoRow label="Blood Bank" value={hospital.bloodBankLicense ? '✓ Licensed' : 'Not available'} />
              </div>
            </div>
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#C8EEE8' }}>
              <div className="h-56">
                <MapContainer center={mapCenter} zoom={15} className="h-full w-full">
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={mapCenter}>
                    <Popup>{hospital.name}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-medium" style={{ color: '#100A50' }}>{value}</span>
    </div>
  );
}
