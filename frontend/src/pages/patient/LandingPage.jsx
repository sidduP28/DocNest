import { useNavigate } from 'react-router-dom';
import { Activity, MapPin, BarChart2, Droplets, ArrowRight } from 'lucide-react';
import PatientNavbar from '../../components/shared/PatientNavbar';
import { usePatientAuth } from '../../context/PatientAuthContext';

const PILLARS = [
  { icon: MapPin, title: 'Hospital Discovery', desc: 'Find verified hospitals near you with real-time availability and wait times.', color: '#4EB0C8' },
  { icon: BarChart2, title: 'Price Comparison', desc: 'Compare diagnostic test prices across hospitals — find the best value instantly.', color: '#6060C0' },
  { icon: Activity, title: 'AI Wait Time', desc: 'Smart wait time prediction based on queue, time of day, and day of week.', color: '#5EC4C4' },
  { icon: Droplets, title: 'Emergency Blood Network', desc: 'Real-time blood donation alerts sent to matching donors within 25 km.', color: '#7070CC' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { patient } = usePatientAuth();

  return (
    <div className="min-h-screen bg-white">
      <PatientNavbar />

      {/* Hero */}
      <section className="hero-gradient min-h-screen flex flex-col items-center justify-center text-center px-4 pt-16">
        <div className="max-w-4xl mx-auto">
          {/* Logo mark */}
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl"
            style={{ background: 'rgba(94,196,196,0.2)', border: '2px solid rgba(94,196,196,0.3)' }}>
            <Activity size={40} style={{ color: '#5EC4C4' }} />
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 leading-tight">
            Doc<span style={{ color: '#5EC4C4' }}>Nest</span>
          </h1>
          <p className="text-xl md:text-2xl font-light mb-4 max-w-2xl mx-auto"
            style={{ color: '#A8E4DC' }}>
            Your Trusted Healthcare Companion
          </p>
          <p className="text-lg font-semibold text-white mb-8">— Anywhere, Anytime —</p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <button
              onClick={() => navigate(patient ? '/dashboard' : '/login')}
              className="group flex items-center justify-center gap-2 px-8 py-4 rounded-full text-white font-bold text-lg shadow-xl transition-all hover:scale-105"
              style={{ background: '#6060C0' }}>
              Find a Hospital
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/hospital/register')}
              className="px-8 py-4 rounded-full font-bold text-lg transition-all hover:scale-105 border-2 border-white text-white hover:bg-white hover:text-dn-navy-darkest"
              style={{ color: 'white' }}>
              Register Your Hospital
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[['5+', 'Hospitals'], ['25km', 'Blood Network Radius'], ['Free', 'Platform']].map(([val, label]) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black" style={{ color: '#5EC4C4' }}>{val}</p>
                <p className="text-xs text-gray-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature pillars */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-4" style={{ color: '#100A50' }}>
            Everything You Need for <span style={{ color: '#4EB0C8' }}>Better Healthcare</span>
          </h2>
          <p className="text-center text-gray-500 mb-12 max-w-xl mx-auto text-sm">
            DocNest brings hospital discovery, transparent pricing, and emergency blood donation into one powerful platform.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PILLARS.map(({ icon: Icon, title, desc, color }) => (
              <div key={title} className="rounded-2xl p-6 card-hover border" style={{ borderColor: '#C8EEE8' }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: color + '20' }}>
                  <Icon size={24} style={{ color }} />
                </div>
                <h3 className="font-bold text-base mb-2" style={{ color: '#100A50' }}>{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="py-16 px-4" style={{ background: '#100A50' }}>
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-black text-white mb-4">Ready to get started?</h2>
          <p className="text-gray-400 mb-8 text-sm">Join thousands of patients finding better healthcare every day.</p>
          <button onClick={() => navigate('/register')}
            className="px-8 py-4 rounded-full text-white font-bold text-lg transition-all hover:scale-105"
            style={{ background: '#6060C0' }}>
            Create Free Account →
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-gray-400 border-t"
        style={{ borderColor: '#C8EEE8' }}>
        © 2024 DocNest · Built for better healthcare · Zero cost, maximum impact
      </footer>
    </div>
  );
}
