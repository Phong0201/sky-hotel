import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import vi from './locales/vi.json';

const resources = {
  en: { translation: en },
  vi: { translation: vi }
};

const getSavedLanguage = () => {
  if (typeof window === 'undefined') return undefined;

  try {
    const saved =
      window.localStorage.getItem('language') ||
      window.localStorage.getItem('i18nextLng');

    if (saved?.toLowerCase().startsWith('vi')) return 'vi';
    if (saved?.toLowerCase().startsWith('en')) return 'en';
  } catch {
    // Dùng ngôn ngữ trình duyệt nếu localStorage không truy cập được.
  }

  return undefined;
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'language',
      caches: ['localStorage']
    },
    debug: false,
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;