const express = require('express');
const router = express.Router();
const User = require('../models/User');
const verifyToken = require('../middleware/verifyPatientToken');

// POST /api/patient/register
router.post('/register', async (req, res) => {
  try {
    const { firebaseUid, name, email, phone, city, pincode, bloodGroup, location } = req.body;
    if (!firebaseUid || !name || !email) {
      return res.status(400).json({ error: 'firebaseUid, name, and email are required' });
    }
    const existing = await User.findOne({ firebaseUid }).lean();
    if (existing) return res.json(existing);

    const user = await User.create({
      firebaseUid, name, email,
      phone: phone || '',
      city: city || '',
      pincode: pincode || '',
      bloodGroup: bloodGroup || null,
      location: location || { lat: 13.0827, lng: 80.2707 },
    });
    return res.status(201).json(user);
  } catch (err) {
    console.error('Patient register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/patient/profile?uid=xxx
router.get('/profile', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const user = await User.findOne({ firebaseUid: uid }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('Patient profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/patient/profile/:id
router.patch('/profile/:id', verifyToken, async (req, res) => {
  try {
    const { donorStatus, phone, city, pincode, location, bloodGroup } = req.body;
    const updates = {};
    if (donorStatus !== undefined) updates.donorStatus = donorStatus;
    if (phone !== undefined) updates.phone = phone;
    if (city !== undefined) updates.city = city;
    if (pincode !== undefined) updates.pincode = pincode;
    if (location !== undefined) updates.location = location;
    if (bloodGroup !== undefined) updates.bloodGroup = bloodGroup;

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json(user);
  } catch (err) {
    console.error('Patient update error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
