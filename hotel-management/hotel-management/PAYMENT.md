# 💳 Tài liệu tính năng Thanh toán — SkyHotel

Tính năng thanh toán hoàn chỉnh cho hệ thống đặt phòng, gồm **3 phương thức**:

| Phương thức | Mã | Luồng |
|---|---|---|
| 🏦 VNPay (QR / thẻ ATM / thẻ quốc tế) | `VNPAY` | Khách thanh toán online ngay → tự động xác nhận booking |
| 🏧 Chuyển khoản ngân hàng | `BANK_TRANSFER` | Khách chuyển khoản → lễ tân đối soát và bấm "Xác nhận đã nhận tiền" |
| 💵 Tiền mặt tại quầy | `CASH` | Khách đến quầy → lễ tân ghi nhận |

## 1. Cấu hình VNPay

Mở `hotel-management/hotel-management/src/main/resources/application.yaml`:

```yaml
vnpay:
  pay-url: https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
  tmn-code: ""      # <-- điền mã TMN của bạn
  hash-secret: ""   # <-- điền chuỗi bí mật VNPAY gửi qua email
  return-url: http://localhost:9981/api/payments/vnpay/return
```

**Lấy mã test (miễn phí):** đăng ký tại https://sandbox.vnpayment.vn/devreg/ — VNPAY sẽ gửi email chứa `vnp_TmnCode` + `vnp_HashSecret`.

**Thẻ test sandbox:**
- Ngân hàng: NCB
- Số thẻ: `9704198526191432198`
- Tên chủ thẻ: `NGUYEN VAN A`
- Ngày phát hành: `07/15`
- OTP: `123456`

### ⚠️ Chưa có mã TMN? Không sao!
Nếu để trống `tmn-code` / `hash-secret`, hệ thống **tự chuyển sang chế độ mô phỏng**:
khách bấm "Thanh toán VNPay" sẽ vào trang `/payment/mock` (giả lập cổng, có sẵn thẻ test)
— test được toàn bộ luồng ngay không cần đăng ký gì. Điền mã thật vào là tự dùng cổng thật.

## 2. Luồng hoạt động

### Khách hàng
1. **Khi đặt phòng** (trang Đặt phòng mới, bước Xác nhận): chọn *Thanh toán ngay qua VNPay* hoặc *Thanh toán sau*.
2. **Trong "Đặt phòng của tôi"**: mỗi booking chưa trả tiền có nút 💳 **Thanh toán** + chip trạng thái (Đã thanh toán / Chờ xác nhận / Chưa thanh toán).
3. Dialog thanh toán cho chọn 3 phương thức:
    - **VNPay** → redirect sang cổng (hoặc trang mô phỏng) → quay về trang `/payment/result` hiện kết quả.
    - **Chuyển khoản** → hiện thông tin tài khoản + nội dung chuyển khoản `SKYHOTEL-{bookingId}` → tạo GD chờ.
    - **Tiền mặt** → ghi nhận lựa chọn, trả tiền tại quầy.
4. Khi thanh toán thành công: booking `PENDING → CONFIRMED` **tự động** + nhận notification 💰.

### Admin / Lễ tân
- Menu **💳 Quản lý thanh toán** (route `/payments`):
    - Thống kê: tổng tiền đã thu, thu hôm nay, thu tháng này, số tiền chờ xác nhận.
    - Bộ lọc: trạng thái, phương thức, tìm kiếm (mã GD / mã booking / tên khách), khoảng ngày.
    - Thao tác: **Xác nhận đã nhận tiền** (kèm mã biên lai + ghi chú), đánh dấu thất bại, hoàn tiền, xóa.
- Trong **Chi tiết đặt phòng**: section Thanh toán (lịch sử GD từng booking) + nút
  **Ghi nhận đã nhận tiền** cho lễ tân (chọn phương thức + mã biên lai).

## 3. API Backend

