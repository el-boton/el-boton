import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import es from '../locales/es.json';

const LANGUAGE_KEY = '@app_language';

const resources = {
  en: { translation: en },
  es: { translation: es },
};

export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
];

// Get device locale, defaulting to English
const deviceLocale = Localization.getLocales()[0]?.languageCode || 'en';
const supportedCodes = supportedLanguages.map(l => l.code);
const defaultLanguage = supportedCodes.includes(deviceLocale) ? deviceLocale : 'en';

i18n.use(initReactI18next).init({
  resources,
  lng: defaultLanguage,
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  compatibilityJSON: 'v4',
});

// Load saved language preference
export const loadSavedLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLanguage && supportedCodes.includes(savedLanguage)) {
      await i18n.changeLanguage(savedLanguage);
      return savedLanguage;
    }
  } catch (error) {
    console.error('Error loading saved language:', error);
  }
  return null;
};

// Change language and persist preference
export const changeLanguage = async (languageCode: string) => {
  try {
    await i18n.changeLanguage(languageCode);
    await AsyncStorage.setItem(LANGUAGE_KEY, languageCode);
  } catch (error) {
    console.error('Error changing language:', error);
  }
};

// Get current language
export const getCurrentLanguage = () => i18n.language;

export default i18n;
