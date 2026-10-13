const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

// Mặc định dùng /api; Vite proxy sẽ chuyển request sang backend.
export const API_BASE_URL = (configuredApiUrl || '/api').replace(/\/+$/, '');

export const API_ORIGIN = API_BASE_URL.endsWith('/api')
  ? API_BASE_URL.slice(0, -4)
  : '';

export const resolveAssetUrl = (value) => {
  if (!value || typeof value !== 'string') return '';

  if (value.startsWith('//')) return value;

  // Chuyển URL cũ trỏ đến localhost sang địa chỉ backend hiện tại.
  try {
    const parsed = new URL(value);

    if (parsed.hostname === 'localhost' && parsed.port === '9981') {
      return `${API_ORIGIN}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }

    return value;
  } catch {
    return `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
  }
};