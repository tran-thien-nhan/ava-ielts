// app/components/CardModal.tsx
"use client";

import { useState, useEffect } from "react";
import { VocabularyCard, Language, LANGUAGES } from "../types";

interface CardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (card: Partial<VocabularyCard>) => void;
    card?: VocabularyCard | null;
    defaultLanguage?: Language;
}

export default function CardModal({ isOpen, onClose, onSave, card, defaultLanguage = 'korean' }: CardModalProps) {
    const [word, setWord] = useState("");
    const [meaning, setMeaning] = useState("");
    const [language, setLanguage] = useState<Language>(defaultLanguage);

    useEffect(() => {
        if (card) {
            setWord(card.word);
            setMeaning(card.meaning);
            setLanguage(card.language);
        } else {
            setWord("");
            setMeaning("");
            setLanguage(defaultLanguage);
        }
    }, [card, isOpen, defaultLanguage]);

    if (!isOpen) return null;

    const currentLangInfo = LANGUAGES.find(l => l.code === language);
    const isKorean = language === 'korean';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            word,
            meaning,
            language,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <span>{currentLangInfo?.flag}</span>
                    <span>{card ? `Sửa thẻ ${currentLangInfo?.name}` : `Thêm thẻ ${currentLangInfo?.name} mới`}</span>
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-zinc-400 font-medium mb-2">
                            Ngôn ngữ
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    type="button"
                                    onClick={() => setLanguage(lang.code)}
                                    className={`p-2 rounded-xl transition-all flex flex-col items-center gap-1 ${
                                        language === lang.code
                                            ? `bg-gradient-to-r ${lang.color} text-white`
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    <span className="text-xl">{lang.flag}</span>
                                    <span className="text-xs">{lang.name.split(' ')[1] || lang.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-5">
                        <label className="block text-zinc-400 font-medium mb-2">
                            {isKorean ? 'Từ vựng (한국어)' : 'Từ vựng'}
                        </label>
                        <input
                            type="text"
                            value={word}
                            onChange={(e) => setWord(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            required
                            placeholder={isKorean ? "VD: 안녕하세요" : "VD: Hello"}
                            autoFocus
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-zinc-400 font-medium mb-2">
                            Nghĩa (Tiếng Việt)
                        </label>
                        <input
                            type="text"
                            value={meaning}
                            onChange={(e) => setMeaning(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            required
                            placeholder="VD: Xin chào"
                        />
                        <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                            🔊 Âm thanh sẽ được tự động tạo từ từ vựng {currentLangInfo?.name}
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded-2xl transition-all font-medium"
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className={`flex-1 px-6 py-3 bg-gradient-to-r ${currentLangInfo?.color || 'from-emerald-600 to-teal-600'} hover:opacity-90 text-white rounded-2xl transition-all font-medium shadow-lg`}
                        >
                            {card ? "Cập nhật thẻ" : "Thêm thẻ mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}