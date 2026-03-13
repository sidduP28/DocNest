import { Link, useNavigate, useLocation } from 'react-router-dom';
import { usePatientAuth } from '../../context/PatientAuthContext';
import { Activity, Map, BarChart2, LayoutDashboard, LogIn, UserPlus, LogOut } from 'lucide-react';

export default function PatientNavbar() {
  const { patient, logout } = usePatientAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path
    ? 'text-dn-teal border-b-2 border-dn-teal'
    : 'text-gray-300 hover:text-dn-teal transition-colors';

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16" style={{ background: '#100A50' }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#4EB0C8' }}>
            <Activity size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold" style={{ color: '#5EC4C4' }}>DocNest</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-6">
          {patient && (
            <>
              <Link to="/hospitals" className={`flex items-center gap-1.5 text-sm font-medium pb-1 ${isActive('/hospitals')}`}>
                <Map size={15} /> Hospitals
              </Link>
              <Link to="/compare" className={`flex items-center gap-1.5 text-sm font-medium pb-1 ${isActive('/compare')}`}>
                <BarChart2 size={15} /> Compare Prices
              </Link>
              <Link to="/dashboard" className={`flex items-center gap-1.5 text-sm font-medium pb-1 ${isActive('/dashboard')}`}>
                <LayoutDashboard size={15} /> Dashboard
              </Link>
            </>
          )}
        </div>

        {/* Auth buttons */}
        <div className="flex items-center gap-3">
          {patient ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: '#6060C0' }}>
                  {patient.name?.[0]?.toUpperCase() || 'P'}
                </div>
                <span className="text-sm text-gray-300 hidden md:block">{patient.name?.split(' ')[0]}</span>
              </div>
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors">
                <LogOut size={15} /> Logout
              </button>
            </div>
          ) : (
            <>
              <Link to="/login"
                className="text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-1">
                <LogIn size={15} /> Login
              </Link>
              <Link to="/register"
                className="text-sm text-white px-4 py-1.5 rounded-full font-medium transition-all hover:opacity-90"
                style={{ background: '#6060C0' }}>
                <UserPlus size={14} className="inline mr-1" /> Register
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
