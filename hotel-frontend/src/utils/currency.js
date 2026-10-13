// Giá trong backend vẫn là VND.
// Đây là tỷ giá hiển thị mặc định, không phải tỷ giá cập nhật trực tiếp.
const FALLBACK_VND_PER_USD = 25000;

export const getVndPerUsd = () => {
    const configuredRate = Number(import.meta.env.VITE_VND_PER_USD);

    return Number.isFinite(configuredRate) && configuredRate > 0
        ? configuredRate
        : FALLBACK_VND_PER_USD;
};

/**
 * Chỉ định dạng giá để hiển thị.
 * Không dùng kết quả này để gửi API hoặc thanh toán.
 */
export const formatHotelCurrency = (amount, language = 'vi') => {
    const vndAmount = Number(amount);
    if (!Number.isFinite(vndAmount)) return '';

    const isVietnamese = String(language).toLowerCase().startsWith('vi');
    const displayAmount = isVietnamese
        ? vndAmount
        : vndAmount / getVndPerUsd();

    return new Intl.NumberFormat(isVietnamese ? 'vi-VN' : 'en-US', {
        style: 'currency',
        currency: isVietnamese ? 'VND' : 'USD',
        minimumFractionDigits: isVietnamese ? 0 : 2,
        maximumFractionDigits: isVietnamese ? 0 : 2,
    }).format(displayAmount);
};