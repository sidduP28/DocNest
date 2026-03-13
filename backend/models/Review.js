const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true,
    unique: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  hospitalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, required: true },
  doctorName: { type: String, required: true },
  doctorRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  hospitalRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  waitTimeExperience: {
    type: String,
    enum: ["fast", "okay", "long"],
    required: true
  },
  comment: {
    type: String,
    default: null,
    maxlength: 500
  },
  isVerified: {
    type: Boolean,
    default: true
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);
