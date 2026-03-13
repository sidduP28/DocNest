const mongoose = require('mongoose');

const respondingDonorSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  userName:    String,
  userPhone:   String,
  userBloodGroup: String,
  confirmedAt: { type: Date, default: Date.now },
  etaMinutes:  { type: Number, default: 15 },
  hasArrived:  { type: Boolean, default: false },
}, { _id: false });

const bloodRequestSchema = new mongoose.Schema({
  hospitalId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  hospitalName: { type: String, required: true },
  hospitalLocation: {
    lat: Number,
    lng: Number,
  },
  bloodGroupNeeded: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    required: true,
  },
  unitsNeeded:   { type: Number, default: 1, min: 1, max: 10 },
  urgencyLevel:  { type: String, enum: ['critical', 'urgent', 'planned'], default: 'urgent' },
  department:    { type: String, default: '' },
  doctorName:    { type: String, default: '' },
  patientRefCode:{ type: String, default: '' },

  verificationCode:          { type: String, default: '' },
  verificationCodeExpiresAt: { type: Date, default: null },
  isVerifiedByCode:          { type: Boolean, default: false },

  status: {
    type: String,
    enum: ['pending_verification', 'active', 'donors_responding', 'fulfilled', 'expired'],
    default: 'pending_verification',
  },

  respondingDonors: [respondingDonorSchema],
  createdAt:        { type: Date, default: Date.now },
  fulfilledAt:      { type: Date, default: null },
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
