# Những phần cần Trang kiểm tra trước khi tích hợp

## A. Bắt buộc đối chiếu schema/model
- [ ] `Product`: code hiện tại dùng `Product.findById()` và giả định `basePrice`, `salePrice`, `name`, `kind`, `imageIds`. Nếu schema thật khác, chỉnh `pricing.service.js`.
- [ ] `Settings`: code giả định collection singleton `settings`, document có `minLeadHours`, `maxAdvanceDays`, `deliveryFee`, `branches`, `slotTemplates`, `workingHours`, `qrExpireMinutes`, `maxQrRetries`, `hotline`, `refundPolicy`.
- [ ] `TimeSlot`: unique index `{ date, label }`, trường `capacity`, `used`, `closed`.
- [ ] `Voucher`: `code`, `type`, `value`, `maxDiscount`, `minOrder`, `usageLimit`, `usedCount`, `expiresAt`, `active`.
- [ ] `Order`: đối chiếu nested schema `receiver`, `items`, `voucher`, `payment`, `statusHistory`, `cancellation`, `refund` với schema nhóm. Không tạo collection payments/refunds.
- [ ] Kiểm tra model hiện hữu trước khi chép các file `.model.js`; tránh Overwrite model nhóm.

## B. Quyết định nghiệp vụ cần xác nhận
- [ ] `expectedTotal` gửi bằng số nguyên VND và backend trả `409 { code: 'PRICE_CHANGED', message, currentQuote }`.
- [ ] Slot capacity đếm đơn chưa hủy đang giữ chỗ. Quy tắc `slotHeld` và lúc nhả slot phải thống nhất giữa G3/G5/G6.
- [ ] Thời gian giữ chỗ ban đầu = `settings.qrExpireMinutes` (mặc định 10 phút); deadline toàn đơn = 40 phút theo bảng G6.
- [ ] Tối đa QR = 1 + `maxQrRetries` (mặc định 3), xác nhận “tối đa 1+3” có nghĩa 4 attempts.
- [ ] Khi QR hết hạn còn retry: nhả slot; khi tạo QR mới phải giữ slot lại nguyên tử.
- [ ] Khi đơn đã hủy mà webhook báo tiền về: lưu `payment.latePayment`, tạo refund 100% trong document order; không chuyển tiền thật.
- [ ] Webhook payload mô phỏng `{ orderCode, txnId, amount, status }`; xác thực bằng `WEBHOOK_SECRET` qua header `x-webhook-secret`.
- [ ] `X-Track-Token`: kiểm tra middleware theo dõi đơn hiện tại của nhóm. Gói này tạo token JWT riêng bằng `TRACK_TOKEN_SECRET`; cần thống nhất với API tracking.
- [ ] Quy tắc tính giá đầy đủ cho size/filling/base/frosting/sweetness/message/variants cần map vào pricing service. Gói hiện tại xử lý snapshot căn bản và ghi chú chỗ tích hợp engine báo giá chuẩn.
- [ ] Nhận tại 2 chi nhánh: xác định `pickupBranch` gửi `_id` hay `branchId` theo schema nhóm.
- [ ] Giao hàng: schema nhóm yêu cầu `shippingAddress`; form mẫu hiện tập trung nhánh nhận tại cửa hàng, phần địa chỉ cần map theo component địa chỉ hiện có.

## C. Frontend cần kiểm tra
- [ ] CartService hiện tại: map shape giỏ hàng vào `QuoteRequest.items`.
- [ ] AuthService: xác định cách lấy JWT. CheckoutApiService không tự thêm Authorization; interceptor chung cần xử lý.
- [ ] Toast C3: import đúng đường dẫn ToastService. Hiện component dùng thông báo inline để tránh phụ thuộc đường dẫn C3.
- [ ] PriceChangeDialog dùng chung: thay confirm() hiện tại bằng component shared theo cây component mục 3.1.
- [ ] Route Buyer layout: thêm child route, không ghi đè app.routes.ts.
- [ ] Theme CSS `sc-*`: kiểm tra styles.css đã được load global.
- [ ] Nếu dùng Guest, lưu `X-Track-Token` trả từ tạo đơn và gửi ở request xem trạng thái. Đừng lưu token vào localStorage nếu chính sách nhóm không cho phép.

## D. Kiểm thử bắt buộc
- [ ] 2 request đồng thời tranh slot cuối: chỉ 1 request thành công.
- [ ] 2 request đồng thời dùng voucher lượt cuối: chỉ 1 request thành công.
- [ ] expectedTotal lệch: 409 PRICE_CHANGED, không tạo order/không giữ slot.
- [ ] Webhook cùng txnId gửi 2 lần: chỉ ghi nhận 1 lần.
- [ ] Webhook sai secret: 401.
- [ ] QR hết hạn khi còn retry: nhả slot nhưng đơn chưa hủy.
- [ ] QR cuối hết hạn hoặc quá 40 phút: hủy đơn, nhả slot, hoàn voucher đúng 1 lần.
- [ ] Thanh toán đến sau khi cancelled: ghi latePayment và refund 100%.
- [ ] Ngày ngoài khoảng 24 giờ–7 ngày: API time-slots từ chối hoặc trả danh sách rỗng theo quyết định nhóm.
