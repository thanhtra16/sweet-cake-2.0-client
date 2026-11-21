const mongoose = require('mongoose');
const voucherSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true }, type: { type: String, enum: ['percent', 'amount'], required: true },
  value: { type: Number, required: true, min: 0 }, maxDiscount: Number, minOrder: { type: Number, default: 0 },
  usageLimit: Number, usedCount: { type: Number, default: 0 }, expiresAt: Date, active: { type: Boolean, default: true }, description: String,
}, { timestamps: true, collection: 'vouchers' });
module.exports = mongoose.models.Voucher || mongoose.model('Voucher', voucherSchema);
