const ApiError = require('../utils/api-error');
function validateCreateOrder(req, res, next) {
  const body = req.body || {};
  if (!body.receiver?.fullName || !body.receiver?.phone) return next(new ApiError(400, 'INVALID_RECEIVER', 'Vui lòng nhập họ tên và số điện thoại người nhận.'));
  if (!['delivery', 'pickup'].includes(body.receiveMethod)) return next(new ApiError(400, 'INVALID_RECEIVE_METHOD', 'Phương thức nhận bánh không hợp lệ.'));
  if (!body.slotId) return next(new ApiError(400, 'INVALID_SLOT', 'Vui lòng chọn khung giờ nhận bánh.'));
  if (String(body.note || '').length > 200) return next(new ApiError(400, 'NOTE_TOO_LONG', 'Ghi chú tối đa 200 ký tự.'));
  next();
}
module.exports = { validateCreateOrder };
