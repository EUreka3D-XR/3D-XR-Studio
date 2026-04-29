import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import dei file di traduzione
import itTranslation from './locales/it/translation.json';
import enTranslation from './locales/en/translation.json';
import esTranslation from './locales/es/translation.json';
import caTranslation from './locales/ca/translation.json';

// Configurazione delle risorse
const resources = {
  it: {
    translation: itTranslation
  },
  en: {
    translation: enTranslation
  },
  es: {
    translation: esTranslation
  },
  ca: {
    translation: caTranslation
  }
};

i18n
  // Passa l'istanza i18n a react-i18next
  .use(initReactI18next)
  // Inizializza i18next
  .init({
    resources,
    
    // Lingua di default
    lng: 'en',
    
    // Lingua di fallback se manca una traduzione
    fallbackLng: 'en',
    
    defaultNS: 'translation',
    
    // Debug in sviluppo (opzionale)
    debug: process.env.NODE_ENV === 'development',
    
    // Opzioni di interpolazione
    interpolation: {
      escapeValue: false // React già gestisce l'XSS
    },
    
    // Salva la lingua selezionata nel localStorage
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;