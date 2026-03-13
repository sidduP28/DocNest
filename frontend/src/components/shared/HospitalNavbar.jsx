import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import { Activity, LayoutDashboard, Users, List, Droplets, Calendar, LogOut, AlertTriangle } from 'lucide-react';

export default function HospitalNavbar() {
  const { hospital, logout } = useHospitalAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => location.pathname === path
    ? 'text-dn-teal border-b-2 border-dn-teal'
    : 'text-gray-300 hover:text-dn-teal transition-colors';

  async function handleLogout() {
    await logout();
    navigate('/hospital/login');
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16" style={{ background: '#100A50' }}>
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo + portal badge */}
        <Link to="/hospital/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#4EB0C8' }}>
            <Activity size={18} className="text-white" />
          </div>
          <span className="text-xl font-bold" style={{ color: '#5EC4C4' }}>DocNest</span>
          <span className="text-xs px-2 py-0.5 rounded-full ml-1 font-medium" style={{ background: '#6060C0', color: 'white' }}>
            Partner Portal
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-5">
          {hospital && (
            <>
              <Link to="/hospital/dashboard" className={`text-sm font-medium pb-1 flex items-center gap-1 ${isActive('/hospital/dashboard')}`}>
                <LayoutDashboard size={14} /> Dashboard
              </Link>
              <Link to="/hospital/doctors" className={`text-sm font-medium pb-1 flex items-center gap-1 ${isActive('/hospital/doctors')}`}>
                <Users size={14} /> Doctors
              </Link>
              <Link to="/hospital/blood/raise" className={`text-sm font-medium pb-1 flex items-center gap-1 ${isActive('/hospital/blood/raise')}`}>
                <Droplets size={14} /> Blood
              </Link>
              <Link to="/hospital/appointments" className={`text-sm font-medium pb-1 flex items-center gap-1 ${isActive('/hospital/appointments')}`}>
                <Calendar size={14} /> Appointments
              </Link>
            </>
          )}
        </div>

        {/* Hospital name + logout */}
        <div className="flex items-center gap-3">
          {hospital && (
            <span className="text-sm text-gray-300 hidden md:block truncate max-w-[150px]">
              {hospital.name?.split(' ').slice(0, 2).join(' ')}
            </span>
          )}
          <button onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors">
            <LogOut size={15} /> Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
