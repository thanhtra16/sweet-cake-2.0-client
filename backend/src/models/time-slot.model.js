const mongoose = require('mongoose');
const timeSlotSchema = new mongoose.Schema({
  date: { type: Date, required: true }, label: { type: String, required: true },
  capacity: { type: Number, required: true, min: 0 }, used: { type: Number, default: 0, min: 0 }, closed: { type: Boolean, default: false },
}, { timestamps: true, collection: 'timeSlots' });
timeSlotSchema.index({ date: 1, label: 1 }, { unique: true });
module.exports = mongoose.models.TimeSlot || mongoose.model('TimeSlot', timeSlotSchema);
