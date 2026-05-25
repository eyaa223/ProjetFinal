// src/i18n/i18n.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import ar from './locales/ar.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
      ar: { translation: ar },
    },
    fallbackLng: 'fr',
    supportedLngs: ['fr', 'en', 'ar'],
    lng: undefined, // ✅ Laisse LanguageDetector gérer la langue
    interpolation: { 
      escapeValue: false // React échappe déjà les valeurs
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    // ✅ Optionnel : chargement plus rapide
    react: {
      useSuspense: false,
    },
  });

// ✅ Mise à jour automatique de l'attribut lang sur <html>
i18n.on('languageChanged', (lng) => {
  const isAr = lng.startsWith('ar');
  document.documentElement.lang = lng;
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
});

export default i18n;