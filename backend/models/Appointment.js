const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  userName:     { type: String, required: true },
  hospitalId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  hospitalName: { type: String, required: true },
  doctorId:     { type: mongoose.Schema.Types.ObjectId, required: true },
  doctorName:   { type: String, required: true },
  specialty:    { type: String, default: '' },
  slot:         { type: Date, required: true },
  slotLabel:    { type: String, required: true },
  status: {
    type: String,
    enum: ['booked', 'confirmed', 'rescheduled', 'cancelled', 'completed'],
    default: 'booked',
  },
  checkedIn: { type: Boolean, default: false },
  conflictStatus: {
    type: String,
    enum: ['unaffected', 'notified', 'rescheduled', 'switched', 'cancelled', 'waiting'],
    default: 'unaffected',
  },
  testName: { type: String, default: null },
  refundStatus: {
    type: String,
    enum: ['not_applicable', 'pending', 'processed'],
    default: 'not_applicable',
  },
  bookingRef: { type: String, default: '' },
  bookingType: {
    type: String,
    enum: ["online", "offline"],
    default: "online"
  },
  offlinePatientName: { type: String, default: null },
  offlinePatientPhone: { type: String, default: null },
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('Appointment', appointmentSchema);
