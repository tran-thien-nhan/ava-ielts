// app/components/LanguageSelector.tsx
"use client";

import { Language, LANGUAGES } from "../types";

interface LanguageSelectorProps {
    currentLanguage: Language;
    onLanguageChange: (language: Language) => void;
}

export default function LanguageSelector({ currentLanguage, onLanguageChange }: LanguageSelectorProps) {
    const currentLangInfo = LANGUAGES.find(l => l.code === currentLanguage);

    return (
        <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all backdrop-blur-sm">
                <span className="text-xl">{currentLangInfo?.flag}</span>
                <span className="text-white font-medium">{currentLangInfo?.name}</span>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            <div className="absolute right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-2xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                <div className="p-2">
                    {LANGUAGES.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => onLanguageChange(lang.code)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all ${currentLanguage === lang.code
                                    ? `bg-gradient-to-r ${lang.color} text-white`
                                    : 'hover:bg-zinc-800 text-zinc-300'
                                }`}
                        >
                            <span className="text-2xl">{lang.flag}</span>
                            <div className="flex-1 text-left">
                                <div className="font-medium">{lang.name}</div>
                                <div className="text-xs opacity-70">{lang.nativeName}</div>
                            </div>
                            {currentLanguage === lang.code && (
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}