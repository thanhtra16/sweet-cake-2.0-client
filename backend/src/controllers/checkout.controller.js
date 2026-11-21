const { getAvailableSlots } = require('../services/time-slot.service');
const { getSettings, toPublicSettings } = require('../services/settings.service');
const { validateVoucher } = require('../services/voucher.service');
const { quoteOrder } = require('../services/pricing.service');
const { createOrder, createPaymentQr, processWebhook } = require('../services/order.service');
const { assertWebhookSecret } = require('../services/payment.service');
const ApiError = require('../utils/api-error');
const Order = require('../models/order.model');
const jwt = require('jsonwebtoken');
exports.getTimeSlots = async (req, res) => res.json({ items: await getAvailableSlots(req.query.date) });
exports.getPublicSettings = async (req, res) => res.json(toPublicSettings(await getSettings()));
exports.validateVoucher = async (req, res) => { const result = await validateVoucher({ code: req.body.code, subtotal: Number(req.body.subtotal) }); res.json({ valid: true, discount: result.discount, voucher: { code: result.voucher.code, description: result.voucher.description } }); };
exports.quoteOrder = async (req, res) => res.json(await quoteOrder(req.body));
exports.createOrder = async (req, res) => {
  const { order, trackToken } = await createOrder(req.body, req.user?._id);
  res.set('X-Track-Token', trackToken);
  res.status(201).json({ order, trackToken });
};
exports.getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id).lean();
  if (!order) throw new ApiError(404, 'ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng.');
  const token = req.get('X-Track-Token');
  let allowed = Boolean(req.user && String(req.user._id) === String(order.userId));
  if (!allowed && token) {
    try { const payload = jwt.verify(token, process.env.TRACK_TOKEN_SECRET); allowed = String(payload.orderId) === String(order._id); }
    catch (_) { allowed = false; }
  }
  if (!allowed) throw new ApiError(401, 'ORDER_ACCESS_DENIED', 'Bạn không có quyền xem đơn hàng này.');
  res.json(order);
};
exports.createPaymentQr = async (req, res) => {
  const result = await createPaymentQr(req.params.id);
  res.status(201).json({ orderId: result.order._id, attempt: result.attempt, attemptsUsed: result.order.payment.attempts.length });
};
exports.paymentWebhook = async (req, res) => { assertWebhookSecret(req); const result = await processWebhook(req.body); res.json({ received: true, duplicate: result.duplicate, status: result.order.payment.status }); };
