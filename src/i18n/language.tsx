import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language, translations, Translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
  isRtl: boolean;
  dir: 'rtl' | 'ltr';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'turba_language_preference';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read saved language or default to Arabic ('ar') as requested by user
  const [language, setLanguageState] = useState<Language>(() => {
    const [language, setLanguageState] = useState<Language>(() => {
  let saved: string | null = null;

  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Could not read language preference:', error);
  }

  if (saved === 'ar' || saved === 'en' || saved === 'fr') {
    return saved;
  }

  const navLang =
    typeof navigator !== 'undefined'
      ? navigator.language.toLowerCase()
      : 'ar';

  if (navLang.startsWith('ar')) return 'ar';
  if (navLang.startsWith('fr')) return 'fr';
  if (navLang.startsWith('en')) return 'en';

  return 'ar';
});
    if (saved === 'ar' || saved === 'en' || saved === 'fr') {
      return saved;
    }
    // Check browser preference if available
    const navLang = navigator.language.toLowerCase();
    if (navLang.startsWith('ar')) return 'ar';
    if (navLang.startsWith('fr')) return 'fr';
    if (navLang.startsWith('en')) return 'en';
    return 'ar'; // Default to Arabic
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore storage quota errors
    }
  };

  const isRtl = language === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';

  // Apply html dir and lang attributes
  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [dir, language]);

  const value = useMemo<LanguageContextType>(() => {
    return {
      language,
      setLanguage,
      t: translations[language],
      isRtl,
      dir,
    };
  }, [language, isRtl, dir]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
