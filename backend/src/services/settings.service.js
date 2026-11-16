const Settings = require('../models/settings.model');
const ApiError = require('../utils/api-error');
async function getSettings() {
  const settings = await Settings.findOne().lean();
  if (!settings) throw new ApiError(503, 'SETTINGS_NOT_CONFIGURED', 'Cửa hàng chưa cấu hình cài đặt.');
  return settings;
}
function toPublicSettings(settings) {
  return { deliveryFee: settings.deliveryFee || 0, deliveryCity: settings.deliveryCity || 'TP.HCM', branches: settings.branches || [], qrExpireMinutes: settings.qrExpireMinutes || 10, hotline: settings.hotline || '', refundPolicy: settings.refundPolicy || {} };
}
module.exports = { getSettings, toPublicSettings };
