const Voucher = require('../models/voucher.model');
const ApiError = require('../utils/api-error');
async function validateVoucher({ code, subtotal }) {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) throw new ApiError(400, 'VOUCHER_INVALID', 'Vui lòng nhập mã voucher.');
  const voucher = await Voucher.findOne({ code: normalized }).lean();
  const now = new Date();
  if (!voucher || !voucher.active || (voucher.expiresAt && voucher.expiresAt < now) || (voucher.usageLimit != null && voucher.usedCount >= voucher.usageLimit) || Number(subtotal) < Number(voucher.minOrder || 0)) {
    throw new ApiError(400, 'VOUCHER_INVALID', 'Voucher không hợp lệ hoặc không đủ điều kiện áp dụng.');
  }
  const raw = voucher.type === 'percent' ? Number(subtotal) * Number(voucher.value) / 100 : Number(voucher.value);
  const discount = Math.min(raw, voucher.maxDiscount == null ? raw : Number(voucher.maxDiscount), Number(subtotal));
  return { voucher, discount: Math.floor(discount) };
}
async function consumeVoucher(code, session) {
  if (!code) return null;
  const voucher = await Voucher.findOneAndUpdate({ code, active: true, $expr: { $or: [{ $eq: ['$usageLimit', null] }, { $lt: ['$usedCount', '$usageLimit'] }] } }, { $inc: { usedCount: 1 } }, { new: true, session });
  if (!voucher) throw new ApiError(409, 'VOUCHER_INVALID', 'Voucher vừa hết lượt sử dụng.');
  return voucher;
}
async function restoreVoucher(order, session) {
  if (!order.voucher?.code || order.voucher.restored) return false;
  const updated = await Voucher.updateOne({ code: order.voucher.code, usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 } }, { session });
  order.voucher.restored = true;
  return updated.modifiedCount > 0;
}
module.exports = { validateVoucher, consumeVoucher, restoreVoucher };
