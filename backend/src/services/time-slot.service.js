const TimeSlot = require('../models/time-slot.model');
const { getSettings } = require('./settings.service');
const ApiError = require('../utils/api-error');
const { parseDateOnly, addDays } = require('../utils/date-time');
async function ensureSlots(date, settings) {
  const exists = await TimeSlot.exists({ date });
  if (!exists) {
    const docs = (settings.slotTemplates || []).map(slot => ({ date, label: slot.label, capacity: slot.capacity, used: 0, closed: false }));
    if (docs.length) await TimeSlot.bulkWrite(docs.map(doc => ({ updateOne: { filter: { date, label: doc.label }, update: { $setOnInsert: doc }, upsert: true } })), { ordered: false });
  }
}
async function getAvailableSlots(dateString) {
  const settings = await getSettings();
  const date = parseDateOnly(dateString);
  if (!date) throw new ApiError(400, 'INVALID_DATE', 'Ngày nhận bánh không hợp lệ.');
  const now = new Date();
  const minDate = new Date(now.getTime() + (settings.minLeadHours ?? 24) * 3600000);
  const maxDate = addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), settings.maxAdvanceDays ?? 7);
  const requestedEnd = new Date(date.getTime() + 86400000 - 1);
  if (requestedEnd < minDate || date > maxDate) return [];
  await ensureSlots(date, settings);
  const slots = await TimeSlot.find({ date }).sort({ label: 1 }).lean();
  return slots.map(slot => ({ id: slot._id, label: slot.label, capacity: slot.capacity, used: slot.used, status: slot.closed ? 'closed' : slot.used >= slot.capacity ? 'full' : 'open' }));
}
async function holdSlot(slotId, session) {
  const slot = await TimeSlot.findOneAndUpdate({ _id: slotId, closed: false, $expr: { $lt: ['$used', '$capacity'] } }, { $inc: { used: 1 } }, { new: true, session });
  if (!slot) throw new ApiError(409, 'SLOT_UNAVAILABLE', 'Khung giờ vừa hết chỗ hoặc đã đóng.');
  return slot;
}
async function releaseSlot(slotId, session) {
  if (!slotId) return;
  await TimeSlot.updateOne({ _id: slotId, used: { $gt: 0 } }, { $inc: { used: -1 } }, { session });
}
module.exports = { getAvailableSlots, holdSlot, releaseSlot, ensureSlots };
