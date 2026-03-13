import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import { useSocket } from '../../context/SocketContext';
import HospitalNavbar from '../../components/shared/HospitalNavbar';
import { Calendar, Users, Droplets, List, ArrowRight, Activity } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export default function HospitalDashboard() {
  const navigate = useNavigate();
  const { hospital, getToken } = useHospitalAuth();
  const { joinHospitalRoom } = useSocket();
  const [stats, setStats] = useState({ appointments: 0, avgWaitMinutes: null, avgWaitColor: 'green', bloodRequests: 0, doctors: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hospital?._id) joinHospitalRoom(hospital._id);
  }, [hospital?._id]);

  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const [apptRes, bloodRes, waitRes] = await Promise.all([
          axios.get(`${API}/api/appointments/hospital/${hospital._id}?date=today`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/api/blood-requests/hospital/${hospital._id}`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/api/hospitals/${hospital._id}/waittime`)
        ]);
        const availDoctors = hospital.doctors?.filter((d) => d.availabilityStatus === 'available').length || 0;
        const activeBlood = bloodRes.data.filter((r) => ['active', 'donors_responding'].includes(r.status)).length;
        
        let avgMins = null;
        let avgColor = 'green';
        if (waitRes.data && waitRes.data.doctors && waitRes.data.doctors.length > 0) {
          const totalMins = waitRes.data.doctors.reduce((sum, d) => sum + d.estimatedWaitMinutes, 0);
          avgMins = Math.round(totalMins / waitRes.data.doctors.length);
          if (avgMins >= 16 && avgMins <= 45) avgColor = 'amber';
          else if (avgMins >= 46) avgColor = 'red';
        }

        setStats({ appointments: apptRes.data.length, avgWaitMinutes: avgMins, avgWaitColor: avgColor, bloodRequests: activeBlood, doctors: availDoctors });
      } catch { }
      setLoading(false);
    }
    if (hospital) load();
  }, [hospital]);

  const STATUS_COLORS = { verified: { bg: '#c8eee8', text: '#0d7377' }, basic: { bg: '#fef3c7', text: '#92400e' }, pending: { bg: '#f1f5f9', text: '#475569' } };
  const statusStyle = STATUS_COLORS[hospital?.verificationStatus] || STATUS_COLORS.pending;

  const quickActions = [
    { icon: Droplets, label: 'Raise Blood Request', desc: hospital?.bloodBankLicense ? 'Blood bank licensed' : 'License required', path: '/hospital/blood/raise', color: '#dc2626' },
    { icon: Users, label: 'Manage Doctors', desc: `${stats.doctors} available`, path: '/hospital/doctors', color: '#6060C0' },
    { icon: Calendar, label: "Today's Appointments", desc: `${stats.appointments} scheduled`, path: '/hospital/appointments', color: '#5EC4C4' },
  ];

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <HospitalNavbar />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="rounded-2xl p-6 mb-6 text-white" style={{ background: 'linear-gradient(135deg, #100A50 0%, #302090 70%, #4EB0C8 100%)' }}>
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm font-medium" style={{ color: '#A8E4DC' }}>Hospital Partner Dashboard</p>
              <h2 className="text-2xl font-black">{hospital?.name}</h2>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: statusStyle.bg, color: statusStyle.text }}>
                  {hospital?.verificationStatus === 'verified' ? '✓ Verified' : hospital?.verificationStatus}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold" style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}>
                  {hospital?.type}
                </span>
              </div>
            </div>
            <Activity size={40} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Today's Appts", value: loading ? '…' : stats.appointments, color: '#5EC4C4' },
            { 
              label: 'Avg Wait Time',   
              value: loading ? '…' : (stats.avgWaitMinutes === null ? 'No data' : `${stats.avgWaitMinutes} min`),        
              color: stats.avgWaitColor === 'red' ? '#dc2626' : (stats.avgWaitColor === 'amber' ? '#d97706' : '#16a34a') 
            },
            { label: 'Active Blood',  value: loading ? '…' : stats.bloodRequests, color: '#dc2626' },
            { label: 'Avail Doctors', value: loading ? '…' : stats.doctors,       color: '#4EB0C8' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border p-4 text-center card-hover" style={{ borderColor: '#C8EEE8' }}>
              <p className="text-3xl font-black" style={{ color }}>{value}</p>
              <p className="text-xs text-gray-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <h3 className="text-lg font-bold mb-3" style={{ color: '#100A50' }}>Quick Actions</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {quickActions.map(({ icon: Icon, label, desc, path, color }) => (
            <button key={path} onClick={() => navigate(path)}
              className="bg-white rounded-xl border p-5 flex items-center justify-between card-hover text-left w-full"
              style={{ borderColor: '#C8EEE8' }}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: color + '15' }}>
                  <Icon size={22} style={{ color }} />
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: '#100A50' }}>{label}</p>
                  <p className="text-xs text-gray-400">{desc}</p>
                </div>
              </div>
              <ArrowRight size={18} className="text-gray-300" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
