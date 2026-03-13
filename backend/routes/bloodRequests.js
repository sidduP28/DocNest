const express = require('express');
const router = express.Router();
const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');
const User = require('../models/User');
const verifyToken = require('../middleware/verifyPatientToken');
const verifyHospToken = require('../middleware/verifyHospitalToken');
const { haversine } = require('../utils/haversine');

function generateVerificationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'BLD-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// POST /api/blood-requests — create new request
router.post('/', verifyHospToken, async (req, res) => {
  try {
    const { hospitalId, bloodGroupNeeded, unitsNeeded, urgencyLevel, department, doctorName, patientRefCode } = req.body;
    const hospital = await Hospital.findById(hospitalId).lean();
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    if (hospital.verificationStatus !== 'verified') {
      return res.status(403).json({ error: 'Only verified hospitals can raise blood requests' });
    }
    const verificationCode = generateVerificationCode();
    const verificationCodeExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const request = await BloodRequest.create({
      hospitalId: hospital._id,
      hospitalName: hospital.name,
      hospitalLocation: hospital.location,
      bloodGroupNeeded, unitsNeeded: unitsNeeded || 1,
      urgencyLevel: urgencyLevel || 'urgent',
      department: department || '',
      doctorName: doctorName || '',
      patientRefCode: patientRefCode || '',
      verificationCode, verificationCodeExpiresAt,
    });
    return res.status(201).json(request);
  } catch (err) {
    console.error('Create blood request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blood-requests/hospital/:hospitalId
router.get('/hospital/:hospitalId', verifyHospToken, async (req, res) => {
  try {
    const requests = await BloodRequest.find({ hospitalId: req.params.hospitalId })
      .sort({ createdAt: -1 }).lean();
    return res.json(requests);
  } catch (err) {
    console.error('Get blood requests error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/blood-requests/active — active requests (for donor patients)
router.get('/active', async (req, res) => {
  try {
    const requests = await BloodRequest.find({ status: { $in: ['active', 'donors_responding'] } })
      .sort({ createdAt: -1 }).lean();
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/blood-requests/:id/verify — confirm verification code
router.patch('/:id/verify', verifyHospToken, async (req, res) => {
  try {
    const { code } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.isVerifiedByCode) return res.json({ message: 'Already verified', request });

    if (new Date() > request.verificationCodeExpiresAt) {
      request.status = 'expired';
      await request.save();
      return res.status(400).json({ error: 'Code has expired', status: 'expired' });
    }
    if (code !== request.verificationCode) {
      return res.status(400).json({ error: 'Incorrect code' });
    }

    request.isVerifiedByCode = true;
    request.status = 'active';
    await request.save();

    // Geo-match donors within 25km
    const donors = await User.find({
      donorStatus: true,
      bloodGroup: request.bloodGroupNeeded,
    }).lean();

    const nearbyDonors = donors.filter((d) => {
      const dist = haversine(
        request.hospitalLocation.lat, request.hospitalLocation.lng,
        d.location.lat, d.location.lng
      );
      return dist <= 25;
    });

    const io = req.app.get('io');
    if (io) {
      for (const donor of nearbyDonors) {
        const dist = haversine(
          request.hospitalLocation.lat, request.hospitalLocation.lng,
          donor.location.lat, donor.location.lng
        );
        io.to(`user:${donor._id}`).emit('bloodSOS', {
          requestId: request._id,
          hospitalName: request.hospitalName,
          hospitalLocation: request.hospitalLocation,
          bloodGroup: request.bloodGroupNeeded,
          unitsNeeded: request.unitsNeeded,
          urgencyLevel: request.urgencyLevel,
          distance: Math.round(dist * 10) / 10,
          department: request.department,
        });
      }
    }

    return res.json({ success: true, notifiedCount: nearbyDonors.length, request });
  } catch (err) {
    console.error('Verify blood request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/blood-requests/:id/respond — donor responds
router.patch('/:id/respond', verifyToken, async (req, res) => {
  try {
    const { userId, userName, userPhone, userBloodGroup, etaMinutes } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });

    const alreadyResponded = request.respondingDonors.some(
      (d) => d.userId && d.userId.toString() === userId
    );
    if (!alreadyResponded) {
      request.respondingDonors.push({ userId, userName, userPhone, userBloodGroup, etaMinutes: etaMinutes || 15 });
      if (request.status === 'active') request.status = 'donors_responding';
      await request.save();
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`hospital:${request.hospitalId}`).emit('donorConfirmed', {
        requestId: request._id,
        donorFirstName: userName.split(' ')[0],
        etaMinutes: etaMinutes || 15,
        totalResponding: request.respondingDonors.length,
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Respond blood request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/blood-requests/:id/arrived — donor marks arrival
router.patch('/:id/arrived', verifyToken, async (req, res) => {
  try {
    const { userId } = req.body;
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });

    const donor = request.respondingDonors.find((d) => d.userId && d.userId.toString() === userId);
    if (!donor) return res.status(404).json({ error: 'Donor not in responding list' });
    donor.hasArrived = true;
    await request.save();

    const io = req.app.get('io');
    if (io) {
      const payload = {
        requestId: request._id,
        donorFullName: donor.userName,
        donorPhone: donor.userPhone,
        donorBloodGroup: donor.userBloodGroup,
      };
      io.to(`hospital:${request.hospitalId}`).emit('donorArrived', payload);
      io.to(`user:${userId}`).emit('donorArrived', payload);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Arrived blood request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/blood-requests/:id/fulfill
router.patch('/:id/fulfill', verifyHospToken, async (req, res) => {
  try {
    const { donorUserIds } = req.body; // array of userId strings who donated
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ error: 'Not found' });

    request.status = 'fulfilled';
    request.fulfilledAt = new Date();
    await request.save();

    // Update donor records
    if (donorUserIds && donorUserIds.length > 0) {
      for (const uid of donorUserIds) {
        await User.findByIdAndUpdate(uid, {
          $inc: { donationCount: 1 },
          lastDonated: new Date(),
          $push: {
            donationHistory: {
              hospitalId: request.hospitalId,
              date: new Date(),
              requestCode: request.verificationCode,
            },
          },
        });
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${uid}`).emit('requestFulfilled', { requestId: request._id });
        }
      }
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Fulfill blood request error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
