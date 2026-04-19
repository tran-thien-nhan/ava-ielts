// app/components/CardModal.tsx
"use client";

import { useState, useEffect } from "react";
import { VocabularyCard } from "../types";

interface CardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (card: Partial<VocabularyCard>) => void;
    card?: VocabularyCard | null;
}

export default function CardModal({ isOpen, onClose, onSave, card }: CardModalProps) {
    const [vietnamese, setVietnamese] = useState("");
    const [english, setEnglish] = useState("");

    useEffect(() => {
        if (card) {
            setVietnamese(card.vietnamese);
            setEnglish(card.english);
        } else {
            setVietnamese("");
            setEnglish("");
        }
    }, [card, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            vietnamese,
            english,
            // Không cần gửi audioUrl nữa, hệ thống sẽ tự tạo
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-3xl p-8 w-full max-w-md mx-4 shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-6">
                    {card ? "Sửa thẻ từ vựng" : "Thêm thẻ mới"}
                </h2>

                <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                        <label className="block text-zinc-400 font-medium mb-2">
                            Tiếng Việt
                        </label>
                        <input
                            type="text"
                            value={vietnamese}
                            onChange={(e) => setVietnamese(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            required
                            placeholder="VD: Xin chào"
                            autoFocus
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-zinc-400 font-medium mb-2">
                            Tiếng Anh
                        </label>
                        <input
                            type="text"
                            value={english}
                            onChange={(e) => setEnglish(e.target.value)}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                            required
                            placeholder="VD: Hello"
                        />
                        <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                            🔊 Âm thanh sẽ được tự động tạo từ văn bản tiếng Anh này
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
                            className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl transition-all font-medium shadow-lg shadow-emerald-500/30"
                        >
                            {card ? "Cập nhật thẻ" : "Thêm thẻ mới"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}