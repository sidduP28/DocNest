import { useNavigate } from 'react-router-dom';
import { Star, MapPin, ChevronRight } from 'lucide-react';

export default function PriceCompareCard({ hospital, testName, allPrices, userLat, userLng, rank }) {
  const navigate = useNavigate();
  const price = hospital.testPrices?.[testName];
  const maxPrice = Math.max(...allPrices.filter(Boolean));
  const savings = maxPrice - price;
  const isCheapest = rank === 0;

  if (price === undefined || price === null) return null;

  return (
    <div className={`bg-white rounded-xl border-2 p-4 card-hover flex items-center justify-between gap-4 ${isCheapest ? '' : ''}`}
      style={{ borderColor: isCheapest ? '#5EC4C4' : '#C8EEE8' }}>
      {/* Rank badge */}
      <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 text-sm font-bold ${isCheapest ? 'text-white' : 'text-gray-500 bg-gray-100'}`}
        style={isCheapest ? { background: '#5EC4C4' } : {}}>
        #{rank + 1}
      </div>

      {/* Hospital info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="font-bold text-sm truncate" style={{ color: '#100A50' }}>{hospital.name}</h4>
          {isCheapest && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold shrink-0" style={{ background: '#C8EEE8', color: '#0d7377' }}>
              ✓ Cheapest
            </span>
          )}
          {hospital.verificationStatus === 'verified' && (
            <span className="text-xs px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#ede9fe', color: '#5b21b6' }}>Verified</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
          <span className="flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-yellow-400" />{hospital.ratings?.toFixed(1)}</span>
          {hospital.distance !== undefined && (
            <span className="flex items-center gap-1"><MapPin size={10} style={{ color: '#4EB0C8' }} />{hospital.distance?.toFixed(1)} km</span>
          )}
        </div>
      </div>

      {/* Price + savings */}
      <div className="text-right shrink-0">
        <p className="text-xl font-black" style={{ color: '#100A50' }}>₹{price.toLocaleString()}</p>
        {savings > 0 ? (
          <p className="text-xs font-semibold" style={{ color: '#166534' }}>Save ₹{savings.toLocaleString()}</p>
        ) : (
          <p className="text-xs text-gray-400">Most expensive</p>
        )}
      </div>

      {/* Book button */}
      <button onClick={() => navigate(`/hospitals/${hospital._id}`)}
        className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-full text-white transition-all hover:opacity-90"
        style={{ background: '#6060C0' }}>
        Book <ChevronRight size={12} />
      </button>
    </div>
  );
}
