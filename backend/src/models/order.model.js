const mongoose = require('mongoose');
const itemSchema = new mongoose.Schema({ productId: mongoose.Schema.Types.ObjectId, kind: String, name: String, imageId: mongoose.Schema.Types.ObjectId, basePrice: Number, salePrice: Number,
  config: mongoose.Schema.Types.Mixed, variant: mongoose.Schema.Types.Mixed, surcharges: [mongoose.Schema.Types.Mixed], unitPrice: Number, qty: Number, lineTotal: Number }, { _id: false });
const attemptSchema = new mongoose.Schema({ qrDataUrl: String, qrPayload: String, createdAt: Date, expiresAt: Date, status: { type: String, enum: ['pending', 'expired', 'paid'], default: 'pending' } }, { _id: true });
const orderSchema = new mongoose.Schema({
  code: { type: String, unique: true, required: true }, userId: { type: mongoose.Schema.Types.ObjectId, default: null }, receiver: { fullName: String, phone: String },
  receiveMethod: { type: String, enum: ['delivery', 'pickup'], required: true }, shippingAddress: mongoose.Schema.Types.Mixed, pickupBranch: mongoose.Schema.Types.Mixed,
  receiveDate: Date, slotId: mongoose.Schema.Types.ObjectId, slotLabel: String, note: { type: String, maxlength: 200 }, items: [itemSchema],
  subtotal: Number, discount: Number, deliveryFee: Number, total: Number,
  voucher: { code: String, type: String, value: Number, discount: Number, restored: { type: Boolean, default: false } },
  status: { type: String, default: 'pending_payment' }, statusHistory: [mongoose.Schema.Types.Mixed],
  payment: { status: { type: String, default: 'pending' }, attempts: [attemptSchema], slotHeld: { type: Boolean, default: false }, deadlineAt: Date, txnId: String, paidAt: Date, confirmedBy: String, latePayment: mongoose.Schema.Types.Mixed },
  cancellation: mongoose.Schema.Types.Mixed, refund: mongoose.Schema.Types.Mixed,
}, { timestamps: true, collection: 'orders' });
orderSchema.index({ 'receiver.phone': 1, code: 1 });
module.exports = mongoose.models.Order || mongoose.model('Order', orderSchema);
