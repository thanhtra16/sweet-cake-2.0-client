module.exports = function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.statusCode || 500;
  const body = { code: error.code || 'INTERNAL_SERVER_ERROR', message: status === 500 ? 'Đã xảy ra lỗi hệ thống.' : error.message };
  if (error.details) body.details = error.details;
  if (status === 500) console.error(error);
  return res.status(status).json(body);
};
