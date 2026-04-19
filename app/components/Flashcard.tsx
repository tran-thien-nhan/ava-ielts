// app/components/Flashcard.tsx
"use client";

import { useState, useEffect } from "react";
import { VocabularyCard } from "../types";
import { playAudio } from "../lib/textToSpeech";

interface FlashcardProps {
    card: VocabularyCard;
    onNext: () => void;
    onPrev: () => void;
    hasNext: boolean;
    hasPrev: boolean;
}

export default function Flashcard({ card, onNext, onPrev, hasNext, hasPrev }: FlashcardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);

    // Reset khi đổi thẻ
    useEffect(() => {
        setIsFlipped(false);
        setIsPlaying(false);
    }, [card.id]);

    // Tự động phát âm khi lật sang mặt sau (mặt tiếng Anh)
    useEffect(() => {
        if (isFlipped && card.english) {
            handlePlayAudio();
        }
    }, [isFlipped]);

    const handlePlayAudio = async () => {
        if (!card.english || isPlaying) return;

        setIsPlaying(true);

        try {
            await playAudio(card.english);
        } catch (error) {
            console.error("Error playing audio:", error);
        } finally {
            setTimeout(() => setIsPlaying(false), 1200);
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "ArrowLeft" && hasPrev) onPrev();
        else if (e.key === "ArrowRight" && hasNext) onNext();
        else if (e.key === " " || e.key === "Spacebar") {
            e.preventDefault();
            handleFlip();
        } else if (e.key.toLowerCase() === "a") {
            handlePlayAudio();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-zinc-950">
            <div className="w-full max-w-2xl">
                {/* Flip Card Container */}
                <div
                    className={`flip-card ${isFlipped ? "flipped" : ""} cursor-pointer`}
                    onClick={handleFlip}
                >
                    <div className="flip-card-inner relative w-full aspect-[16/10] md:aspect-[5/3] transition-transform duration-700 preserve-3d">
                        
                        {/* === MẶT TRƯỚC (Tiếng Việt) === */}
                        <div className="flip-card-front absolute inset-0 rounded-3xl overflow-hidden border border-zinc-700 shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950" />
                            <div className="relative h-full flex flex-col items-center justify-center p-10 text-center">
                                <div className="text-6xl mb-8 opacity-80">📘</div>
                                <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight">
                                    {card.vietnamese}
                                </h2>
                                <div className="mt-12 text-zinc-400 text-sm flex items-center gap-2">
                                    👆 Nhấn hoặc nhấn <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded">Space</span> để lật
                                </div>
                            </div>
                        </div>

                        {/* === MẶT SAU (Tiếng Anh) === */}
                        <div className="flip-card-back absolute inset-0 rounded-3xl overflow-hidden border border-emerald-500/30 shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950" />
                            <div className="relative h-full flex flex-col items-center justify-center p-10 text-center">
                                <div className="text-6xl mb-6 opacity-70">🔤</div>
                                
                                <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-10">
                                    {card.english}
                                </h2>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayAudio();
                                    }}
                                    disabled={isPlaying}
                                    className="group relative px-10 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 
                                               hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-700 disabled:to-zinc-700
                                               text-white font-medium text-lg rounded-2xl transition-all duration-300 
                                               shadow-xl shadow-emerald-500/40 flex items-center gap-3 active:scale-95"
                                >
                                    {isPlaying ? (
                                        <>
                                            <span className="animate-pulse">🔊</span>
                                            Đang phát âm...
                                        </>
                                    ) : (
                                        <>
                                            🔊 Nghe phát âm
                                        </>
                                    )}
                                </button>

                                <p className="mt-12 text-zinc-400 text-sm">
                                    Nhấn bất kỳ đâu để quay lại
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between items-center mt-12 gap-4 px-2">
                    <button
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className={`flex-1 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 border ${
                            hasPrev
                                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white active:scale-95"
                                : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                        }`}
                    >
                        ← Trước
                    </button>

                    <button
                        onClick={handlePlayAudio}
                        disabled={isPlaying}
                        className="flex-1 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 
                                   disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold text-lg rounded-2xl 
                                   transition-all duration-300 shadow-xl shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isPlaying ? "🔊 Đang phát..." : "🔊 Nghe lại"}
                    </button>

                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className={`flex-1 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-2 border ${
                            hasNext
                                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white active:scale-95"
                                : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                        }`}
                    >
                        Sau →
                    </button>
                </div>

                {/* Tips */}
                <div className="text-center mt-8 text-zinc-500 text-sm">
                    💡 Mẹo: ← → chuyển thẻ • Space lật (tự động đọc) • A nghe lại
                </div>
            </div>
        </div>
    );
}