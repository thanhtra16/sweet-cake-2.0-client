const express = require('express');
const controller = require('../controllers/checkout.controller');
const asyncHandler = require('../utils/async-handler');
const { validateCreateOrder } = require('../validators/checkout.validator');
const router = express.Router();
// TODO: CHECK WITH PROJECT – gắn optionalAuth hiện có để req.user được gắn khi Buyer đăng nhập.
router.get('/time-slots', asyncHandler(controller.getTimeSlots));
router.get('/settings/public', asyncHandler(controller.getPublicSettings));
router.post('/orders/quote', asyncHandler(controller.quoteOrder));
router.post('/vouchers/validate', asyncHandler(controller.validateVoucher));
router.post('/orders', validateCreateOrder, asyncHandler(controller.createOrder));
router.get('/orders/:id', asyncHandler(controller.getOrder));
router.post('/orders/:id/payment/qr', asyncHandler(controller.createPaymentQr));
router.post('/payments/webhook', asyncHandler(controller.paymentWebhook));
module.exports = router;
