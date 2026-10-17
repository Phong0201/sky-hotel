const PAYMENT_TEXT = /thanh toán|payment|\bpaid\b|vnpay/i;

export const getNotificationCategory = (notification) => {
    const type = String(notification?.type || 'system').toLowerCase();
    const content = `${notification?.title || ''} ${notification?.message || ''}`;

    if (type === 'payment' || (type === 'booking' && PAYMENT_TEXT.test(content))) {
        return 'payments';
    }
    if (type === 'review' || /đánh giá|\breview\b/i.test(content)) return 'reviews';
    if (type === 'promotion') return 'promotions';
    if (type === 'booking') return 'bookings';
    if (type === 'chat' || type === 'support') return 'support';

    return 'system';
};

const localizeTitle = (title) => {
    const rules = [
        [/^✅\s*Đặt phòng thành công!?/i, '✅ Booking successful!'],
        [/^💰\s*Thanh toán thành công/i, '💰 Payment successful'],
        [/^📋\s*Đặt phòng mới/i, '📋 New booking'],
        [/^📋\s*Cập nhật đặt phòng/i, '📋 Booking update'],
        [/^🎉\s*Khuyến mãi mới\s*:/i, '🎉 New promotion:'],
        [/^🎉\s*Khuyến mãi đã được kích hoạt\s*:/i, '🎉 Promotion activated:'],
    ];

    return rules.reduce(
        (result, [pattern, replacement]) => result.replace(pattern, replacement),
        title
    );
};

const localizeMessage = (message) => {
    let match = message.match(
        /^Bạn đã đặt phòng (.+?) thành công\.\s*Mã đặt phòng:\s*(\S+)/i
    );

    if (match) {
        return `Your booking for room ${match[1]} was successful. Booking code: ${match[2]}`;
    }

    match = message.match(
        /^Đặt phòng #?(\d+)\s+đã được thanh toán\s+([\d.,]+)đ(?:\s+qua\s+([\p{L}\d_-]+))?(?:\s+lúc\s+([^.]+))?(?:\.\s*(.*))?$/iu
    );

    if (match) {
        const [, bookingId, amount, method, time, closing] = match;
        const paymentMethod = method ? ` via ${method.toUpperCase()}` : '';
        const paymentTime = time ? ` at ${time}` : '';
        const thankYou = /cảm ơn bạn đã lựa chọn skyhotel/i.test(closing)
            ? ' Thank you for choosing SkyHotel.'
            : closing
                ? ` ${closing}`
                : '';

        return `Booking #${bookingId} was paid: ${amount} VND${paymentMethod}${paymentTime}.${thankYou}`;
    }

    match = message.match(
        /^Trạng thái đặt phòng của bạn đã được cập nhật thành:\s*(\w+)/i
    );

    if (match) {
        const statusLabels = {
            PENDING: 'Pending',
            CONFIRMED: 'Confirmed',
            CHECKED_IN: 'Checked in',
            CHECKED_OUT: 'Checked out',
            CANCELLED: 'Cancelled',
        };

        return `Your booking status has been updated to: ${statusLabels[match[1].toUpperCase()] || match[1]
            }.`;
    }

    match = message.match(
        /^Khách hàng:\s*(.*?)\s*-\s*Phòng:\s*(.*?)\s*-\s*Ngày:\s*(.*)$/i
    );

    if (match) {
        return `Guest: ${match[1]} · Room: ${match[2]} · Dates: ${match[3]}`;
    }

    match = message.match(
        /^Mã:\s*(\S+)\s*-\s*Giảm\s*([\d.,]+)\s*(%|đ)(?:\s*\(Đơn tối thiểu:\s*([\d.,]+)đ\))?/i
    );

    if (match) {
        const [, code, amount, unit, minimum] = match;
        const discount = unit === '%' ? `${amount}% off` : `${amount} VND off`;
        const minimumText = minimum ? ` (Minimum order: ${minimum} VND)` : '';

        return `Code: ${code} · ${discount}${minimumText}`;
    }

    return message;
};

export const localizeNotification = (notification, language) => {
    if (!notification || !String(language || '').toLowerCase().startsWith('en')) {
        return notification;
    }

    return {
        ...notification,
        title: localizeTitle(notification.title || ''),
        message: localizeMessage(notification.message || ''),
    };
};