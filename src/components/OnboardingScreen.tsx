import React from 'react';
import { Check } from 'lucide-react';
import { LanguageCode } from '../types';
import { TRANSLATIONS } from '../utils/translations';
import { MascotIcon } from './MascotIcon';
import { MosaicBackground } from './MosaicBackground';

interface OnboardingScreenProps {
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onNext: () => void;
}

const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  currentLanguage,
  onSelectLanguage,
  onNext,
}) => {
  const t = TRANSLATIONS[currentLanguage];

  return (
    <div className="relative min-h-screen w-full bg-[#050505] text-white flex flex-col justify-between p-6 overflow-hidden">
      <MosaicBackground />

      {/* Header section with Mascot & Title */}
      <div className="relative z-10 flex flex-col items-center pt-8 pb-4 text-center">
        <div className="mb-4 transform hover:scale-105 transition-transform duration-300">
          <MascotIcon size={84} />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          {t.chooseLanguage}
        </h1>
        <p className="text-xs text-raag-gray tracking-wide">
          Raag Player • Native Offline Sound
        </p>
      </div>

      {/* Language Selector Card */}
      <div className="relative z-10 w-full max-w-sm mx-auto my-auto">
        <div className="bg-[#121214] border border-[#1E1E22] rounded-[22px] overflow-hidden shadow-2xl divide-y divide-[#1A1A1E]">
          {LANGUAGES.map((lang) => {
            const isSelected = currentLanguage === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => onSelectLanguage(lang.code)}
                className={`w-full flex items-center justify-between px-6 py-4 transition-all duration-200 active:bg-white/5 ${
                  isSelected ? 'bg-blue-600/10' : 'hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`text-[17px] font-medium tracking-wide ${
                      isSelected ? 'text-[#38BDF8] font-semibold' : 'text-zinc-200'
                    }`}
                  >
                    {lang.native}
                  </span>
                  {lang.code !== 'en' && (
                    <span className="text-xs text-zinc-500 font-normal">
                      ({lang.label})
                    </span>
                  )}
                </div>

                {isSelected && (
                  <Check className="w-5 h-5 text-[#38BDF8] stroke-[2.5]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA & Terms */}
      <div className="relative z-10 w-full max-w-sm mx-auto pb-4 pt-4 flex flex-col items-center gap-3">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.98] text-white font-semibold text-[17px] shadow-lg shadow-blue-600/30 transition-all duration-200 flex items-center justify-center gap-2"
        >
          {t.getStarted}
        </button>

        <p className="text-[11px] text-zinc-400 text-center leading-relaxed px-2">
          {t.termsNotice}{' '}
          <span className="text-[#38BDF8] underline underline-offset-2 cursor-pointer">
            {t.termsLink}
          </span>{' '}
          and{' '}
          <span className="text-[#38BDF8] underline underline-offset-2 cursor-pointer">
            {t.privacyLink}
          </span>
          .
        </p>
      </div>
    </div>
  );
};
