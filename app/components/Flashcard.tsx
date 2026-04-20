// app/components/Flashcard.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VocabularyCard } from "../types";
import { playAudio, stopAudio } from "../lib/textToSpeech";

interface FlashcardProps {
    card: VocabularyCard;
    onNext: () => void;
    onPrev: () => void;
    onShuffle: () => void;
    onReset?: () => void;
    hasNext: boolean;
    hasPrev: boolean;
    totalCards: number;
    currentIndex: number;
}

type FontSize = 'small' | 'medium' | 'large' | 'xlarge';

export default function Flashcard({ 
    card, 
    onNext, 
    onPrev, 
    onShuffle,
    onReset,
    hasNext, 
    hasPrev,
    totalCards,
    currentIndex
}: FlashcardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [isReversed, setIsReversed] = useState(false);
    const [isDictationMode, setIsDictationMode] = useState(false);
    const [hasPlayedDictation, setHasPlayedDictation] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fontSize, setFontSize] = useState<FontSize>('medium');
    const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const lastFlippedStateRef = useRef(false);

    // Font size classes
    const fontSizeClasses = {
        small: 'text-xl sm:text-2xl md:text-3xl',
        medium: 'text-2xl sm:text-4xl md:text-5xl',
        large: 'text-3xl sm:text-5xl md:text-6xl',
        xlarge: 'text-4xl sm:text-6xl md:text-7xl'
    };

    const dictationFontSizeClasses = {
        small: 'text-lg sm:text-xl md:text-2xl',
        medium: 'text-xl sm:text-3xl md:text-4xl',
        large: 'text-2xl sm:text-4xl md:text-5xl',
        xlarge: 'text-3xl sm:text-5xl md:text-6xl'
    };

    // Cleanup khi unmount
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            if (audioTimeoutRef.current) {
                clearTimeout(audioTimeoutRef.current);
            }
            stopAudio();
        };
    }, []);

    // Reset khi đổi thẻ
    useEffect(() => {
        if (card && card.id) {
            setIsFlipped(false);
            setIsPlaying(false);
            setHasPlayedDictation(false);
            lastFlippedStateRef.current = false;
            stopAudio();
            
            if (audioTimeoutRef.current) {
                clearTimeout(audioTimeoutRef.current);
                audioTimeoutRef.current = null;
            }
        }
    }, [card?.id]);

    // Tự động phát âm trong dictation mode khi hiển thị mặt trước (phát tiếng Anh)
    useEffect(() => {
        if (isDictationMode && !isFlipped && card && card.english && !hasPlayedDictation && !isPlaying && !isReversed) {
            const timer = setTimeout(() => {
                if (isDictationMode && !isFlipped && card?.english && !isPlaying && isMountedRef.current && !isReversed) {
                    handlePlayDictationAudio();
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isDictationMode, isFlipped, card, hasPlayedDictation, isPlaying, isReversed]);

    const handlePlayAudio = useCallback(async () => {
        if (!card || !card.english || isPlaying) return;

        setIsPlaying(true);
        stopAudio();
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            await playAudio(card.english);
        } catch (error) {
            console.error("Error playing audio:", error);
        } finally {
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

    const handlePlayDictationAudio = useCallback(async () => {
        // Trong chế độ chép chính tả, phát âm thanh tiếng Anh
        if (!card || !card.english || isPlaying) return;

        setIsPlaying(true);
        setHasPlayedDictation(true);
        stopAudio();
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            await playAudio(card.english);
        } catch (error) {
            console.error("Error playing audio:", error);
        } finally {
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
        if (isDictationMode) {
            setHasPlayedDictation(false);
        }
    }, [isDictationMode]);

    // Tự động phát âm khi lật sang mặt sau - CHỈ KHI KHÔNG Ở CHẾ ĐỘ ĐẢO NGƯỢC VÀ KHÔNG Ở CHẾ ĐỘ CHÉP CHÍNH TẢ
    useEffect(() => {
        // Không tự động phát nếu đang ở chế độ đảo ngược hoặc chế độ chép chính tả
        if (isReversed || isDictationMode) {
            lastFlippedStateRef.current = isFlipped;
            return;
        }
        
        // Kiểm tra: đang ở mặt sau, có nội dung, và vừa chuyển từ mặt trước sang mặt sau
        if (isFlipped && card && card.english && !isPlaying && !lastFlippedStateRef.current) {
            const timer = setTimeout(() => {
                if (isFlipped && card?.english && !isPlaying && isMountedRef.current && !isReversed && !isDictationMode) {
                    handlePlayAudio();
                }
            }, 150);
            return () => clearTimeout(timer);
        }
        // Cập nhật trạng thái lật trước đó
        lastFlippedStateRef.current = isFlipped;
    }, [isFlipped, card, isPlaying, handlePlayAudio, isReversed, isDictationMode]);

    const handleManualPlayAudio = useCallback(() => {
        // Trong chế độ chép chính tả và đang ở mặt trước, phát tiếng Anh
        if (isDictationMode && !isFlipped) {
            handlePlayDictationAudio();
        } else {
            handlePlayAudio();
        }
    }, [handlePlayAudio, handlePlayDictationAudio, isDictationMode, isFlipped]);

    const handleShuffle = useCallback(async () => {
        if (isShuffling) return;
        
        setIsShuffling(true);
        stopAudio();
        await new Promise(resolve => setTimeout(resolve, 150));
        onShuffle();
        
        setTimeout(() => {
            setIsShuffling(false);
        }, 300);
    }, [onShuffle, isShuffling]);

    const handleReverseAll = useCallback(() => {
        setIsReversed(prev => !prev);
        setIsFlipped(false);
        setHasPlayedDictation(false);
        stopAudio();
        setIsModalOpen(false);
    }, []);

    const handleDictationMode = useCallback(() => {
        setIsDictationMode(prev => !prev);
        setIsFlipped(false);
        setHasPlayedDictation(false);
        stopAudio();
        setIsModalOpen(false);
    }, []);

    const handleReset = useCallback(() => {
        // Reset all states
        setIsReversed(false);
        setIsDictationMode(false);
        setIsFlipped(false);
        setHasPlayedDictation(false);
        setFontSize('medium');
        stopAudio();
        
        // Call parent reset if provided
        if (onReset) {
            onReset();
        }
        
        setIsModalOpen(false);
    }, [onReset]);

    const handleFontSizeChange = useCallback((size: FontSize) => {
        setFontSize(size);
    }, []);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
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
            handleManualPlayAudio();
        } else if (e.key.toLowerCase() === "s") {
            e.preventDefault();
            handleShuffle();
        } else if (e.key.toLowerCase() === "r") {
            e.preventDefault();
            handleReverseAll();
        } else if (e.key.toLowerCase() === "d") {
            e.preventDefault();
            handleDictationMode();
        } else if (e.key === "Escape" && isModalOpen) {
            e.preventDefault();
            setIsModalOpen(false);
        }
    }, [hasPrev, hasNext, onPrev, onNext, handleFlip, handleManualPlayAudio, handleShuffle, handleReverseAll, handleDictationMode, isModalOpen]);

    // Xác định nội dung hiển thị dựa trên chế độ
    const getFrontContent = () => {
        if (isDictationMode && !isFlipped) {
            // Trong chế độ chép chính tả, mặt trước là nút phát âm thanh tiếng Anh
            return (
                <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                    <div className="text-4xl sm:text-6xl mb-4 sm:mb-8 opacity-80">🎧</div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePlayDictationAudio();
                        }}
                        disabled={isPlaying}
                        className="px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-purple-600 to-pink-600 
                                   hover:from-purple-500 hover:to-pink-500 disabled:from-zinc-700 disabled:to-zinc-700
                                   text-white font-bold text-lg sm:text-2xl rounded-2xl sm:rounded-3xl 
                                   transition-all duration-300 shadow-xl shadow-purple-500/40 
                                   flex items-center gap-3 sm:gap-4 active:scale-95"
                    >
                        {isPlaying ? (
                            <>
                                <span className="animate-pulse">🔊</span>
                                <span className="text-sm sm:text-lg">Đang phát...</span>
                            </>
                        ) : (
                            <>
                                <span>🎙️</span>
                                <span className="text-sm sm:text-lg">Nghe và chép</span>
                            </>
                        )}
                    </button>
                    <p className="mt-6 sm:mt-8 text-zinc-400 text-xs sm:text-sm">
                        Nghe từ tiếng Anh và viết lại
                    </p>
                </div>
            );
        }
        
        // Chế độ bình thường hoặc khi đảo ngược
        if (!isDictationMode || (isDictationMode && isFlipped)) {
            const text = !isReversed ? (card.vietnamese || "???") : (card.english || "???");
            const icon = !isReversed ? "📘" : "🔤";
            
            return (
                <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                    <div className="text-4xl sm:text-6xl mb-4 sm:mb-8 opacity-80">{icon}</div>
                    <h2 className={`${fontSizeClasses[fontSize]} font-bold text-white leading-tight tracking-tight break-words px-2`}>
                        {text}
                    </h2>
                    <div className="mt-8 sm:mt-12 text-zinc-400 text-xs sm:text-sm flex items-center gap-1 sm:gap-2 flex-wrap justify-center">
                        <span>👆 Nhấn</span>
                        <span className="hidden sm:inline">hoặc</span>
                        <span className="font-mono bg-zinc-800 px-1.5 sm:px-2 py-0.5 rounded text-xs">Space</span>
                        <span>để lật</span>
                    </div>
                </div>
            );
        }
        
        return null;
    };

    const getBackContent = () => {
        // Trong chế độ chép chính tả, mặt sau hiển thị cả tiếng Anh và tiếng Việt
        if (isDictationMode && isFlipped) {
            return (
                <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                    
                    <div className="space-y-4 sm:space-y-6 w-full">
                        <div>
                            <h2 className={`${fontSizeClasses[fontSize]} font-bold text-white leading-tight tracking-tight break-words px-2`}>
                                {card.english || "???"}
                            </h2>
                        </div>
                        
                        <div className="border-t border-emerald-500/30 pt-4 sm:pt-6">
                            <p className={`${dictationFontSizeClasses[fontSize]} text-zinc-200 leading-relaxed break-words px-2`}>
                                {card.vietnamese || "???"}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleManualPlayAudio();
                        }}
                        disabled={isPlaying}
                        className="mt-6 sm:mt-8 px-6 sm:px-10 py-2.5 sm:py-4 bg-gradient-to-r from-emerald-600 to-teal-600 
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
                                <span className="text-xs sm:text-base">Nghe lại</span>
                            </>
                        )}
                    </button>

                </div>
            );
        }
        
        // Chế độ bình thường hoặc đảo ngược
        const text = !isReversed ? (card.english || "???") : (card.vietnamese || "???");
        const icon = !isReversed ? "🔤" : "📘";
        
        return (
            <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                <div className="text-4xl sm:text-6xl mb-4 sm:mb-6 opacity-70">{icon}</div>
                
                <h2 className={`${fontSizeClasses[fontSize]} font-bold text-white leading-tight tracking-tight mb-6 sm:mb-10 break-words px-2`}>
                    {text}
                </h2>

                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleManualPlayAudio();
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
        );
    };

    // Modal component
    const Modal = () => {
        if (!isModalOpen) return null;

        return (
            <>
                {/* Overlay */}
                <div 
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-all duration-300"
                    onClick={() => setIsModalOpen(false)}
                />
                
                {/* Modal Content */}
                <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-50 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl sm:rounded-3xl border border-zinc-700 shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 sm:p-6 border-b border-zinc-800">
                            <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                                <span>⚙️</span>
                                <span>Tùy chọn</span>
                            </h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="text-zinc-400 hover:text-white transition-colors p-1"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4 sm:p-6 space-y-4">
                            {/* Cài đặt kích thước chữ */}
                            <div className="space-y-2">
                                <label className="text-zinc-300 text-sm font-medium flex items-center gap-2">
                                    <span>🔤</span>
                                    <span>Kích thước chữ</span>
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { value: 'small', label: 'Nhỏ', icon: 'A' },
                                        { value: 'medium', label: 'Vừa', icon: 'A' },
                                        { value: 'large', label: 'Lớn', icon: 'A' },
                                        { value: 'xlarge', label: 'Rất lớn', icon: 'A' }
                                    ].map((size) => (
                                        <button
                                            key={size.value}
                                            onClick={() => handleFontSizeChange(size.value as FontSize)}
                                            className={`py-2 rounded-lg transition-all flex flex-col items-center gap-1 ${
                                                fontSize === size.value
                                                    ? 'bg-emerald-600 text-white'
                                                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                            }`}
                                        >
                                            <span className={`${
                                                size.value === 'small' ? 'text-sm' :
                                                size.value === 'medium' ? 'text-base' :
                                                size.value === 'large' ? 'text-lg' : 'text-xl'
                                            } font-bold`}>{size.icon}</span>
                                            <span className="text-xs">{size.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t border-zinc-800"></div>

                            {/* Các chế độ */}
                            <button
                                onClick={handleDictationMode}
                                className={`w-full px-4 py-3 rounded-xl transition-all text-sm sm:text-base font-medium flex items-center justify-between gap-2 ${
                                    isDictationMode
                                        ? "bg-purple-600 text-white"
                                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                }`}
                            >
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-lg sm:text-xl">📝</span>
                                    <span>Chép chính tả</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                    isDictationMode 
                                        ? "bg-white border-white" 
                                        : "border-zinc-400"
                                }`}>
                                    {isDictationMode && (
                                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </button>

                            <button
                                onClick={handleReverseAll}
                                className={`w-full px-4 py-3 rounded-xl transition-all text-sm sm:text-base font-medium flex items-center justify-between gap-2 ${
                                    isReversed
                                        ? "bg-blue-600 text-white"
                                        : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                }`}
                            >
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-lg sm:text-xl">🔄</span>
                                    <span>Đảo ngược thẻ</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${
                                    isReversed 
                                        ? "bg-white border-white" 
                                        : "border-zinc-400"
                                }`}>
                                    {isReversed && (
                                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                    )}
                                </div>
                            </button>

                            <button
                                onClick={handleShuffle}
                                disabled={isShuffling || totalCards <= 1}
                                className={`w-full px-4 py-3 rounded-xl transition-all text-sm sm:text-base font-medium flex items-center justify-between gap-2 ${
                                    isShuffling || totalCards <= 1
                                        ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                        : "bg-orange-600 hover:bg-orange-500 text-white"
                                }`}
                            >
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-lg sm:text-xl">🔀</span>
                                    <span>Xáo trộn thẻ</span>
                                </div>
                                {isShuffling ? (
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                ) : (
                                    <span className="text-zinc-400 text-xs">↺</span>
                                )}
                            </button>

                            <div className="border-t border-zinc-800"></div>

                            {/* Nút Reset */}
                            <button
                                onClick={handleReset}
                                className="w-full px-4 py-3 rounded-xl transition-all text-sm sm:text-base font-medium flex items-center justify-between gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30"
                            >
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-lg sm:text-xl">🔄</span>
                                    <span>Reset tất cả</span>
                                </div>
                                <span className="text-xs text-red-400/70">↺</span>
                            </button>
                        </div>

                        {/* Footer với phím tắt */}
                        <div className="p-4 sm:p-6 border-t border-zinc-800 bg-zinc-900/50">
                            <div className="text-xs text-zinc-400 space-y-1">
                                <p className="font-medium mb-2">⌨️ Phím tắt:</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <span>Space / Click</span>
                                    <span>Lật thẻ</span>
                                    <span>← →</span>
                                    <span>Thẻ trước/sau</span>
                                    <span>A</span>
                                    <span>Nghe lại</span>
                                    <span>R</span>
                                    <span>Đảo ngược</span>
                                    <span>D</span>
                                    <span>Chép chính tả</span>
                                    <span>S</span>
                                    <span>Xáo trộn</span>
                                    <span>ESC</span>
                                    <span>Đóng modal</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </>
        );
    };

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
            <Modal />
            
            <div className="w-full max-w-2xl">
                {/* Header với thông tin và nút mở modal */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-zinc-400 text-sm">
                        {currentIndex + 1} / {totalCards}
                    </div>
                    
                    {/* Hiển thị trạng thái các mode */}
                    <div className="flex gap-1 sm:gap-2">
                        {isDictationMode && (
                            <span className="px-2 py-1 rounded-lg bg-purple-600/20 text-purple-400 text-xs font-medium">
                                📝 CT
                            </span>
                        )}
                        {isReversed && (
                            <span className="px-2 py-1 rounded-lg bg-blue-600/20 text-blue-400 text-xs font-medium">
                                🔄 ĐN
                            </span>
                        )}
                        {fontSize !== 'medium' && (
                            <span className="px-2 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 text-xs font-medium">
                                🔤 {fontSize === 'small' ? 'Nhỏ' : fontSize === 'large' ? 'Lớn' : 'XL'}
                            </span>
                        )}
                    </div>
                    
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white transition-all active:scale-95 flex items-center gap-1 sm:gap-2"
                    >
                        <span className="text-base sm:text-lg">⚙️</span>
                        <span className="hidden sm:inline text-sm">Tùy chọn</span>
                    </button>
                </div>

                {/* Flip Card Container */}
                <div
                    className={`flip-card ${isFlipped ? "flipped" : ""} cursor-pointer`}
                    onClick={handleFlip}
                >
                    <div className="flip-card-inner relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[5/3] transition-transform duration-500 sm:duration-700 preserve-3d">
                        
                        {/* MẶT TRƯỚC */}
                        <div className="flip-card-front absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-700 shadow-xl sm:shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950" />
                            {getFrontContent()}
                        </div>

                        {/* MẶT SAU */}
                        <div className="flip-card-back absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-emerald-500/30 shadow-xl sm:shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950" />
                            {getBackContent()}
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
                        onClick={handleManualPlayAudio}
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
                    💡 Click ⚙️ để xem tùy chọn và phím tắt
                </div>
            </div>
        </div>
    );
}