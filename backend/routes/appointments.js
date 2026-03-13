const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');
const verifyToken = require('../middleware/verifyPatientToken');
const verifyHospToken = require('../middleware/verifyHospitalToken');

function genBookingRef() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let ref = 'BKG-';
  for (let i = 0; i < 5; i++) ref += chars[Math.floor(Math.random() * chars.length)];
  return ref;
}

// POST /api/appointments
router.post('/', verifyToken, async (req, res) => {
  try {
    const { userId, userName, hospitalId, hospitalName, doctorId, doctorName, specialty, slot, slotLabel } = req.body;
    if (!userId || !hospitalId || !doctorId || !slot) {
      return res.status(400).json({ error: 'userId, hospitalId, doctorId, slot are required' });
    }

    const appt = await Appointment.create({
      userId, userName, hospitalId, hospitalName,
      doctorId, doctorName, specialty,
      slot: new Date(slot), slotLabel,
      bookingRef: genBookingRef(),
    });

    // Mark the slot as booked in Hospital document
    const hospital = await Hospital.findById(hospitalId);
    if (hospital) {
      const doc = hospital.doctors.id(doctorId);
      if (doc) {
        const s = doc.slots.find((sl) => sl.time === slotLabel);
        if (s) { s.isBooked = true; s.bookedByUserId = userId; }
        await hospital.save();
      }
    }

    return res.status(201).json(appt);
  } catch (err) {
    console.error('Create appointment error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/appointments/patient/:userId
router.get('/patient/:userId', verifyToken, async (req, res) => {
  try {
    const appts = await Appointment.find({ userId: req.params.userId })
      .sort({ slot: 1 }).lean();
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/appointments/hospital/:hospitalId?date=YYYY-MM-DD&type=online|offline
router.get('/hospital/:hospitalId', verifyHospToken, async (req, res) => {
  try {
    const { date, type } = req.query;
    let query = { hospitalId: req.params.hospitalId };
    
    if (date) {
      if (date === 'today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query.slot = { $gte: start, $lte: end };
      } else {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        query.slot = { $gte: start, $lte: end };
      }
    }
    
    if (type === 'online') query.bookingType = 'online';
    else if (type === 'offline') query.bookingType = 'offline';

    const appts = await Appointment.find(query).sort({ slot: 1 }).lean();
    return res.json(appts);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/appointments/:id/checkin
router.patch('/:id/checkin', verifyToken, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id, { checkedIn: true, status: 'confirmed' }, { new: true }
    ).lean();
    if (!appt) return res.status(404).json({ error: 'Not found' });
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/appointments/:id/reschedule
router.patch('/:id/reschedule', verifyToken, async (req, res) => {
  try {
    const { slot, slotLabel } = req.body;
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { slot: new Date(slot), slotLabel, status: 'rescheduled', conflictStatus: 'rescheduled' },
      { new: true }
    ).lean();
    if (!appt) return res.status(404).json({ error: 'Not found' });
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/appointments/:id/switch-doctor
router.patch('/:id/switch-doctor', verifyToken, async (req, res) => {
  try {
    const { doctorId, doctorName, slot, slotLabel } = req.body;
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { doctorId, doctorName, slot: new Date(slot), slotLabel, status: 'rescheduled', conflictStatus: 'switched' },
      { new: true }
    ).lean();
    if (!appt) return res.status(404).json({ error: 'Not found' });
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/appointments/:id/cancel
router.patch('/:id/cancel', verifyToken, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', refundStatus: 'pending', conflictStatus: 'cancelled' },
      { new: true }
    ).lean();
    if (!appt) return res.status(404).json({ error: 'Not found' });
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/appointments/:id/wait — patient chose to wait for doctor
router.patch('/:id/wait', verifyToken, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id, { conflictStatus: 'waiting' }, { new: true }
    ).lean();
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/appointments/:id/complete — hospital marks completed
router.patch('/:id/complete', verifyHospToken, async (req, res) => {
  try {
    const appt = await Appointment.findByIdAndUpdate(
      req.params.id, { status: 'completed' }, { new: true }
    ).lean();
    if (!appt) return res.status(404).json({ error: 'Not found' });
    
    // Emit event to patient so they get the review prompt
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${appt.userId}`).emit('appointmentCompleted', {
        appointmentId: appt._id,
        doctorName: appt.doctorName,
        hospitalName: appt.hospitalName,
        specialty: appt.specialty
      });
    }
    
    return res.json(appt);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