| Method | Endpoint | Quyền | Mô tả |
|---|---|---|---|
| GET | `/api/payments?status=&method=&search=&start=&end=` | ADMIN, LỄ TÂN | Danh sách có lọc |
| GET | `/api/payments/stats` | ADMIN, LỄ TÂN | Thống kê doanh thu |
| GET | `/api/payments/{id}` | Chủ booking / ADMIN / LỄ TÂN | Chi tiết 1 giao dịch |
| GET | `/api/payments/booking/{bookingId}` | Chủ booking / ADMIN / LỄ TÂN | Lịch sử GD của booking |
| POST | `/api/payments/booking/{bookingId}/pay?method=VNPAY\|BANK_TRANSFER\|CASH` | Chủ booking | Tạo giao dịch (VNPAY trả kèm `paymentUrl`) |
| GET | `/api/payments/vnpay/return` | **PUBLIC** (VNPAY gọi về) | Xác thực checksum → cập nhật GD → redirect `/payment/result` |
| POST | `/api/payments/mock/complete` | Chủ booking | Hoàn tất GD ở trang mô phỏng |
| POST | `/api/payments/{id}/confirm` | ADMIN, LỄ TÂN | Xác nhận đã nhận tiền |
| PATCH | `/api/payments/{id}/status?status=` | ADMIN, LỄ TÂN | Đổi trạng thái (FAILED / REFUNDED...) |
| DELETE | `/api/payments/{id}` | ADMIN, LỄ TÂN | Xóa giao dịch |

**Trạng thái giao dịch:** `PENDING → COMPLETED | FAILED | CANCELLED | REFUNDED`

**Logic nghiệp vụ quan trọng (đã test):**
- ✅ Chống thanh toán 2 lần: booking đã có GD `COMPLETED` thì từ chối tạo GD mới.
- ✅ Tạo GD mới tự hủy các GD `PENDING` cũ của cùng booking.
- ✅ GD `COMPLETED` → booking `PENDING` tự chuyển `CONFIRMED` + gửi notification cho khách.
- ✅ Khách hủy trên cổng VNPAY (code 24) → GD `FAILED`, booking giữ nguyên `PENDING`, khách thanh toán lại được.
- ✅ Chữ ký HMAC-SHA512 sai → từ chối, không đổi trạng thái GD.
- ✅ Phân quyền: khách chỉ đụng được booking của mình; danh sách/thống kê/xác nhận chỉ dành cho ADMIN/RECEPTIONIST.

## 4. Cấu hình tài khoản ngân hàng (tùy chọn)

Trong bảng `settings` (trang Cài đặt / API `POST /api/settings`), tạo các key:

| Key | Ý nghĩa |
|---|---|
| `bank_name` | Tên ngân hàng chi nhánh |
| `bank_account_number` | Số tài khoản nhận chuyển khoản |
| `bank_account_holder` | Tên chủ tài khoản |

Nếu chưa cấu hình, dialog hiển thị thông tin mặc định.

## 5. File chính đã thêm/sửa

**Backend** (`hotel-management/hotel-management/src/main/java/com/hotel/`)
- `config/VnpayConfig.java` *(mới)* — cấu hình + tiện ích HMAC-SHA512
- `service/VnpayService.java` *(mới)* — dựng URL thanh toán, xác thực chữ ký
- `service/PaymentServiceImpl.java` *(viết lại)* — toàn bộ logic luồng
- `service/ServiceInterfaces/PaymentService.java` *(viết lại)*
- `controller/PaymentController.java` *(viết lại)*
- `dto/request/PaymentConfirmRequest.java`, `PaymentPayRequest.java`, `MockCompleteRequest.java` *(mới)*
- `model/Payment.java` — thêm `completedAt` + hằng số
- `repository/PaymentRepository.java` — thêm query
- `config/SecurityConfig.java` — mở endpoint khách + VNPAY callback
- `application.yaml` — mục `vnpay` + `app.frontend-url`
- `db/migration/V2__payment_flow.sql` *(mới)* — Hibernate `ddl-auto: update` tự thêm cột

**Frontend** (`hotel-frontend/src/`)
- `api/payment.js` *(mới)*
- `components/payment/PaymentDialog.jsx` *(mới)* — dialog chọn phương thức
- `pages/PaymentMock.jsx` *(mới)* — trang mô phỏng cổng VNPay
- `pages/PaymentResult.jsx` *(mới)* — trang kết quả thanh toán
- `pages/Payments.jsx` *(mới)* — trang quản lý thanh toán (admin)
- `pages/CreateBooking.jsx` — bước chọn thanh toán cuối wizard
- `pages/MyBookings.jsx` — nút Thanh toán + chip trạng thái
- `pages/BookingDetail.jsx` — section thanh toán + ghi nhận của lễ tân
- `components/common/Layout.jsx` — menu 💳 Quản lý thanh toán
- `components/common/PrivateRoute.jsx` — fix `allowedRoles` hoạt động thật
- `App.jsx` — routes mới
