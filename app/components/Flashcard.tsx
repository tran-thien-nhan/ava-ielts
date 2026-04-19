// app/components/Flashcard.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VocabularyCard } from "../types";
import { playAudio, stopAudio } from "../lib/textToSpeech";

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
    const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const flipTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup khi unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (audioTimeoutRef.current) {
                clearTimeout(audioTimeoutRef.current);
            }
            if (flipTimeoutRef.current) {
                clearTimeout(flipTimeoutRef.current);
            }
            stopAudio();
        };
    }, []);

    // Reset khi đổi thẻ
    useEffect(() => {
        if (card && card.id) {
            // Reset states
            setIsFlipped(false);
            setIsPlaying(false);
            
            // Dừng audio đang phát
            stopAudio();
            
            // Clear timeouts
            if (audioTimeoutRef.current) {
                clearTimeout(audioTimeoutRef.current);
                audioTimeoutRef.current = null;
            }
            if (flipTimeoutRef.current) {
                clearTimeout(flipTimeoutRef.current);
                flipTimeoutRef.current = null;
            }
        }
    }, [card?.id]);

    const handlePlayAudio = useCallback(async () => {
        if (!card || !card.english || isPlaying) return;

        setIsPlaying(true);
        
        // Dừng audio cũ trước khi phát mới
        stopAudio();
        
        // Delay nhỏ để cancel hoàn tất
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            await playAudio(card.english);
        } catch (error) {
            console.error("Error playing audio:", error);
        } finally {
            // Chỉ reset state nếu component còn mounted
            if (isMountedRef.current) {
                if (audioTimeoutRef.current) {
                    clearTimeout(audioTimeoutRef.current);
                }
                audioTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        setIsPlaying(false);
                    }
                }, 800);
            }
        }
    }, [card, isPlaying]);

    const handleFlip = useCallback(() => {
        setIsFlipped(prev => !prev);
    }, []);

    // Tự động phát âm khi lật sang mặt sau
    useEffect(() => {
        if (isFlipped && card && card.english && !isPlaying) {
            // Delay nhỏ để tránh xung đột
            if (flipTimeoutRef.current) {
                clearTimeout(flipTimeoutRef.current);
            }
            flipTimeoutRef.current = setTimeout(() => {
                if (isFlipped && card?.english && !isPlaying && isMountedRef.current) {
                    handlePlayAudio();
                }
            }, 150);
        }
        
        return () => {
            if (flipTimeoutRef.current) {
                clearTimeout(flipTimeoutRef.current);
            }
        };
    }, [isFlipped, card, isPlaying, handlePlayAudio]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        // Ngăn chặn scroll khi dùng phím space
        if (e.key === " " || e.key === "Spacebar" || e.key === "Space") {
            e.preventDefault();
            handleFlip();
        } else if (e.key === "ArrowLeft" && hasPrev) {
            e.preventDefault();
            onPrev();
        } else if (e.key === "ArrowRight" && hasNext) {
            e.preventDefault();
            onNext();
        } else if (e.key.toLowerCase() === "a") {
            e.preventDefault();
            handlePlayAudio();
        }
    }, [hasPrev, hasNext, onPrev, onNext, handleFlip, handlePlayAudio]);

    // Nếu không có card, hiển thị loading
    if (!card || !card.id) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen p-4 sm:p-6 bg-zinc-950">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <div className="text-white text-base sm:text-xl">Đang tải...</div>
                </div>
            </div>
        );
    }

    return (
        <div 
            className="flex flex-col items-center justify-center min-h-screen p-3 sm:p-6 bg-zinc-950" 
            onKeyDown={handleKeyDown} 
            tabIndex={0}
        >
            <div className="w-full max-w-2xl">
                {/* Flip Card Container */}
                <div
                    className={`flip-card ${isFlipped ? "flipped" : ""} cursor-pointer`}
                    onClick={handleFlip}
                >
                    <div className="flip-card-inner relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[5/3] transition-transform duration-500 sm:duration-700 preserve-3d">
                        
                        {/* MẶT TRƯỚC (Tiếng Việt) */}
                        <div className="flip-card-front absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-700 shadow-xl sm:shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950" />
                            <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                                <div className="text-4xl sm:text-6xl mb-4 sm:mb-8 opacity-80">📘</div>
                                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight break-words px-2">
                                    {card.vietnamese || "???"}
                                </h2>
                                <div className="mt-8 sm:mt-12 text-zinc-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                                    <span>👆 Nhấn</span>
                                    <span className="hidden sm:inline">hoặc</span>
                                    <span className="font-mono bg-zinc-800 px-1.5 sm:px-2 py-0.5 rounded text-xs">Space</span>
                                    <span>để lật</span>
                                </div>
                            </div>
                        </div>

                        {/* MẶT SAU (Tiếng Anh) */}
                        <div className="flip-card-back absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-emerald-500/30 shadow-xl sm:shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950" />
                            <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                                <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 opacity-70">🔤</div>
                                
                                <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight mb-6 sm:mb-10 break-words px-2">
                                    {card.english || "???"}
                                </h2>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePlayAudio();
                                    }}
                                    disabled={isPlaying}
                                    className="px-6 sm:px-10 py-2.5 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 
                                               hover:from-emerald-500 hover:to-teal-500 disabled:from-zinc-700 disabled:to-zinc-700
                                               text-white font-medium text-sm sm:text-lg rounded-xl sm:rounded-2xl 
                                               transition-all duration-300 shadow-lg sm:shadow-xl shadow-emerald-500/40 
                                               flex items-center gap-2 sm:gap-3 active:scale-95"
                                >
                                    {isPlaying ? (
                                        <>
                                            <span className="animate-pulse">🔊</span>
                                            <span className="text-xs sm:text-base">Đang phát...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>🔊</span>
                                            <span className="text-xs sm:text-base">Nghe</span>
                                        </>
                                    )}
                                </button>

                                <p className="mt-8 sm:mt-12 text-zinc-400 text-xs sm:text-sm">
                                    Nhấn để quay lại
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Buttons - Responsive */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-6 sm:mt-12 px-1 sm:px-2">
                    <button
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 border ${
                            hasPrev
                                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white active:scale-95"
                                : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                        }`}
                    >
                        <span>←</span>
                        <span className="hidden xs:inline">Trước</span>
                    </button>

                    <button
                        onClick={handlePlayAudio}
                        disabled={isPlaying}
                        className="py-3 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 
                                   disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold text-sm sm:text-lg rounded-xl sm:rounded-2xl 
                                   transition-all duration-300 shadow-lg shadow-emerald-500/30 active:scale-95 flex items-center justify-center gap-1 sm:gap-2"
                    >
                        <span>🔊</span>
                        <span className="hidden xs:inline">{isPlaying ? "Đang phát" : "Nghe"}</span>
                    </button>

                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 border ${
                            hasNext
                                ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white active:scale-95"
                                : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                        }`}
                    >
                        <span className="hidden xs:inline">Sau</span>
                        <span>→</span>
                    </button>
                </div>

                {/* Tips */}
                <div className="text-center mt-6 sm:mt-8 text-zinc-500 text-xs sm:text-sm px-2">
                    💡 ← → chuyển • Space lật • A nghe
                </div>
            </div>
        </div>
    );
}