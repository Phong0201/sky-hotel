-- V2: Hoàn thiện luồng thanh toán (VNPay + chuyển khoản + tiền mặt)
-- Lưu ý: project đang dùng spring.jpa.hibernate.ddl-auto=update nên Hibernate
-- tự thêm cột completed_at. File này để chạy tay cho DB có sẵn nếu cần.

ALTER TABLE payments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- payment_method: VNPAY | BANK_TRANSFER | CASH
-- payment_status: PENDING | COMPLETED | FAILED | CANCELLED | REFUNDED
