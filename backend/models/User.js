const mongoose = require('mongoose');

const donationHistorySchema = new mongoose.Schema({
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  date: Date,
  requestCode: String,
}, { _id: false });

const userSchema = new mongoose.Schema({
  firebaseUid: { type: String, required: true, unique: true, index: true },
  name:        { type: String, required: true },
  email:       { type: String, required: true, unique: true },
  phone:       { type: String, default: '' },
  city:        { type: String, default: '' },
  pincode:     { type: String, default: '' },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    default: null,
  },
  location: {
    lat: { type: Number, default: 13.0827 },
    lng: { type: Number, default: 80.2707 },
  },
  donorStatus:     { type: Boolean, default: true },
  lastDonated:     { type: Date, default: null },
  donationCount:   { type: Number, default: 0 },
  donationHistory: [donationHistorySchema],
  createdAt:       { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
