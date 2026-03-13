const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const Appointment = require('../models/Appointment');
const verifyToken = require('../middleware/verifyHospitalToken');
const verifyAdminToken = require('../middleware/verifyAdminToken');
const { haversine } = require('../utils/haversine');
const { calculateWaitTime } = require('../utils/waitTimeCalculator');

// GET /api/hospitals — list all, sorted by distance if lat/lng provided
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 50 } = req.query;
    const hospitals = await Hospital.find({}).lean();
    let result = hospitals;
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      result = hospitals
        .map((h) => ({
          ...h,
          doctors: (h.doctors || []).filter(d => d.approvalStatus === 'approved'),
          distance: haversine(userLat, userLng, h.location.lat, h.location.lng),
        }))
        .filter((h) => h.distance <= parseFloat(radius))
        .sort((a, b) => a.distance - b.distance);
    } else {
      result = hospitals.map(h => ({
        ...h,
        doctors: (h.doctors || []).filter(d => d.approvalStatus === 'approved')
      }));
    }
    
    // For all public hospital listings, filter slots to only show available ones
    result = result.map(h => ({
      ...h,
      doctors: h.doctors.map(d => ({
        ...d,
        slots: (d.slots || []).filter(s => !s.isBooked && !s.isBlocked)
      }))
    }));

    // Calculate wait times
    const now = new Date();
    const tonight = new Date(now);
    tonight.setHours(23, 59, 59, 999);

    const allFutureAppts = await Appointment.aggregate([
      {
        $match: {
          slot: { $gte: now, $lte: tonight },
          status: { $in: ['booked', 'confirmed'] }
        }
      },
      {
        $group: {
          _id: "$doctorId",
          count: { $sum: 1 }
        }
      }
    ]);
    const apptMap = {};
    allFutureAppts.forEach(a => {
      apptMap[a._id.toString()] = a.count;
    });

    result = result.map(h => {
      let totalMins = 0;
      let validDoctors = 0;
      h.doctors.forEach(d => {
        const remainingAppts = apptMap[d._id.toString()] || 0;
        const offlineWalkIns = d.offlineWalkIns || 0;
        const calc = calculateWaitTime(remainingAppts, offlineWalkIns, now);
        totalMins += calc.estimatedWaitMinutes;
        validDoctors++;
      });
      const avgWaitMinutes = validDoctors > 0 ? Math.round(totalMins / validDoctors) : 0;
      let avgWaitColor = 'green';
      if (avgWaitMinutes >= 16 && avgWaitMinutes <= 45) avgWaitColor = 'amber';
      else if (avgWaitMinutes >= 46) avgWaitColor = 'red';
      
      return {
        ...h,
        avgWaitMinutes,
        avgWaitColor
      };
    });

    return res.json(result);
  } catch (err) {
    console.error('Get hospitals error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/hospitals/:id/waittime
router.get('/:id/waittime', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).lean();
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    
    const now = new Date();
    const tonight = new Date(now);
    tonight.setHours(23, 59, 59, 999);

    const doctorIds = hospital.doctors.map(d => d._id);
    const appts = await Appointment.aggregate([
      {
        $match: {
          hospitalId: hospital._id,
          doctorId: { $in: doctorIds },
          slot: { $gte: now, $lte: tonight },
          status: { $in: ['booked', 'confirmed'] }
        }
      },
      {
        $group: {
          _id: "$doctorId",
          count: { $sum: 1 }
        }
      }
    ]);
    const apptMap = {};
    appts.forEach(a => apptMap[a._id.toString()] = a.count);

    const doctorsWaitTime = hospital.doctors.map(d => {
      const remainingOnlineBookings = apptMap[d._id.toString()] || 0;
      const offlineWalkIns = d.offlineWalkIns || 0;
      const calc = calculateWaitTime(remainingOnlineBookings, offlineWalkIns, now);
      
      return {
        doctorId: d._id.toString(),
        doctorName: d.name,
        remainingOnlineBookings,
        offlineWalkIns,
        totalQueue: calc.totalQueue,
        estimatedWaitMinutes: calc.estimatedWaitMinutes,
        waitColor: calc.waitColor,
        waitLabel: calc.waitLabel
      };
    });

    return res.json({
      hospitalId: hospital._id.toString(),
      doctors: doctorsWaitTime
    });
  } catch (err) {
    console.error('Waittime err:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/hospitals/:id
router.get('/:id', async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id).lean();
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    
    // Filter doctors and slots for public view
    hospital.doctors = (hospital.doctors || [])
      .filter(d => d.approvalStatus === 'approved')
      .map(d => ({
        ...d,
        slots: (d.slots || []).filter(s => !s.isBooked && !s.isBlocked)
      }));

    return res.json(hospital);
  } catch (err) {
    console.error('Get hospital error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/hospitals/:id/doctors/:docId/offline-appointment
router.post('/:id/doctors/:docId/offline-appointment', verifyToken, async (req, res) => {
  try {
    const { offlinePatientName, offlinePatientPhone, selectedSlot, offlineWalkIns } = req.body;
    if (!offlinePatientName || !selectedSlot) return res.status(400).json({ error: 'Missing fields' });
    
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    
    const doc = hospital.doctors.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });
    
    const slotObj = doc.slots.find(s => s.time === selectedSlot);
    if (!slotObj) return res.status(400).json({ error: 'Invalid slot' });
    if (slotObj.isBooked || slotObj.isBlocked) return res.status(409).json({ message: 'Slot already taken' });
    
    // Process booking atomically
    slotObj.isBlocked = true;
    if (offlineWalkIns !== undefined) {
      doc.offlineWalkIns = Math.max(0, parseInt(offlineWalkIns) || 0);
    } else {
      doc.offlineWalkIns = (doc.offlineWalkIns || 0) + 1;
    }
    await hospital.save();
    
    const now = new Date();
    // Parse selectedSlot e.g. "10:00 AM" => today at 10:00
    const [timeStr, period] = selectedSlot.split(' ');
    let [hours, mins] = timeStr.split(':').map(Number);
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    const slotDate = new Date();
    slotDate.setHours(hours, mins, 0, 0);
    
    const appt = await Appointment.create({
      userId: null,
      userName: offlinePatientName,
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      doctorId: doc._id,
      doctorName: doc.name,
      specialty: doc.specialty,
      slot: slotDate,
      slotLabel: selectedSlot,
      status: 'confirmed',
      bookingType: 'offline',
      offlinePatientName,
      offlinePatientPhone: offlinePatientPhone || null
    });
    
    // Calculate new wait time
    const tonight = new Date(now);
    tonight.setHours(23, 59, 59, 999);
    const remainingApptsCount = await Appointment.countDocuments({
      hospitalId: hospital._id,
      doctorId: doc._id,
      slot: { $gte: now, $lte: tonight },
      status: { $in: ['booked', 'confirmed'] }
    });
    
    const calc = calculateWaitTime(remainingApptsCount, doc.offlineWalkIns, now);
    
    const io = req.app.get('io');
    io.to(`hospital:${hospital._id}`).emit('queueUpdate', {
      hospitalId: hospital._id.toString(),
      doctorId: doc._id.toString(),
      doctorName: doc.name,
      ...calc
    });
    io.to(`hospital:${hospital._id}`).emit('slotsUpdated', {
      hospitalId: hospital._id.toString(),
      doctorId: doc._id.toString(),
      doctorName: doc.name
    });
    
    return res.json({
      appointment: appt,
      updatedSlot: { time: selectedSlot, isBlocked: true },
      updatedWaitTime: calc
    });
  } catch (err) {
    console.error('Offline booking err:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/hospitals/:id/doctors/:docId/offline-appointment/:appointmentId
router.delete('/:id/doctors/:docId/offline-appointment/:appointmentId', verifyToken, async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.appointmentId);
    if (!appt || appt.bookingType !== 'offline') return res.status(404).json({ error: 'Appointment not found' });
    
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    const doc = hospital.doctors.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });
    
    appt.status = 'cancelled';
    await appt.save();
    
    const slotObj = doc.slots.find(s => s.time === appt.slotLabel);
    if (slotObj) slotObj.isBlocked = false;
    doc.offlineWalkIns = Math.max(0, (doc.offlineWalkIns || 0) - 1);
    await hospital.save();
    
    const now = new Date();
    const tonight = new Date(now);
    tonight.setHours(23, 59, 59, 999);
    const remainingApptsCount = await Appointment.countDocuments({
      hospitalId: hospital._id,
      doctorId: doc._id,
      slot: { $gte: now, $lte: tonight },
      status: { $in: ['booked', 'confirmed'] }
    });
    
    const calc = calculateWaitTime(remainingApptsCount, doc.offlineWalkIns, now);
    const io = req.app.get('io');
    io.to(`hospital:${hospital._id}`).emit('queueUpdate', {
      hospitalId: hospital._id.toString(),
      doctorId: doc._id.toString(),
      doctorName: doc.name,
      ...calc
    });
    io.to(`hospital:${hospital._id}`).emit('slotsUpdated', {
      hospitalId: hospital._id.toString(),
      doctorId: doc._id.toString(),
      doctorName: doc.name
    });
    
    return res.json({ message: 'Offline appointment cancelled, slot unblocked' });
  } catch (err) {
    console.error('Offline cancel err:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/hospitals/:id/doctors/:docId/walkins
router.patch('/:id/doctors/:docId/walkins', verifyToken, async (req, res) => {
  try {
    const { offlineWalkIns } = req.body;
    let walkIns = parseInt(offlineWalkIns);
    if (isNaN(walkIns) || walkIns < 0) return res.status(400).json({ error: 'Invalid walk-in count' });
    walkIns = Math.min(walkIns, 100);
    
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    const doc = hospital.doctors.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });
    
    doc.offlineWalkIns = walkIns;
    await hospital.save();
    
    const now = new Date();
    const tonight = new Date(now);
    tonight.setHours(23, 59, 59, 999);
    const remainingApptsCount = await Appointment.countDocuments({
      hospitalId: hospital._id,
      doctorId: doc._id,
      slot: { $gte: now, $lte: tonight },
      status: { $in: ['booked', 'confirmed'] }
    });
    
    const calc = calculateWaitTime(remainingApptsCount, doc.offlineWalkIns, now);
    const io = req.app.get('io');
    io.to(`hospital:${hospital._id}`).emit('queueUpdate', {
      hospitalId: hospital._id.toString(),
      doctorId: doc._id.toString(),
      doctorName: doc.name,
      ...calc
    });
    
    return res.json(calc);
  } catch (err) {
    console.error('update walk-ins err:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/hospitals/:id/doctors
router.post('/:id/doctors', verifyToken, async (req, res) => {
  try {
    const { name, specialty, qualification, slots } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Not found' });
    
    const newDoc = {
      name, specialty, qualification,
      slots: slots ? slots.map(t => ({ time: t, isBooked: false, isBlocked: false })) : [],
      approvalStatus: 'pending_approval'
    };
    hospital.doctors.push(newDoc);
    await hospital.save();
    return res.json(hospital.doctors[hospital.doctors.length - 1]);
  } catch (err) {
    console.error('Add doctor error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/doctors/pending
router.get('/admin/doctors/pending', verifyAdminToken, async (req, res) => {
  try {
    const hospitals = await Hospital.find({ "doctors.approvalStatus": "pending_approval" }).lean();
    const pendingDoctors = [];
    hospitals.forEach(h => {
      h.doctors.forEach(d => {
        if (d.approvalStatus === 'pending_approval') {
          pendingDoctors.push({
            hospitalId: h._id,
            hospitalName: h.name,
            doctorId: d._id,
            doctorName: d.name,
            specialty: d.specialty,
            qualification: d.qualification,
            submittedAt: d.submittedAt,
            slots: (d.slots || []).map(s => s.time)
          });
        }
      });
    });
    return res.json(pendingDoctors);
  } catch (err) {
    console.error('Admin get pending doctors error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/doctors/:hospitalId/:doctorId/approve
router.patch('/admin/doctors/:hospitalId/:doctorId/approve', verifyAdminToken, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.hospitalId);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    const doc = hospital.doctors.id(req.params.doctorId);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    doc.approvalStatus = 'approved';
    doc.approvedAt = new Date();
    await hospital.save();

    const io = req.app.get('io');
    io.to(`hospital:${hospital._id}`).emit('doctorApproved', {
      doctorId: doc._id, doctorName: doc.name, hospitalId: hospital._id
    });
    
    return res.json({ success: true, doctor: doc });
  } catch (err) {
    console.error('Admin approve doctor error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/admin/doctors/:hospitalId/:doctorId/reject
router.patch('/admin/doctors/:hospitalId/:doctorId/reject', verifyAdminToken, async (req, res) => {
  try {
    const { reason } = req.body;
    const hospital = await Hospital.findById(req.params.hospitalId);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    const doc = hospital.doctors.id(req.params.doctorId);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    doc.approvalStatus = 'rejected';
    doc.rejectionReason = reason;
    await hospital.save();

    const io = req.app.get('io');
    io.to(`hospital:${hospital._id}`).emit('doctorRejected', {
      doctorId: doc._id, doctorName: doc.name, hospitalId: hospital._id, reason
    });
    
    return res.json({ success: true, doctor: doc });
  } catch (err) {
    console.error('Admin reject doctor error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/hospitals/:id/doctors/:docId/emergency
router.patch('/:id/doctors/:docId/emergency', verifyToken, async (req, res) => {
  try {
    const { reason, estimatedReturnTime } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Not found' });

    const doc = hospital.doctors.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    doc.availabilityStatus = 'emergency';
    doc.emergencyReason = reason || 'Emergency';
    doc.emergencyStartTime = new Date();
    doc.estimatedReturnTime = estimatedReturnTime ? new Date(estimatedReturnTime) : null;
    await hospital.save();

    // Find today's future appointments for this doctor and notify patients
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date().setHours(23, 59, 59, 999));

    const affectedAppts = await Appointment.find({
      hospitalId: hospital._id,
      doctorId: doc._id,
      slot: { $gte: new Date(), $lte: endOfDay },
      status: { $in: ['booked', 'confirmed'] },
    }).lean();

    // Update conflict status and notify patients via socket
    const io = req.app.get('io');
    const altDoctors = hospital.doctors
      .filter((d) => d.specialty === doc.specialty && d._id.toString() !== doc._id.toString() && d.availabilityStatus === 'available')
      .map((d) => ({ id: d._id, name: d.name, nextSlot: d.slots.find((s) => !s.isBooked)?.time || null }));

    for (const appt of affectedAppts) {
      await Appointment.findByIdAndUpdate(appt._id, { conflictStatus: 'notified' });
      io.to(`user:${appt.userId}`).emit('doctorEmergency', {
        doctorId: doc._id,
        doctorName: doc.name,
        specialty: doc.specialty,
        hospitalName: hospital.name,
        affectedAppointmentId: appt._id,
        appointmentSlotLabel: appt.slotLabel,
        checkedIn: appt.checkedIn,
        alternativeDoctors: altDoctors,
      });
    }

    return res.json({ success: true, affectedCount: affectedAppts.length });
  } catch (err) {
    console.error('Doctor emergency error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/hospitals/:id/doctors/:docId/available
router.patch('/:id/doctors/:docId/available', verifyToken, async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Not found' });

    const doc = hospital.doctors.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    doc.availabilityStatus = 'available';
    doc.emergencyReason = null;
    doc.emergencyStartTime = null;
    doc.estimatedReturnTime = null;
    await hospital.save();

    // Notify patients who chose to wait
    const waitingAppts = await Appointment.find({
      hospitalId: hospital._id,
      doctorId: doc._id,
      conflictStatus: 'waiting',
      status: { $in: ['booked', 'confirmed'] },
    }).lean();
    const io = req.app.get('io');
    for (const appt of waitingAppts) {
      io.to(`user:${appt.userId}`).emit('doctorReturned', {
        doctorId: doc._id,
        doctorName: doc.name,
        originalSlotLabel: appt.slotLabel,
      });
    }
    return res.json({ success: true });
  } catch (err) {
    console.error('Doctor available error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/hospitals/:id/doctors/:docId/slots
router.patch('/:id/doctors/:docId/slots', verifyToken, async (req, res) => {
  try {
    const { addSlots, blockSlots, unblockSlots } = req.body;
    const hospital = await Hospital.findById(req.params.id);
    if (!hospital) return res.status(404).json({ error: 'Not found' });
    const doc = hospital.doctors.id(req.params.docId);
    if (!doc) return res.status(404).json({ error: 'Doctor not found' });

    // Handle blocking slots
    if (blockSlots && Array.isArray(blockSlots)) {
      blockSlots.forEach(time => {
        const slot = doc.slots.find(s => s.time === time);
        if (slot && !slot.isBooked) slot.isBlocked = true;
      });
    }

    // Handle unblocking slots
    if (unblockSlots && Array.isArray(unblockSlots)) {
      unblockSlots.forEach(time => {
        const slot = doc.slots.find(s => s.time === time);
        if (slot) slot.isBlocked = false;
      });
    }

    // Handle adding new slots
    if (addSlots && Array.isArray(addSlots)) {
      addSlots.forEach(time => {
        if (!doc.slots.find(s => s.time === time)) {
          doc.slots.push({ time, isBooked: false, isBlocked: false });
        }
      });
      // Sort slots chronologically
      doc.slots.sort((a, b) => new Date('1970/01/01 ' + a.time) - new Date('1970/01/01 ' + b.time));
    }

    await hospital.save();
    
    const io = req.app.get('io');
    io.to(`hospital:${hospital._id}`).emit('slotsUpdated', {
      hospitalId: hospital._id, doctorId: doc._id, doctorName: doc.name
    });
    
    return res.json({ success: true, doctor: doc });
  } catch (err) {
    console.error('Slots update error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
