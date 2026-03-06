import AsyncStorage from '@react-native-async-storage/async-storage';
import { supportedLanguages, loadSavedLanguage, changeLanguage, getCurrentLanguage } from '@/lib/i18n';
import i18n from 'i18next';

// The actual i18n module is already initialized, so we test the exported functions

describe('i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('supportedLanguages', () => {
    it('includes English', () => {
      const english = supportedLanguages.find(l => l.code === 'en');
      expect(english).toBeDefined();
      expect(english?.name).toBe('English');
    });

    it('includes Spanish', () => {
      const spanish = supportedLanguages.find(l => l.code === 'es');
      expect(spanish).toBeDefined();
      expect(spanish?.name).toBe('Spanish');
    });

    it('has native names for each language', () => {
      supportedLanguages.forEach(lang => {
        expect(lang.nativeName).toBeDefined();
        expect(lang.nativeName.length).toBeGreaterThan(0);
      });
    });

    it('has two supported languages', () => {
      expect(supportedLanguages).toHaveLength(2);
    });

    it('has correct structure for each language', () => {
      supportedLanguages.forEach(lang => {
        expect(lang).toHaveProperty('code');
        expect(lang).toHaveProperty('name');
        expect(lang).toHaveProperty('nativeName');
      });
    });
  });

  describe('loadSavedLanguage', () => {
    it('returns null when no saved language', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

      const result = await loadSavedLanguage();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_language');
      expect(result).toBeNull();
    });

    it('returns null for unsupported language codes', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('fr');

      const result = await loadSavedLanguage();

      expect(result).toBeNull();
    });

    it('handles AsyncStorage errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await loadSavedLanguage();

      expect(result).toBeNull();
    });

    it('loads valid saved language', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('es');

      const result = await loadSavedLanguage();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@app_language');
      expect(result).toBe('es');
    });
  });

  describe('changeLanguage', () => {
    it('saves language to AsyncStorage', async () => {
      await changeLanguage('es');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_language', 'es');
    });

    it('can change to English', async () => {
      await changeLanguage('en');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith('@app_language', 'en');
    });

    it('handles storage errors gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(changeLanguage('es')).resolves.toBeUndefined();
    });
  });

  describe('getCurrentLanguage', () => {
    it('returns a string', () => {
      const result = getCurrentLanguage();

      expect(typeof result).toBe('string');
    });

    it('returns a supported language code', () => {
      const result = getCurrentLanguage();
      const supportedCodes = supportedLanguages.map(l => l.code);

      expect(supportedCodes).toContain(result);
    });
  });
});
