const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Appointment = require('../models/Appointment');
const Hospital = require('../models/Hospital');
const verifyToken = require('../middleware/verifyPatientToken');

// POST /api/reviews
router.post('/', verifyToken, async (req, res) => {
  try {
    const { appointmentId, doctorRating, hospitalRating, waitTimeExperience, comment } = req.body;
    
    // 1. Fetch appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    
    // 2. Check userId matches
    if (appointment.userId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ error: 'Not authorized to review this appointment' });
    }
    
    // 3. Check status is completed
    if (appointment.status !== 'completed') {
      return res.status(400).json({ error: 'Cannot review an incomplete appointment' });
    }
    
    // 4. Check already reviewed
    if (appointment.hasReviewed) {
      return res.status(409).json({ error: 'You have already reviewed this appointment' });
    }

    // Create review
    const review = await Review.create({
      appointmentId: appointment._id,
      userId: req.user.id,
      userName: appointment.userName,
      hospitalId: appointment.hospitalId,
      doctorId: appointment.doctorId,
      doctorName: appointment.doctorName,
      doctorRating,
      hospitalRating,
      waitTimeExperience,
      comment
    });

    // Update appointment
    appointment.hasReviewed = true;
    await appointment.save();

    // Recalculate doctor rating
    const docReviews = await Review.find({ doctorId: appointment.doctorId });
    const newDocAvg = docReviews.reduce((sum, r) => sum + r.doctorRating, 0) / docReviews.length;
    
    // Recalculate hospital rating
    const hospReviews = await Review.find({ hospitalId: appointment.hospitalId });
    const newHospAvg = hospReviews.reduce((sum, r) => sum + r.hospitalRating, 0) / hospReviews.length;

    // Update hospital documentation
    const hospital = await Hospital.findById(appointment.hospitalId);
    if (hospital) {
      hospital.ratings = Math.round(newHospAvg * 10) / 10;
      hospital.totalRatings = hospReviews.length;
      
      const doctor = hospital.doctors.id(appointment.doctorId);
      if (doctor) {
        doctor.doctorRating = Math.round(newDocAvg * 10) / 10;
        doctor.doctorTotalReviews = docReviews.length;
      }
      await hospital.save();
    }

    return res.status(201).json({ message: 'Review submitted', review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'You have already reviewed this appointment' });
    }
    console.error('Create review error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reviews/hospital/:hospitalId
router.get('/hospital/:hospitalId', async (req, res) => {
  try {
    const { doctorId, page = 1, limit = 10 } = req.query;
    const query = { hospitalId: req.params.hospitalId };
    if (doctorId) query.doctorId = doctorId;

    const skip = (Number(page) - 1) * Number(limit);
    const reviews = await Review.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();
      
    const totalCount = await Review.countDocuments(query);
    
    // Get average hospital rating from hospital doc
    let averageHospitalRating = 0;
    const hospital = await Hospital.findById(req.params.hospitalId).select('ratings').lean();
    if (hospital) averageHospitalRating = hospital.ratings;
    else {
        // Fallback calculation
        const allHospReviews = await Review.find({ hospitalId: req.params.hospitalId });
        if (allHospReviews.length > 0) {
            averageHospitalRating = allHospReviews.reduce((sum, r) => sum + r.hospitalRating, 0) / allHospReviews.length;
        }
    }

    return res.json({
      reviews,
      totalCount,
      averageHospitalRating: Math.round(averageHospitalRating * 10) / 10,
      currentPage: Number(page),
      totalPages: Math.ceil(totalCount / Number(limit))
    });
  } catch (err) {
    console.error('Get reviews error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reviews/check/:appointmentId
router.get('/check/:appointmentId', verifyToken, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId).select('hasReviewed').lean();
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    return res.json({ hasReviewed: appointment.hasReviewed });
  } catch (err) {
    console.error('Check review error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
