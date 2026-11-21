const mongoose = require('mongoose');
const Order = require('../models/order.model');
const { getSettings } = require('./settings.service');
const { releaseSlot } = require('./time-slot.service');
const { restoreVoucher } = require('./voucher.service');
async function expireOrders() {
  const now = new Date();
  const settings = await getSettings();
  const maxAttempts = 1 + (settings.maxQrRetries ?? 3);
  const candidates = await Order.find({ status: 'pending_payment', 'payment.status': 'pending' }).limit(200);
  for (const candidate of candidates) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const order = await Order.findById(candidate._id).session(session);
        if (!order || order.status !== 'pending_payment' || order.payment.status !== 'pending') return;
        const attempts = order.payment.attempts || [];
        const lastAttempt = attempts[attempts.length - 1];
        const deadlineExpired = order.payment.deadlineAt && order.payment.deadlineAt <= now;
        const finalQrExpired = attempts.length >= maxAttempts && lastAttempt?.expiresAt <= now;
        if (deadlineExpired || finalQrExpired) {
          order.status = 'cancelled'; order.cancellation = { by: 'system', reason: 'payment_expired', cause: 'other', at: now };
          order.statusHistory.push({ from: 'pending_payment', to: 'cancelled', by: 'system', at: now, reason: 'payment_expired' });
          if (order.payment.slotHeld) { await releaseSlot(order.slotId, session); order.payment.slotHeld = false; }
          await restoreVoucher(order, session); await order.save({ session });
        } else if (lastAttempt?.expiresAt <= now && order.payment.slotHeld) {
          await releaseSlot(order.slotId, session); order.payment.slotHeld = false; lastAttempt.status = 'expired'; await order.save({ session });
        }
      });
    } finally { await session.endSession(); }
  }
}
module.exports = { expireOrders };
