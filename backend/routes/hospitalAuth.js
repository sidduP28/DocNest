const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/hospital/register
router.post('/register', async (req, res) => {
  try {
    const {
      firebaseUid, name, type, address, city, pincode,
      phone, email, contactPersonName, contactPersonDesignation,
      gstNumber, bloodBankLicense, location, registrationCertUrl,
    } = req.body;

    if (!firebaseUid || !name || !email) {
      return res.status(400).json({ error: 'firebaseUid, name, and email are required' });
    }

    const existing = await Hospital.findOne({ firebaseUid }).lean();
    if (existing) return res.json(existing);

    const hospital = await Hospital.create({
      firebaseUid, name, type: type || 'Private',
      address: address || '',
      location: location || { lat: 0, lng: 0 },
      phone: phone || '', email,
      contactPersonName: contactPersonName || '',
      contactPersonDesignation: contactPersonDesignation || '',
      gstNumber: gstNumber || '',
      bloodBankLicense: bloodBankLicense || false,
      registrationCertUrl: registrationCertUrl || null,
      verificationStatus: 'pending',
    });
    return res.status(201).json(hospital);
  } catch (err) {
    console.error('Hospital register error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/hospital/profile?uid=xxx
router.get('/profile', async (req, res) => {
  try {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: 'uid required' });
    const hospital = await Hospital.findOne({ firebaseUid: uid }).lean();
    if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
    return res.json(hospital);
  } catch (err) {
    console.error('Hospital profile error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/hospital/upload — upload doc to Cloudinary
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: 'docnest/documents', resource_type: 'auto' },
        (error, result) => { if (error) reject(error); else resolve(result); }
      ).end(req.file.buffer);
    });
    return res.json({ url: result.secure_url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Upload failed' });
  }
});

module.exports = router;
