const QRCode = require('qrcode');
const ApiError = require('../utils/api-error');
const { getSettings } = require('./settings.service');
async function createQrAttempt(order, attemptNumber) {
  const settings = await getSettings();
  const payload = `SWEETCAKE|${order.code}|${order.total}|${attemptNumber}`;
  const qrDataUrl = await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 2, width: 280 });
  const createdAt = new Date();
  return { qrPayload: payload, qrDataUrl, createdAt, expiresAt: new Date(createdAt.getTime() + (settings.qrExpireMinutes || 10) * 60000), status: 'pending' };
}
function assertWebhookSecret(req) {
  const expected = process.env.WEBHOOK_SECRET;
  if (!expected || req.get('x-webhook-secret') !== expected) throw new ApiError(401, 'WEBHOOK_UNAUTHORIZED', 'Webhook secret không hợp lệ.');
}
module.exports = { createQrAttempt, assertWebhookSecret };
