import { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Check } from 'lucide-react';
import StarRating from './StarRating';
import { usePatientAuth } from '../../context/PatientAuthContext';

const API = import.meta.env.VITE_API_BASE_URL || '';

export default function ReviewPromptModal({ appointment, onClose, onSuccess }) {
  const { getToken } = usePatientAuth();
  const [docRating, setDocRating] = useState(0);
  const [hospRating, setHospRating] = useState(0);
  const [waitTime, setWaitTime] = useState(''); // 'fast', 'okay', 'long'
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorStatus, setErrorStatus] = useState('');

  const getRatingLabel = (rating) => {
    if (rating <= 0) return '';
    if (rating <= 2) return <span className="text-red-500 font-bold ml-2">Poor</span>;
    if (rating === 3) return <span className="text-amber-500 font-bold ml-2">Okay</span>;
    if (rating === 4) return <span className="text-green-500 font-bold ml-2">Very Good</span>;
    return <span className="text-green-600 font-bold ml-2">Excellent</span>;
  };

  const handleSubmit = async () => {
    if (!docRating || !hospRating || !waitTime) return;
    setLoading(true);
    setErrorStatus('');
    try {
      const token = await getToken();
      await axios.post(`${API}/api/reviews`, {
        appointmentId: appointment.appointmentId || appointment._id,
        doctorRating: docRating,
        hospitalRating: hospRating,
        waitTimeExperience: waitTime,
        comment: comment.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Thank you for your review! Your feedback helps others.');
      onSuccess();
    } catch (err) {
      setErrorStatus('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If missing fields
  const isValid = docRating > 0 && hospRating > 0 && waitTime !== '';

  return (
    <div className="fixed inset-0 z-[1001] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-7 w-full max-w-[420px] max-h-[90vh] overflow-y-auto">
        <div className="flex flex-col items-center mb-6">
          <div className="w-[60px] h-[60px] rounded-full flex items-center justify-center mb-4 shadow" style={{ background: '#06D6A0' }}>
            <Check size={32} color="white" />
          </div>
          <h2 className="text-[18px] font-bold text-center" style={{ color: '#100A50' }}>Appointment Complete!</h2>
          <p className="text-[13px] text-gray-500 text-center mt-1 px-4 leading-relaxed">
            How was your experience with <b>Dr. {appointment.doctorName}</b> at <b>{appointment.hospitalName}</b>?
          </p>
        </div>

        {/* DOC RATING */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Rate Your Doctor</p>
          <div className="flex items-center">
            <StarRating value={docRating} onChange={setDocRating} size={36} />
            {getRatingLabel(docRating)}
          </div>
        </div>

        {/* HOSP RATING */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Rate The Hospital</p>
          <div className="flex items-center">
            <StarRating value={hospRating} onChange={setHospRating} size={36} />
            {getRatingLabel(hospRating)}
          </div>
        </div>

        {/* WAIT TIME */}
        <div className="mb-6">
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">How Was The Wait Time?</p>
          <div className="flex items-center gap-2">
            {[
              { id: 'fast', label: 'Fast', color: '#5EC4C4', bg: '#eefcf9' },
              { id: 'okay', label: 'Okay', color: '#f59e0b', bg: '#fef3c7' },
              { id: 'long', label: 'Long', color: '#dc2626', bg: '#fee2e2' }
            ].map(wt => {
              const selected = waitTime === wt.id;
              return (
                <button
                  key={wt.id}
                  onClick={() => setWaitTime(wt.id)}
                  className={`flex-1 py-2 rounded-full font-bold text-sm transition-all border-2`}
                  style={{
                    borderColor: selected ? wt.color : '#e5e7eb',
                    background: selected ? wt.bg : 'white',
                    color: selected ? wt.color : '#9ca3af'
                  }}
                >
                  {wt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* COMMENT */}
        <div className="mb-6">
          <label className="text-[13px] font-semibold text-gray-700 block mb-2">Share your experience (optional)</label>
          <textarea
            className="w-full text-sm rounded-lg p-3 outline-none transition-colors border placeholder:text-gray-300"
            style={{ borderColor: '#C8EEE8' }}
            rows={3}
            maxLength={500}
            placeholder="Tell others about your visit..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            onFocus={(e) => e.target.style.borderColor = '#4EB0C8'}
            onBlur={(e) => e.target.style.borderColor = '#C8EEE8'}
          />
          <p className="text-right text-[11px] text-gray-400 mt-1">{comment.length} / 500</p>
        </div>

        {errorStatus && <p className="text-red-500 text-sm font-semibold mb-3 text-center">{errorStatus}</p>}

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="w-full py-4 rounded-xl font-bold text-white transition-opacity disabled:opacity-50"
          style={{ background: isValid ? '#6060C0' : '#d1d5db' }}
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>

        <div className="text-center mt-4">
          <button onClick={onClose} className="text-[11px] text-gray-400 font-semibold hover:text-gray-600 transition-colors">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
