import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from '../i18n/language';
import { Language } from '../i18n/translations';
import { Globe, Check, ChevronDown } from 'lucide-react';

const LANGUAGE_OPTIONS: Array<{
  code: Language;
  label: string;
  nativeLabel: string;
  flag: string;
}> = [
  { code: 'ar', label: 'Arabic', nativeLabel: 'العربية', flag: '🇲🇦' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
];

interface LanguageSelectorProps {
  onOpenChange?: (isOpen: boolean) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onOpenChange }) => {
  const { language, setLanguage, isRtl } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption = LANGUAGE_OPTIONS.find((opt) => opt.code === language) || LANGUAGE_OPTIONS[0];

  const updateOpen = (next: boolean) => {
    setIsOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen((prev) => {
          if (prev) {
            onOpenChange?.(false);
          }
          return false;
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onOpenChange]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => updateOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Change language / تغيير اللغة / Changer de langue"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200 hover:border-emerald-600/50 text-xs font-semibold text-stone-700 transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/30"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span className="text-sm leading-none">{currentOption.flag}</span>
        <span className="font-semibold tracking-tight text-[11px] sm:text-xs text-stone-800">
          {currentOption.nativeLabel}
        </span>
        <ChevronDown
          className={`w-3 h-3 text-stone-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute mt-1.5 w-44 rounded-xl bg-white border border-stone-200 shadow-xl py-1.5 z-50 animate-fade-in ${
            isRtl ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
          }`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-1 text-[10px] uppercase font-mono font-bold tracking-wider text-stone-400 border-b border-stone-100 mb-1">
            {isRtl ? 'اختر اللغة' : language === 'fr' ? 'Choisir la langue' : 'Select Language'}
          </div>

          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = option.code === language;
            return (
              <button
                key={option.code}
                type="button"
                role="menuitem"
                onClick={() => {
                  setLanguage(option.code);
                  updateOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs transition-colors text-start ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-stone-700 hover:bg-emerald-50/60 hover:text-emerald-900 font-medium'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{option.flag}</span>
                  <div>
                    <span className="block">{option.nativeLabel}</span>
                    <span className="block text-[10px] text-stone-400 font-mono font-normal">
                      {option.label}
                    </span>
                  </div>
                </div>

                {isSelected && <Check className="w-4 h-4 text-emerald-600 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
