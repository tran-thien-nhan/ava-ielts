// app/components/Flashcard.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { VocabularyCard, Language, LANGUAGES } from "../types";
import { playAudio, stopAudio, playAudioSlow } from "../lib/textToSpeech";

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
    language: Language;
}

type FontSize = 'extra_small' | 'small' | 'medium' | 'large' | 'xlarge';

export default function Flashcard({
    card,
    onNext,
    onPrev,
    onShuffle,
    onReset,
    hasNext,
    hasPrev,
    totalCards,
    currentIndex,
    language
}: FlashcardProps) {
    const [isFlipped, setIsFlipped] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isPlayingSlow, setIsPlayingSlow] = useState(false);
    const [isShuffling, setIsShuffling] = useState(false);
    const [isReversed, setIsReversed] = useState(false);
    const [isDictationMode, setIsDictationMode] = useState(false);
    const [hasPlayedDictation, setHasPlayedDictation] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [fontSize, setFontSize] = useState<FontSize>('medium');
    const audioTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isMountedRef = useRef(true);
    const lastFlippedStateRef = useRef(false);
    const currentPlayPromiseRef = useRef<Promise<void> | null>(null);

    const langConfig = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

    const fontSizeClasses = {
        extra_small: 'text-base sm:text-lg md:text-xl',
        small: 'text-xl sm:text-2xl md:text-3xl',
        medium: 'text-2xl sm:text-4xl md:text-5xl',
        large: 'text-3xl sm:text-5xl md:text-6xl',
        xlarge: 'text-4xl sm:text-6xl md:text-7xl'
    };

    const dictationFontSizeClasses = {
        extra_small: 'text-sm sm:text-base md:text-lg',
        small: 'text-lg sm:text-xl md:text-2xl',
        medium: 'text-xl sm:text-3xl md:text-4xl',
        large: 'text-2xl sm:text-4xl md:text-5xl',
        xlarge: 'text-3xl sm:text-5xl md:text-6xl'
    };

    const getFontSizeClass = (size: FontSize) => {
        return fontSizeClasses[size] || fontSizeClasses.medium;
    };

    const getDictationFontSizeClass = (size: FontSize) => {
        return dictationFontSizeClasses[size] || dictationFontSizeClasses.medium;
    };

    const handleStopAudio = useCallback(() => {
        if (audioTimeoutRef.current) {
            clearTimeout(audioTimeoutRef.current);
            audioTimeoutRef.current = null;
        }
        stopAudio();
        setIsPlaying(false);
        setIsPlayingSlow(false);
        currentPlayPromiseRef.current = null;
    }, []);

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

    useEffect(() => {
        if (card && card.id) {
            setIsFlipped(false);
            setIsPlaying(false);
            setIsPlayingSlow(false);
            setHasPlayedDictation(false);
            lastFlippedStateRef.current = false;

            if (audioTimeoutRef.current) {
                clearTimeout(audioTimeoutRef.current);
                audioTimeoutRef.current = null;
            }
            stopAudio();
            currentPlayPromiseRef.current = null;
        }
    }, [card?.id]);

    useEffect(() => {
        if (isDictationMode && !isFlipped && card && card.word && !hasPlayedDictation && !isPlaying && !isPlayingSlow && !isReversed) {
            const timer = setTimeout(() => {
                if (isDictationMode && !isFlipped && card?.word && !isPlaying && !isPlayingSlow && isMountedRef.current && !isReversed) {
                    handlePlayDictationAudio();
                }
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [isDictationMode, isFlipped, card, hasPlayedDictation, isPlaying, isPlayingSlow, isReversed]);

    const handlePlayAudio = useCallback(async () => {
        if (!card || !card.word || isPlaying) return;

        handleStopAudio();
        await new Promise(resolve => setTimeout(resolve, 100));

        setIsPlaying(true);

        try {
            currentPlayPromiseRef.current = playAudio(card.word, language);
            await currentPlayPromiseRef.current;
        } catch (error) {
            console.error("Error playing audio:", error);
        } finally {
            if (isMountedRef.current && currentPlayPromiseRef.current) {
                if (audioTimeoutRef.current) {
                    clearTimeout(audioTimeoutRef.current);
                }
                audioTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        setIsPlaying(false);
                        currentPlayPromiseRef.current = null;
                    }
                }, 500);
            }
        }
    }, [card, isPlaying, handleStopAudio, language]);

    const handlePlayAudioSlow = useCallback(async () => {
        if (!card || !card.word || isPlayingSlow) return;

        handleStopAudio();
        await new Promise(resolve => setTimeout(resolve, 100));

        setIsPlayingSlow(true);

        try {
            currentPlayPromiseRef.current = playAudioSlow(card.word, language);
            await currentPlayPromiseRef.current;
        } catch (error) {
            console.error("Error playing slow audio:", error);
        } finally {
            if (isMountedRef.current && currentPlayPromiseRef.current) {
                if (audioTimeoutRef.current) {
                    clearTimeout(audioTimeoutRef.current);
                }
                audioTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        setIsPlayingSlow(false);
                        currentPlayPromiseRef.current = null;
                    }
                }, 500);
            }
        }
    }, [card, isPlayingSlow, handleStopAudio, language]);

    const handlePlayDictationAudio = useCallback(async () => {
        if (!card || !card.word || isPlaying) return;

        handleStopAudio();
        await new Promise(resolve => setTimeout(resolve, 100));

        setIsPlaying(true);
        setHasPlayedDictation(true);

        try {
            currentPlayPromiseRef.current = playAudio(card.word, language);
            await currentPlayPromiseRef.current;
        } catch (error) {
            console.error("Error playing audio:", error);
        } finally {
            if (isMountedRef.current && currentPlayPromiseRef.current) {
                if (audioTimeoutRef.current) {
                    clearTimeout(audioTimeoutRef.current);
                }
                audioTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        setIsPlaying(false);
                        currentPlayPromiseRef.current = null;
                    }
                }, 500);
            }
        }
    }, [card, isPlaying, handleStopAudio, language]);

    const handlePlayDictationAudioSlow = useCallback(async () => {
        if (!card || !card.word || isPlayingSlow) return;

        handleStopAudio();
        await new Promise(resolve => setTimeout(resolve, 100));

        setIsPlayingSlow(true);
        setHasPlayedDictation(true);

        try {
            currentPlayPromiseRef.current = playAudioSlow(card.word, language);
            await currentPlayPromiseRef.current;
        } catch (error) {
            console.error("Error playing slow audio:", error);
        } finally {
            if (isMountedRef.current && currentPlayPromiseRef.current) {
                if (audioTimeoutRef.current) {
                    clearTimeout(audioTimeoutRef.current);
                }
                audioTimeoutRef.current = setTimeout(() => {
                    if (isMountedRef.current) {
                        setIsPlayingSlow(false);
                        currentPlayPromiseRef.current = null;
                    }
                }, 500);
            }
        }
    }, [card, isPlayingSlow, handleStopAudio, language]);

    const handleFlip = useCallback(() => {
        setIsFlipped(prev => !prev);
        if (isDictationMode) {
            setHasPlayedDictation(false);
        }
    }, [isDictationMode]);

    useEffect(() => {
        if (isReversed || isDictationMode) {
            lastFlippedStateRef.current = isFlipped;
            return;
        }

        if (isFlipped && card && card.word && !isPlaying && !isPlayingSlow && !lastFlippedStateRef.current) {
            const timer = setTimeout(() => {
                if (isFlipped && card?.word && !isPlaying && !isPlayingSlow && isMountedRef.current && !isReversed && !isDictationMode) {
                    handlePlayAudio();
                }
            }, 150);
            return () => clearTimeout(timer);
        }
        lastFlippedStateRef.current = isFlipped;
    }, [isFlipped, card, isPlaying, isPlayingSlow, handlePlayAudio, isReversed, isDictationMode]);

    const handleManualPlayAudio = useCallback((isSlow: boolean = false) => {
        if (isDictationMode && !isFlipped) {
            if (isSlow) {
                handlePlayDictationAudioSlow();
            } else {
                handlePlayDictationAudio();
            }
        } else {
            if (isSlow) {
                handlePlayAudioSlow();
            } else {
                handlePlayAudio();
            }
        }
    }, [handlePlayAudio, handlePlayAudioSlow, handlePlayDictationAudio, handlePlayDictationAudioSlow, isDictationMode, isFlipped]);

    const handleShuffle = useCallback(async () => {
        if (isShuffling) return;

        setIsShuffling(true);
        handleStopAudio();
        await new Promise(resolve => setTimeout(resolve, 150));
        onShuffle();

        setTimeout(() => {
            setIsShuffling(false);
        }, 300);
    }, [onShuffle, isShuffling, handleStopAudio]);

    const handleReverseAll = useCallback(() => {
        setIsReversed(prev => !prev);
        setIsFlipped(false);
        setHasPlayedDictation(false);
        handleStopAudio();
        setIsModalOpen(false);
    }, [handleStopAudio]);

    const handleDictationMode = useCallback(() => {
        setIsDictationMode(prev => !prev);
        setIsFlipped(false);
        setHasPlayedDictation(false);
        handleStopAudio();
        setIsModalOpen(false);
    }, [handleStopAudio]);

    const handleReset = useCallback(() => {
        setIsReversed(false);
        setIsDictationMode(false);
        setIsFlipped(false);
        setHasPlayedDictation(false);
        setFontSize('medium');
        handleStopAudio();

        if (onReset) {
            onReset();
        }

        setIsModalOpen(false);
    }, [onReset, handleStopAudio]);

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
            handleManualPlayAudio(false);
        } else if (e.key.toLowerCase() === "s") {
            e.preventDefault();
            handleManualPlayAudio(true);
        } else if (e.key.toLowerCase() === "x") {
            e.preventDefault();
            handleStopAudio();
        } else if (e.key.toLowerCase() === "r") {
            e.preventDefault();
            handleReverseAll();
        } else if (e.key.toLowerCase() === "d") {
            e.preventDefault();
            handleDictationMode();
        } else if (e.key.toLowerCase() === "t") {
            e.preventDefault();
            handleShuffle();
        } else if (e.key === "Escape" && isModalOpen) {
            e.preventDefault();
            setIsModalOpen(false);
        }
    }, [hasPrev, hasNext, onPrev, onNext, handleFlip, handleManualPlayAudio, handleStopAudio, handleShuffle, handleReverseAll, handleDictationMode, isModalOpen]);

    const getFrontContent = () => {
        if (isDictationMode && !isFlipped) {
            return (
                <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                    <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleManualPlayAudio(false);
                            }}
                            disabled={isPlaying}
                            className={`px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r ${langConfig.color} 
                                       hover:opacity-90 disabled:from-zinc-700 disabled:to-zinc-700
                                       text-white font-bold text-lg sm:text-2xl rounded-2xl sm:rounded-3xl 
                                       transition-all duration-300 shadow-xl flex items-center gap-3 sm:gap-4 active:scale-95`}
                        >
                            {isPlaying ? (
                                <>
                                    <span className="animate-pulse">🔊</span>
                                    <span className="text-sm sm:text-lg">Đang phát...</span>
                                </>
                            ) : (
                                <>
                                    <span>🔊</span>
                                    <span className="text-sm sm:text-lg">Nghe</span>
                                </>
                            )}
                        </button>

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleManualPlayAudio(true);
                            }}
                            disabled={isPlayingSlow}
                            className={`px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-blue-600 to-indigo-600 
                                       hover:opacity-90 disabled:from-zinc-700 disabled:to-zinc-700
                                       text-white font-bold text-lg sm:text-2xl rounded-2xl sm:rounded-3xl 
                                       transition-all duration-300 shadow-xl flex items-center gap-3 sm:gap-4 active:scale-95`}
                        >
                            {isPlayingSlow ? (
                                <>
                                    <span className="animate-pulse">🐢</span>
                                    <span className="text-sm sm:text-lg">Đang phát...</span>
                                </>
                            ) : (
                                <>
                                    <span>🐢</span>
                                    <span className="text-sm sm:text-lg">Nghe chậm</span>
                                </>
                            )}
                        </button>

                        {(isPlaying || isPlayingSlow) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStopAudio();
                                }}
                                className="px-8 sm:px-12 py-4 sm:py-6 bg-gradient-to-r from-red-600 to-rose-600 
                                           hover:from-red-500 hover:to-rose-500 text-white font-bold text-lg sm:text-2xl 
                                           rounded-2xl sm:rounded-3xl transition-all duration-300 shadow-xl shadow-red-500/40 
                                           flex items-center gap-3 sm:gap-4 active:scale-95"
                            >
                                <span>⏹️</span>
                                <span className="text-sm sm:text-lg">Dừng</span>
                            </button>
                        )}
                    </div>
                    <p className="mt-6 sm:mt-8 text-zinc-400 text-xs sm:text-sm">
                        Nghe từ {langConfig.name} và viết lại
                    </p>
                </div>
            );
        }

        if (!isDictationMode || (isDictationMode && isFlipped)) {
            const text = !isReversed ? (card?.word || "???") : (card?.meaning || "???");
            const textLang = !isReversed ? langConfig.name : 'Tiếng Việt';

            return (
                <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                    <div className={`${getFontSizeClass(fontSize)} font-bold text-white leading-tight tracking-tight break-words px-2 overflow-y-auto max-h-full w-full`}>
                        {text}
                    </div>
                    <div className="mt-4 text-zinc-500 text-xs">
                        {textLang}
                    </div>
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
        if (isDictationMode && isFlipped) {
            return (
                <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                    <div className="space-y-4 sm:space-y-6 w-full overflow-y-auto max-h-full">
                        <div>
                            <div className={`${getFontSizeClass(fontSize)} font-bold text-white leading-tight tracking-tight break-words px-2`}>
                                {card?.word || "???"}
                            </div>
                            <div className="mt-2 text-zinc-500 text-xs">{langConfig.name}</div>
                        </div>

                        <div className="border-t border-emerald-500/30 pt-4 sm:pt-6">
                            <div className={`${getDictationFontSizeClass(fontSize)} text-zinc-200 leading-relaxed break-words px-2`}>
                                {card?.meaning || "???"}
                            </div>
                            <div className="mt-2 text-zinc-500 text-xs">Tiếng Việt</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 sm:gap-4 mt-6 sm:mt-8 justify-center">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleManualPlayAudio(false);
                            }}
                            disabled={isPlaying}
                            className={`px-6 sm:px-10 py-2.5 sm:py-4 bg-gradient-to-r ${langConfig.color} 
                                       hover:opacity-90 disabled:from-zinc-700 disabled:to-zinc-700
                                       text-white font-medium text-sm sm:text-lg rounded-xl sm:rounded-2xl 
                                       transition-all duration-300 shadow-lg flex items-center gap-2 sm:gap-3 active:scale-95`}
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

                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleManualPlayAudio(true);
                            }}
                            disabled={isPlayingSlow}
                            className={`px-6 sm:px-10 py-2.5 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 
                                       hover:opacity-90 disabled:from-zinc-700 disabled:to-zinc-700
                                       text-white font-medium text-sm sm:text-lg rounded-xl sm:rounded-2xl 
                                       transition-all duration-300 shadow-lg flex items-center gap-2 sm:gap-3 active:scale-95`}
                        >
                            {isPlayingSlow ? (
                                <>
                                    <span className="animate-pulse">🐢</span>
                                    <span className="text-xs sm:text-base">Đang phát...</span>
                                </>
                            ) : (
                                <>
                                    <span>🐢</span>
                                    <span className="text-xs sm:text-base">Nghe chậm</span>
                                </>
                            )}
                        </button>

                        {(isPlaying || isPlayingSlow) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStopAudio();
                                }}
                                className="px-6 sm:px-10 py-2.5 sm:py-4 bg-gradient-to-r from-red-600 to-rose-600 
                                           hover:from-red-500 hover:to-rose-500 text-white font-medium text-sm sm:text-lg 
                                           rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg 
                                           shadow-red-500/40 flex items-center gap-2 sm:gap-3 active:scale-95"
                            >
                                <span>⏹️</span>
                                <span className="text-xs sm:text-base">Dừng</span>
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        const text = !isReversed ? (card?.meaning || "???") : (card?.word || "???");
        const textLang = !isReversed ? 'Tiếng Việt' : langConfig.name;

        return (
            <div className="relative h-full flex flex-col items-center justify-center p-6 sm:p-10 text-center">
                <div className={`${getFontSizeClass(fontSize)} font-bold text-white leading-tight tracking-tight mb-6 sm:mb-10 break-words px-2 overflow-y-auto max-h-[60%] w-full`}>
                    {text}
                </div>

                <div className="mt-2 text-zinc-500 text-xs mb-4">{textLang}</div>

                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleManualPlayAudio(false);
                        }}
                        disabled={isPlaying}
                        className={`px-6 sm:px-10 py-2.5 sm:py-4 bg-gradient-to-r ${langConfig.color} 
                                   hover:opacity-90 disabled:from-zinc-700 disabled:to-zinc-700
                                   text-white font-medium text-sm sm:text-lg rounded-xl sm:rounded-2xl 
                                   transition-all duration-300 shadow-lg flex items-center gap-2 sm:gap-3 active:scale-95`}
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

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            handleManualPlayAudio(true);
                        }}
                        disabled={isPlayingSlow}
                        className={`px-6 sm:px-10 py-2.5 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 
                                   hover:opacity-90 disabled:from-zinc-700 disabled:to-zinc-700
                                   text-white font-medium text-sm sm:text-lg rounded-xl sm:rounded-2xl 
                                   transition-all duration-300 shadow-lg flex items-center gap-2 sm:gap-3 active:scale-95`}
                    >
                        {isPlayingSlow ? (
                            <>
                                <span className="animate-pulse">🐢</span>
                                <span className="text-xs sm:text-base">Đang phát...</span>
                            </>
                        ) : (
                            <>
                                <span>🐢</span>
                                <span className="text-xs sm:text-base">Nghe chậm</span>
                            </>
                        )}
                    </button>

                    {(isPlaying || isPlayingSlow) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleStopAudio();
                            }}
                            className="px-6 sm:px-10 py-2.5 sm:py-4 bg-gradient-to-r from-red-600 to-rose-600 
                                       hover:from-red-500 hover:to-rose-500 text-white font-medium text-sm sm:text-lg 
                                       rounded-xl sm:rounded-2xl transition-all duration-300 shadow-lg 
                                       shadow-red-500/40 flex items-center gap-2 sm:gap-3 active:scale-95"
                        >
                            <span>⏹️</span>
                            <span className="text-xs sm:text-base">Dừng</span>
                        </button>
                    )}
                </div>

                <p className="mt-8 sm:mt-12 text-zinc-400 text-xs sm:text-sm">
                    Nhấn để quay lại
                </p>
            </div>
        );
    };

    const Modal = () => {
        if (!isModalOpen) return null;

        return (
            <>
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 transition-all duration-300"
                    onClick={() => setIsModalOpen(false)}
                />

                <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md z-50 animate-in fade-in zoom-in duration-300 max-h-[90vh] overflow-y-auto">
                    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-2xl sm:rounded-3xl border border-zinc-700 shadow-2xl overflow-hidden">
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

                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-zinc-300 text-sm font-medium flex items-center gap-2">
                                    <span>🔤</span>
                                    <span>Kích thước chữ</span>
                                </label>
                                <div className="grid grid-cols-5 gap-2">
                                    {[
                                        { value: 'extra_small', label: 'Siêu nhỏ', icon: 'A' },
                                        { value: 'small', label: 'Nhỏ', icon: 'A' },
                                        { value: 'medium', label: 'Vừa', icon: 'A' },
                                        { value: 'large', label: 'Lớn', icon: 'A' },
                                        { value: 'xlarge', label: 'Rất lớn', icon: 'A' }
                                    ].map((size) => (
                                        <button
                                            key={size.value}
                                            onClick={() => handleFontSizeChange(size.value as FontSize)}
                                            className={`py-2 rounded-lg transition-all flex flex-col items-center gap-1 ${fontSize === size.value
                                                ? 'bg-emerald-600 text-white'
                                                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                                }`}
                                        >
                                            <span className={`${size.value === 'extra_small' ? 'text-xs' :
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

                            <button
                                onClick={handleDictationMode}
                                className={`w-full px-4 py-3 rounded-xl transition-all text-sm sm:text-base font-medium flex items-center justify-between gap-2 ${isDictationMode
                                    ? "bg-purple-600 text-white"
                                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-lg sm:text-xl">📝</span>
                                    <span>Chép chính tả</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${isDictationMode
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
                                className={`w-full px-4 py-3 rounded-xl transition-all text-sm sm:text-base font-medium flex items-center justify-between gap-2 ${isReversed
                                    ? "bg-blue-600 text-white"
                                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                                    }`}
                            >
                                <div className="flex items-center gap-2 sm:gap-3">
                                    <span className="text-lg sm:text-xl">🔄</span>
                                    <span>Đảo ngược thẻ</span>
                                </div>
                                <div className={`w-5 h-5 rounded-full border-2 transition-all ${isReversed
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
                                className={`w-full px-4 py-3 rounded-xl transition-all text-sm sm:text-base font-medium flex items-center justify-between gap-2 ${isShuffling || totalCards <= 1
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

                        <div className="p-4 sm:p-6 border-t border-zinc-800 bg-zinc-900/50">
                            <div className="text-xs text-zinc-400 space-y-1">
                                <p className="font-medium mb-2">⌨️ Phím tắt:</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <span>Space / Click</span>
                                    <span>Lật thẻ</span>
                                    <span>← →</span>
                                    <span>Thẻ trước/sau</span>
                                    <span>A</span>
                                    <span>Nghe thường</span>
                                    <span>S</span>
                                    <span>Nghe chậm</span>
                                    <span>X</span>
                                    <span>Dừng đọc</span>
                                    <span>R</span>
                                    <span>Đảo ngược</span>
                                    <span>D</span>
                                    <span>Chép chính tả</span>
                                    <span>T</span>
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
                <div className="flex justify-between items-center mb-4 px-2">
                    <div className="text-zinc-400 text-sm">
                        {currentIndex + 1} / {totalCards}
                    </div>

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
                                🔤 {fontSize === 'extra_small' ? 'XS' : fontSize === 'small' ? 'Nhỏ' : fontSize === 'large' ? 'Lớn' : 'XL'}
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

                <div
                    className={`flip-card ${isFlipped ? "flipped" : ""} cursor-pointer`}
                    onClick={handleFlip}
                >
                    <div className="flip-card-inner relative w-full aspect-[4/3] sm:aspect-[16/10] md:aspect-[5/3] transition-transform duration-500 sm:duration-700 preserve-3d">
                        <div className="flip-card-front absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-zinc-700 shadow-xl sm:shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950" />
                            <div className="relative w-full h-full overflow-y-auto">
                                {getFrontContent()}
                            </div>
                        </div>

                        <div className="flip-card-back absolute inset-0 rounded-2xl sm:rounded-3xl overflow-hidden border border-emerald-500/30 shadow-xl sm:shadow-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-zinc-900 to-zinc-950" />
                            <div className="relative w-full h-full overflow-y-auto">
                                {getBackContent()}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-5 gap-2 sm:gap-4 mt-6 sm:mt-12 px-1 sm:px-2">
                    <button
                        onClick={onPrev}
                        disabled={!hasPrev}
                        className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 border ${hasPrev
                            ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white active:scale-95"
                            : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                            }`}
                    >
                        <span>←</span>
                        <span className="hidden xs:inline">Trước</span>
                    </button>

                    <button
                        onClick={() => handleManualPlayAudio(false)}
                        disabled={isPlaying}
                        className={`py-3 sm:py-4 bg-gradient-to-r ${langConfig.color} hover:opacity-90 
                                   disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold text-sm sm:text-lg rounded-xl sm:rounded-2xl 
                                   transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-1 sm:gap-2`}
                    >
                        <span>🔊</span>
                        <span className="hidden xs:inline">{isPlaying ? "Đang phát" : "Nghe"}</span>
                    </button>

                    <button
                        onClick={() => handleManualPlayAudio(true)}
                        disabled={isPlayingSlow}
                        className={`py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 
                                   disabled:from-zinc-700 disabled:to-zinc-700 text-white font-semibold text-sm sm:text-lg rounded-xl sm:rounded-2xl 
                                   transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-1 sm:gap-2`}
                    >
                        <span>🐢</span>
                        <span className="hidden xs:inline">{isPlayingSlow ? "Đang phát" : "Chậm"}</span>
                    </button>

                    <button
                        onClick={handleStopAudio}
                        disabled={!isPlaying && !isPlayingSlow}
                        className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 border ${(isPlaying || isPlayingSlow)
                            ? "bg-red-600 hover:bg-red-500 text-white active:scale-95"
                            : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                            }`}
                    >
                        <span>⏹️</span>
                        <span className="hidden xs:inline">Dừng</span>
                    </button>

                    <button
                        onClick={onNext}
                        disabled={!hasNext}
                        className={`py-3 sm:py-4 rounded-xl sm:rounded-2xl font-semibold text-sm sm:text-lg transition-all duration-300 flex items-center justify-center gap-1 sm:gap-2 border ${hasNext
                            ? "bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-white active:scale-95"
                            : "bg-zinc-950 border-zinc-800 text-zinc-600 cursor-not-allowed"
                            }`}
                    >
                        <span className="hidden xs:inline">Sau</span>
                        <span>→</span>
                    </button>
                </div>

                <div className="text-center mt-6 sm:mt-8 text-zinc-500 text-xs sm:text-sm px-2">
                    💡 Phím tắt: A (nghe), S (nghe chậm), X (dừng), Space (lật), ← → (thẻ trước/sau)
                </div>
            </div>
        </div>
    );
}