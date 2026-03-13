import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { usePatientAuth } from '../../context/PatientAuthContext';
import PatientNavbar from '../../components/shared/PatientNavbar';
import PriceCompareCard from '../../components/patient/PriceCompareCard';
import { Search } from 'lucide-react';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';
const TESTS = { bloodTest: 'Blood Test', MRI: 'MRI', xRay: 'X-Ray', ECG: 'ECG', urineCulture: 'Urine Culture', ctScan: 'CT Scan' };

export default function PriceComparison() {
  const [searchParams] = useSearchParams();
  const { patient } = usePatientAuth();
  const [hospitals, setHospitals] = useState([]);
  const [selected, setSelected] = useState(searchParams.get('test') || 'bloodTest');
  const [loading, setLoading] = useState(true);

  const userLat = patient?.location?.lat || 13.0827;
  const userLng = patient?.location?.lng || 80.2707;

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/api/hospitals?lat=${userLat}&lng=${userLng}&radius=100`);
        setHospitals(res.data);
      } catch { }
      setLoading(false);
    }
    load();
  }, []);

  const sorted = [...hospitals]
    .filter((h) => h.testPrices?.[selected] !== undefined)
    .sort((a, b) => (a.testPrices?.[selected] || 0) - (b.testPrices?.[selected] || 0));

  const allPrices = sorted.map((h) => h.testPrices?.[selected]);

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <PatientNavbar />
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black mb-1" style={{ color: '#100A50' }}>Price Comparison</h1>
        <p className="text-gray-400 text-sm mb-6">Compare diagnostic test prices across all 5 partner hospitals</p>

        {/* Test selector */}
        <div className="bg-white rounded-2xl border p-4 mb-6" style={{ borderColor: '#C8EEE8' }}>
          <label className="block text-sm font-semibold mb-3" style={{ color: '#100A50' }}>Select Test</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {Object.entries(TESTS).map(([key, label]) => (
              <button key={key} onClick={() => setSelected(key)}
                className={`py-2 px-2 rounded-xl text-xs font-semibold text-center border-2 transition-all ${selected === key ? 'text-white' : 'border-gray-200 text-gray-600 hover:border-dn-teal-mid'}`}
                style={selected === key ? { background: '#6060C0', borderColor: '#6060C0' } : {}}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="space-y-3">{[1,2,3,4,5].map((k) => <div key={k} className="skeleton h-20 rounded-xl" />)}</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Search size={40} className="mx-auto mb-3" />
            <p>No hospitals have pricing for {TESTS[selected]}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold" style={{ color: '#100A50' }}>{TESTS[selected]} — Price Comparison</p>
              <span className="text-xs text-gray-400">{sorted.length} hospitals</span>
            </div>
            <div className="space-y-3">
              {sorted.map((h, i) => (
                <PriceCompareCard key={h._id} hospital={h} testName={selected} allPrices={allPrices} rank={i} userLat={userLat} userLng={userLng} />
              ))}
            </div>
            <div className="mt-4 p-3 rounded-xl text-xs text-center text-gray-400" style={{ background: 'rgba(200,238,232,0.3)' }}>
              Savings calculated vs. the most expensive option among our partners.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
