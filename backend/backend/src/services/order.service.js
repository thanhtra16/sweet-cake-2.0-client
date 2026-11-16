const mongoose = require('mongoose');
const crypto = require('crypto');
const Order = require('../models/order.model');
const { getSettings } = require('./settings.service');
const { quoteOrder } = require('./pricing.service');
const { holdSlot, releaseSlot } = require('./time-slot.service');
const { consumeVoucher, restoreVoucher } = require('./voucher.service');
const { createQrAttempt } = require('./payment.service');
const { createTrackToken } = require('../utils/track-token');
const ApiError = require('../utils/api-error');
function makeOrderCode() { return `SC${Date.now().toString().slice(-8)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`; }
async function createOrder(payload, userId) {
  const quote = await quoteOrder(payload);
  if (Number(payload.expectedTotal) !== quote.total) throw new ApiError(409, 'PRICE_CHANGED', 'Giá đơn hàng đã thay đổi. Vui lòng xác nhận lại.', { currentQuote: quote });
  const settings = await getSettings();
  const session = await mongoose.startSession(); let created;
  try {
    await session.withTransaction(async () => {
      const slot = await holdSlot(payload.slotId, session);
      if (quote.voucher?.code) await consumeVoucher(quote.voucher.code, session);
      const now = new Date();
      const order = new Order({
        code: makeOrderCode(), userId: userId || null, receiver: payload.receiver,
        receiveMethod: payload.receiveMethod, shippingAddress: payload.shippingAddress, pickupBranch: payload.pickupBranch,
        receiveDate: slot.date, slotId: slot._id, slotLabel: slot.label, note: payload.note || '', items: quote.items,
        subtotal: quote.subtotal, discount: quote.discount, deliveryFee: quote.deliveryFee, total: quote.total, voucher: quote.voucher,
        status: 'pending_payment', statusHistory: [{ from: null, to: 'pending_payment', by: 'system', at: now }],
        payment: { status: 'pending', attempts: [], slotHeld: true, deadlineAt: new Date(now.getTime() + 40 * 60000) },
      });
      const attempt = await createQrAttempt(order, 1);
      order.payment.attempts.push(attempt);
      await order.save({ session });
      created = order;
    });
  } finally { await session.endSession(); }
  return { order: created, trackToken: createTrackToken(created._id, true) };
}
async function createPaymentQr(orderId) {
  const session = await mongoose.startSession(); let result;
  try {
    await session.withTransaction(async () => {
      const order = await Order.findById(orderId).session(session);
      if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
      if (order.status === 'cancelled') throw new ApiError(409, 'ORDER_CANCELLED', 'Đơn hàng đã bị hủy.');
      if (order.payment.status === 'paid') throw new ApiError(409, 'ALREADY_PAID', 'Đơn hàng đã được thanh toán.');
      if (new Date() > order.payment.deadlineAt) throw new ApiError(409, 'PAYMENT_DEADLINE_EXPIRED', 'Đơn hàng đã hết thời gian thanh toán.');
      const settings = await getSettings(); const maxAttempts = 1 + (settings.maxQrRetries ?? 3);
      if (order.payment.attempts.length >= maxAttempts) throw new ApiError(409, 'QR_RETRY_LIMIT', 'Bạn đã sử dụng hết số lần tạo lại mã QR.');
      const current = order.payment.attempts[order.payment.attempts.length - 1];
      if (current && current.expiresAt > new Date()) throw new ApiError(409, 'QR_NOT_EXPIRED', 'Mã QR hiện tại vẫn còn hiệu lực.');
      if (!order.payment.slotHeld) { await holdSlot(order.slotId, session); order.payment.slotHeld = true; }
      const attempt = await createQrAttempt(order, order.payment.attempts.length + 1);
      order.payment.attempts.push(attempt); await order.save({ session }); result = { order, attempt };
    });
  } finally { await session.endSession(); }
  return result;
}
async function processWebhook({ orderCode, txnId, amount, status }) {
  if (!orderCode || !txnId) throw new ApiError(400, 'INVALID_WEBHOOK', 'Thiếu orderCode hoặc txnId.');
  const order = await Order.findOne({ code: orderCode });
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
  if (order.payment.txnId === txnId) return { duplicate: true, order };
  if (status !== 'success') return { duplicate: false, ignored: true, order };
  if (Number(amount) !== Number(order.total)) throw new ApiError(409, 'PAYMENT_AMOUNT_MISMATCH', 'Số tiền thanh toán không khớp.');
  if (order.status === 'cancelled') {
    order.payment.latePayment = { txnId, amount: Number(amount), receivedAt: new Date(), note: 'Late payment after cancellation' };
    order.payment.txnId = txnId; order.payment.status = 'late_paid';
    order.refund = { source: 'late_payment', status: 'pending', suggestedAmount: Number(amount), amount: Number(amount), dueAt: new Date(Date.now() + 3 * 86400000) };
  } else {
    order.payment.txnId = txnId; order.payment.status = 'paid'; order.payment.paidAt = new Date(); order.payment.confirmedBy = 'webhook';
    order.status = 'pending_approval'; order.statusHistory.push({ from: 'pending_payment', to: 'pending_approval', by: 'system', at: new Date(), reason: 'payment_confirmed' });
    order.payment.attempts.forEach(item => { item.status = 'paid'; });
  }
  await order.save(); return { duplicate: false, order };
}
module.exports = { createOrder, createPaymentQr, processWebhook };
