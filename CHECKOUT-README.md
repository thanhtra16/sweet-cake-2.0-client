# Sweet Cake 2.0 – G: Checkout và Đặt đơn (G1–G8)

Bộ source tích hợp riêng, không phải toàn bộ dự án. Tuân thủ quy ước đặt tên nhóm và dùng C3 Buyer Shared làm tham chiếu UI.

## Nội dung
- `backend/`: Express + Mongoose: G1–G6 (khung giờ, settings public, voucher validate, tạo đơn, VietQR mô phỏng, webhook, tạo lại QR, job hết hạn).
- `frontend/`: Angular standalone: G7–G8 (checkout, chọn khung giờ, voucher, kết quả, màn QR/polling).
- `INTEGRATION-CHECKLIST.md`: các điểm bắt buộc đối chiếu với source/schema thật trước khi merge.

## Quan trọng
Đây là gói code tích hợp dựa trên tài liệu nghiệp vụ và phần C3 được cung cấp; chưa có toàn bộ backend/frontend hiện hữu nên **không thể cam kết drop-in chạy ngay**. Những chỗ phụ thuộc code nhóm đã được đánh dấu `TODO: CHECK WITH PROJECT` và liệt kê trong checklist. Không ghi đè app routes, app config, models hoặc services đang có.

## Backend
1. Chép các thư mục trong `backend/src/` vào `backend/src/` hiện tại, đối chiếu trùng file trước.
2. Cài dependency còn thiếu: `npm i qrcode node-cron` (Express, Mongoose, dotenv đã có trong dự án).
3. Thêm biến môi trường theo `.env.example`.
4. Trong `src/app.js`, mount `app.use('/api', checkoutRoutes);` và `app.use(errorHandler)` sau routes.
5. Trong `src/server.js`, sau khi DB kết nối thành công gọi `startExpireOrdersJob()` (không khởi chạy job trước khi DB sẵn sàng).
6. Dùng MongoDB replica set để hỗ trợ transaction. Job/atomic updates có xử lý cạnh tranh ở mức document; quy trình tạo đơn nhiều document nên cần replica set.

## Frontend
1. Chép `frontend/src/app/features/customer/checkout` và `payment` vào đúng `src/app/features/customer/`.
2. Chép `frontend/src/app/shared/models/checkout.model.ts` và `shared/services/checkout-api.service.ts` vào app hiện tại.
3. Bổ sung route con `/checkout` và `/payment/:orderId` trong routes Buyer hiện tại; không thay toàn bộ routes.
4. Đảm bảo `HttpClient` đã được provide (`provideHttpClient()` hoặc HttpClientModule).
5. CSS dùng class `sc-*` và biến `--sc-*` theo styles.css nhóm; nếu token thực tế khác, map lại.

## Mô phỏng thanh toán
Theo scope dự án, QR được sinh để mô phỏng và webhook là endpoint giả lập; không có tích hợp ngân hàng thật, không chuyển/hoàn tiền thật. Webhook chỉ được gọi bởi backend/test tool có secret.
