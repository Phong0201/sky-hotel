const ENGLISH_ERROR_RULES = [
  [/^Phòng đang bảo trì, không thể đặt\.?$/i, 'This room is under maintenance and cannot be booked.'],
  [/^Phòng đã có khách đặt từ (.+?) đến (.+?)\.?$/i, 'The room is already booked from $1 to $2.'],
  [/^Phòng (.+?) đã có khách đặt từ (.+?) đến (.+?)\.?\s*Vui lòng chọn ngày khác!?$/i, 'Room $1 is booked from $2 to $3. Please choose different dates.'],
  [/^Bạn không có quyền truy cập giao dịch này\.?$/i, 'You are not allowed to access this transaction.'],
  [/^Giao dịch không thuộc booking nào\.?$/i, 'This transaction is not linked to a booking.'],
  [/^Phương thức thanh toán không hợp lệ:\s*(.+)$/i, 'Invalid payment method: $1'],
  [/^Số tiền thanh toán không hợp lệ:\s*(.+)$/i, 'Invalid payment amount: $1'],
  [/^Bạn không có quyền truy cập thanh toán của đặt phòng này\.?$/i, 'You are not allowed to access this booking payment.'],
  [/^Đặt phòng đã bị hủy, không thể thanh toán\.?$/i, 'This booking has been cancelled and cannot be paid.'],
  [/^Đặt phòng #(\d+) đã được thanh toán đầy đủ\.?$/i, 'Booking #$1 has already been paid in full.'],
  [/^Giao dịch #(\d+) đã được xác nhận trước đó\.?$/i, 'Transaction #$1 has already been confirmed.'],
  [/^Chỉ có thể hủy giao dịch đang chờ thanh toán\.?$/i, 'Only pending transactions can be cancelled.'],
  [/^Đã cấu hình VNPAY thật - vui lòng thanh toán qua cổng VNPAY\.?$/i, 'Live VNPay is configured. Please complete payment through the VNPay gateway.'],
  [/^Vui lòng chọn phòng/i, 'Please select an available room.'],
  [/^Không tìm thấy đặt phòng/i, 'The booking could not be found.'],
  [/^Không thể tải/i, 'Could not load the requested information.'],
];

const extractMessage = (source) => {
  if (source == null) return '';
  if (typeof source === 'string') return source.trim();
  if (source instanceof Error) return source.message || '';
  if (typeof source === 'object') {
    const candidate = source.message || source.error || source.detail || source.title;
    if (typeof candidate === 'string') return candidate.trim();
    return '';
  }
  return String(source).trim();
};

/**
 * Translate known backend validation messages for English UI without touching
 * customer-authored or admin-authored content. Unknown Vietnamese server errors
 * fall back to the page's localized generic error instead of leaking Vietnamese.
 */
export const localizeApiError = (source, language, fallback) => {
  const message = extractMessage(source);
  if (!message) return fallback;
  if (String(language || '').toLowerCase().startsWith('vi')) return message;

  for (const [pattern, replacement] of ENGLISH_ERROR_RULES) {
    if (pattern.test(message)) return message.replace(pattern, replacement);
  }

  return /[À-ỹ]/.test(message) || message.startsWith('{') || message.startsWith('[')
    ? fallback
    : message;
};