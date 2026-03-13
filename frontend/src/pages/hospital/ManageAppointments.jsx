import { useState, useEffect } from 'react';
import axios from 'axios';
import { useHospitalAuth } from '../../context/HospitalAuthContext';
import HospitalNavbar from '../../components/shared/HospitalNavbar';
import AppointmentRow from '../../components/hospital/AppointmentRow';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const API = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE_URL || '';

export default function ManageAppointments() {
  const { hospital, getToken } = useHospitalAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [doctorFilter, setDoctorFilter] = useState('all');

  async function load() {
    setLoading(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API}/api/appointments/hospital/${hospital._id}?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAppointments(res.data);
    } catch { toast.error('Failed to load appointments'); }
    setLoading(false);
  }

  useEffect(() => { if (hospital) load(); }, [hospital, date]);

  const filtered = doctorFilter === 'all' ? appointments : appointments.filter((a) => a.doctorId === doctorFilter);
  const doctors = [...new Map(appointments.map((a) => [a.doctorId, { id: a.doctorId, name: a.doctorName }])).values()];

  return (
    <div className="min-h-screen pt-16" style={{ background: '#f8fafc' }}>
      <HospitalNavbar />
      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-black mb-1" style={{ color: '#100A50' }}>Manage Appointments</h1>
        <p className="text-gray-400 text-sm mb-6">{hospital?.name}</p>

        {/* Controls */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border-2 rounded-xl px-4 py-2 text-sm" style={{ borderColor: '#C8EEE8' }} />
          <select value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}
            className="border-2 rounded-xl px-4 py-2 text-sm" style={{ borderColor: '#C8EEE8' }}>
            <option value="all">All Doctors</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <div className="ml-auto flex gap-2 text-xs">
            <span className="px-3 py-1.5 rounded-full font-medium" style={{ background: '#ede9fe', color: '#5b21b6' }}>
              {filtered.filter((a) => a.status === 'booked').length} booked
            </span>
            <span className="px-3 py-1.5 rounded-full font-medium" style={{ background: '#dcfce7', color: '#166534' }}>
              {filtered.filter((a) => a.checkedIn).length} checked in
            </span>
          </div>
        </div>

        {/* Appointments */}
        {loading ? (
          <div className="space-y-2">{[1,2,3,4].map((k) => <div key={k} className="skeleton h-16 rounded-xl" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Calendar size={48} className="mx-auto mb-4" />
            <p>No appointments for this date</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((a) => <AppointmentRow key={a._id} appt={a} onUpdate={load} />)}
          </div>
        )}
      </div>
    </div>
  );
}
