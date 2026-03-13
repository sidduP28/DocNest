import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import PatientNavbar from '../../components/shared/PatientNavbar';
import HospitalCard from '../../components/patient/HospitalCard';
import { haversine } from '../../utils/haversine';
import { Filter, SlidersHorizontal, X } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function createHospitalIcon(status) {
  const colors = { verified: '#5EC4C4', basic: '#f59e0b', pending: '#9ca3af' };
  const color = colors[status] || '#9ca3af';
  return L.divIcon({
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
    className: '', iconAnchor: [12, 12],
  });
}

const SPECIALTIES = ['All', 'Cardiology', 'Orthopedics', 'Neurology', 'General Surgery', 'Gynecology', 'Dermatology', 'Pediatrics', 'General Medicine', 'ENT', 'Oncology', 'Nephrology'];
const TYPES = ['All', 'Government', 'Private', 'Clinic', 'Diagnostic Lab'];

export default function HospitalMap() {
  const { patient } = usePatientAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const specialtyFromAI = searchParams.get('specialty');
  const [hospitals, setHospitals] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [specialty, setSpecialty] = useState('All');
  const [type, setType] = useState('All');
  const [maxDist, setMaxDist] = useState(50);
  const [sort, setSort] = useState('nearest');
  const [showFilters, setShowFilters] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(!!specialtyFromAI);

  const userLat = patient?.location?.lat || 13.0827;
  const userLng = patient?.location?.lng || 80.2707;

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/api/hospitals?lat=${userLat}&lng=${userLng}&radius=100`);
        const data = res.data.map((h) => ({
          ...h,
          distance: haversine(userLat, userLng, h.location?.lat, h.location?.lng),
        }));
        setHospitals(data);
        setFiltered(data);
      } catch { }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (specialtyFromAI) {
      setSpecialty(specialtyFromAI);
    }
  }, [specialtyFromAI]);

  useEffect(() => {
    let result = [...hospitals];
    if (specialty !== 'All') result = result.filter((h) => h.doctors?.some((d) => d.specialty === specialty));
    if (type !== 'All') result = result.filter((h) => h.type === type);
    result = result.filter((h) => h.distance <= maxDist);
    if (sort === 'nearest') result.sort((a, b) => a.distance - b.distance);
    else if (sort === 'rated') result.sort((a, b) => b.ratings - a.ratings);
    else if (sort === 'price') result.sort((a, b) => (a.testPrices?.bloodTest || 0) - (b.testPrices?.bloodTest || 0));
    setFiltered(result);
  }, [hospitals, specialty, type, maxDist, sort]);

  return (
    <div className="min-h-screen pt-16 flex flex-col" style={{ background: '#f8fafc' }}>
      <PatientNavbar />
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Sidebar */}
        <div className="w-full lg:w-80 xl:w-96 flex flex-col bg-white border-r" style={{ borderColor: '#C8EEE8' }}>
          {/* Banner */}
          {showAIBanner && specialtyFromAI && (
            <div className="bg-[#C8EEE8] text-[#100A50] text-sm px-4 py-3 border-l-4 border-teal-500 flex justify-between items-start shrink-0">
              <span>Showing <strong>{specialtyFromAI}</strong> doctors near you — recommended by AI Symptom Checker</span>
              <button onClick={() => setShowAIBanner(false)} className="text-[#100A50] hover:opacity-70 mt-0.5 ml-2"><X size={16} /></button>
            </div>
          )}

          {/* Filter bar */}
          <div className="p-4 border-b" style={{ borderColor: '#C8EEE8' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm" style={{ color: '#100A50' }}>Hospitals ({filtered.length})</h3>
              <button onClick={() => setShowFilters((v) => !v)} className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border"
                style={{ borderColor: '#C8EEE8', color: '#6060C0' }}>
                <SlidersHorizontal size={12} /> Filters
              </button>
            </div>
            {showFilters && (
              <div className="space-y-2 animate-fadeIn">
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full text-xs border rounded-lg px-2 py-1.5" style={{ borderColor: '#C8EEE8' }}>
                  {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full text-xs border rounded-lg px-2 py-1.5" style={{ borderColor: '#C8EEE8' }}>
                  {TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select value={sort} onChange={(e) => setSort(e.target.value)}
                  className="w-full text-xs border rounded-lg px-2 py-1.5" style={{ borderColor: '#C8EEE8' }}>
                  <option value="nearest">Nearest First</option>
                  <option value="rated">Best Rated</option>
                  <option value="price">Lowest Price</option>
                </select>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Max Distance</span><span>{maxDist} km</span>
                  </div>
                  <input type="range" min="5" max="50" value={maxDist} onChange={(e) => setMaxDist(Number(e.target.value))}
                    className="w-full" />
                </div>
              </div>
            )}
          </div>

          {/* Hospital list */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading ? (
              [1,2,3,4,5].map((k) => <div key={k} className="skeleton h-24 rounded-xl" />)
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Filter size={40} className="mx-auto mb-3" />
                <p className="text-sm">No hospitals match your filters</p>
              </div>
            ) : (
              filtered.map((h) => <HospitalCard key={h._id} hospital={h} userLat={userLat} userLng={userLng} />)
            )}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 h-[50vh] lg:h-auto">
          <MapContainer
            center={[userLat, userLng]} zoom={13}
            className="w-full h-full"
            style={{ minHeight: '50vh' }}>
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />

            {/* User location */}
            <Marker
              position={[userLat, userLng]}
              icon={L.divIcon({
                html: `<div class="user-location-dot" style="width:16px;height:16px;border-radius:50%;background:#4EB0C8;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)"></div>`,
                className: '', iconAnchor: [8, 8],
              })}>
              <Popup>📍 Your Location</Popup>
            </Marker>

            {/* Hospital markers */}
            {filtered.map((h) => (
              <Marker key={h._id}
                position={[h.location?.lat || 0, h.location?.lng || 0]}
                icon={createHospitalIcon(h.verificationStatus)}>
                <Popup>
                  <div className="min-w-[180px]">
                    <p className="font-bold text-sm" style={{ color: '#100A50' }}>{h.name}</p>
                    <p className="text-xs text-gray-500">{h.distance?.toFixed(1)} km · ⭐ {h.ratings?.toFixed(1)}</p>
                    <button
                      onClick={() => navigate(`/hospitals/${h._id}`)}
                      className="mt-2 w-full text-xs py-1.5 rounded-full text-white font-semibold"
                      style={{ background: '#6060C0' }}>
                      View Details →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
