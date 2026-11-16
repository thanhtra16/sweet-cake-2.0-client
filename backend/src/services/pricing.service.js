const mongoose = require('mongoose');
const Product = mongoose.models.Product || mongoose.model('Product');
const ApiError = require('../utils/api-error');
const { getSettings } = require('./settings.service');
const { validateVoucher } = require('./voucher.service');
// TODO: CHECK WITH PROJECT – map customization/variant pricing vào engine quote chính thức của nhóm.
async function quoteOrder({ items = [], voucherCode, receiveMethod = 'pickup' }) {
  if (!Array.isArray(items) || !items.length) throw new ApiError(400, 'EMPTY_CART', 'Giỏ hàng đang trống.');
  const snapshots = []; let subtotal = 0;
  for (const item of items) {
    const product = await Product.findById(item.productId).lean();
    if (!product || product.status !== 'visible') throw new ApiError(409, 'PRODUCT_HIDDEN', 'Một sản phẩm không còn kinh doanh.');
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) throw new ApiError(400, 'INVALID_QUANTITY', 'Số lượng mỗi sản phẩm từ 1 đến 10.');
    const basePrice = Number(product.salePrice ?? product.basePrice);
    // Giá cấu hình chi tiết phải được thay bằng pricing engine hiện có của nhóm.
    const unitPrice = basePrice;
    const lineTotal = unitPrice * qty; subtotal += lineTotal;
    snapshots.push({ productId: product._id, kind: product.kind, name: product.name, imageId: product.imageIds?.[0], basePrice: product.basePrice, salePrice: product.salePrice, config: item.config || {}, variant: item.variant || null, surcharges: [], unitPrice, qty, lineTotal });
  }
  let discount = 0; let voucherSnapshot = null;
  if (voucherCode) {
    const validated = await validateVoucher({ code: voucherCode, subtotal });
    discount = validated.discount;
    voucherSnapshot = { code: validated.voucher.code, type: validated.voucher.type, value: validated.voucher.value, discount, restored: false };
  }
  const settings = await getSettings();
  const deliveryFee = receiveMethod === 'delivery' ? Number(settings.deliveryFee || 0) : 0;
  return { items: snapshots, subtotal, discount, deliveryFee, total: Math.max(0, subtotal - discount + deliveryFee), voucher: voucherSnapshot };
}
module.exports = { quoteOrder };
