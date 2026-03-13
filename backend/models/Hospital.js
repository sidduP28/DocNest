const mongoose = require('mongoose');

const slotSchema = new mongoose.Schema({
  time:         { type: String, required: true },
  isBooked:     { type: Boolean, default: false },
  isBlocked:    { type: Boolean, default: false },
  bookedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { _id: true });

const doctorSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  specialty:     { type: String, required: true },
  qualification: { type: String, default: '' },
  slots:         [slotSchema],
  offlineWalkIns: { type: Number, default: 0 },
  approvalStatus: {
    type: String,
    enum: ['pending_approval', 'approved', 'rejected'],
    default: 'pending_approval'
  },
  rejectionReason: { type: String, default: null },
  submittedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date, default: null },
  availabilityStatus: {
    type: String,
    enum: ['available', 'emergency', 'off_duty'],
    default: 'available',
  },
  emergencyReason:     { type: String, default: null },
  emergencyStartTime:  { type: Date, default: null },
  estimatedReturnTime: { type: Date, default: null },
  backupDoctorId:      { type: mongoose.Schema.Types.ObjectId, default: null },
}, { _id: true });

const hospitalSchema = new mongoose.Schema({
  firebaseUid: { type: String, unique: true, sparse: true, index: true },
  name:        { type: String, required: true },
  type: {
    type: String,
    enum: ['Government', 'Private', 'Clinic', 'Diagnostic Lab'],
    default: 'Private',
  },
  address:  { type: String, default: '' },
  location: {
    lat: { type: Number, default: 0 },
    lng: { type: Number, default: 0 },
  },
  phone:  { type: String, default: '' },
  email:  { type: String, default: '' },
  contactPersonName:        { type: String, default: '' },
  contactPersonDesignation: { type: String, default: '' },
  verificationStatus: {
    type: String,
    enum: ['pending', 'basic', 'verified'],
    default: 'pending',
  },
  registrationCertUrl: { type: String, default: null },
  gstNumber:           { type: String, default: '' },
  bloodBankLicense:    { type: Boolean, default: false },
  doctors:    [doctorSchema],
  testPrices: {
    bloodTest:    { type: Number, default: 0 },
    MRI:          { type: Number, default: 0 },
    xRay:         { type: Number, default: 0 },
    ECG:          { type: Number, default: 0 },
    urineCulture: { type: Number, default: 0 },
    ctScan:       { type: Number, default: 0 },
  },
  ratings:           { type: Number, default: 4.0 },
  totalRatings:      { type: Number, default: 0 },
  createdAt:         { type: Date, default: Date.now },
});

module.exports = mongoose.model('Hospital', hospitalSchema);
