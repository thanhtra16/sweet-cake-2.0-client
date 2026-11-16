const mongoose = require('mongoose');
const settingsSchema = new mongoose.Schema({
  minLeadHours: { type: Number, default: 24 }, maxAdvanceDays: { type: Number, default: 7 }, deliveryFee: { type: Number, default: 0 }, deliveryCity: { type: String, default: 'TP.HCM' },
  branches: [{ name: String, address: String, phone: String }], slotTemplates: [{ label: String, capacity: Number }], workingHours: mongoose.Schema.Types.Mixed,
  qrExpireMinutes: { type: Number, default: 10 }, maxQrRetries: { type: Number, default: 3 }, hotline: String,
  refundPolicy: { acceptedPercent: Number, inProgressPercent: Number, shopFaultPercent: Number },
}, { timestamps: true, collection: 'settings' });
module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
