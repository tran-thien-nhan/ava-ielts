// app/lib/textToSpeech.ts
import { Language, LANGUAGES } from "../types";

let voicesLoaded = false;
let availableVoices: SpeechSynthesisVoice[] = [];
let currentUtterance: SpeechSynthesisUtterance | null = null;
let speechQueue: { text: string; language: Language; rate?: number }[] = [];
let isSpeaking = false;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
    return new Promise((resolve) => {
        const voices = window.speechSynthesis.getVoices();
        
        if (voices.length > 0) {
            availableVoices = voices;
            voicesLoaded = true;
            resolve(voices);
            return;
        }

        const timeout = setTimeout(() => {
            if (!voicesLoaded) {
                console.warn("Voice loading timeout");
                voicesLoaded = true;
                resolve([]);
            }
        }, 3000);

        const onVoicesChanged = () => {
            clearTimeout(timeout);
            availableVoices = window.speechSynthesis.getVoices();
            voicesLoaded = true;
            window.speechSynthesis.onvoiceschanged = null;
            resolve(availableVoices);
        };

        window.speechSynthesis.onvoiceschanged = onVoicesChanged;
        window.speechSynthesis.getVoices();
    });
}

function getBestVoice(languageCode: string): SpeechSynthesisVoice | null {
    if (!voicesLoaded || availableVoices.length === 0) return null;

    const targetLang = languageCode.split('-')[0];
    
    const exactMatch = availableVoices.find(v => v.lang === languageCode);
    if (exactMatch) return exactMatch;
    
    const langMatch = availableVoices.find(v => v.lang.startsWith(targetLang));
    if (langMatch) return langMatch;
    
    return availableVoices[0] || null;
}

async function processQueue(): Promise<void> {
    if (isSpeaking || speechQueue.length === 0) return;
    
    isSpeaking = true;
    const item = speechQueue.shift();
    
    if (!item) {
        isSpeaking = false;
        return;
    }
    
    try {
        await speakText(item.text, item.language, item.rate);
    } catch (error) {
        if (error !== 'cancelled' && error !== 'interrupted') {
            console.error("Error speaking text:", error);
        }
    } finally {
        isSpeaking = false;
        if (speechQueue.length > 0) {
            setTimeout(() => processQueue(), 100);
        }
    }
}

function speakText(text: string, language: Language, rate: number = 0.9): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            reject(new Error("Speech synthesis not supported"));
            return;
        }

        if (currentUtterance) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {}
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        const langConfig = LANGUAGES.find(l => l.code === language);
        const ttsLang = langConfig?.ttsLang || 'en-US';
        
        utterance.lang = ttsLang;
        utterance.rate = rate;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const bestVoice = getBestVoice(ttsLang);
        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        let isResolved = false;

        utterance.onend = () => {
            if (!isResolved) {
                isResolved = true;
                currentUtterance = null;
                resolve();
            }
        };

        utterance.onerror = (event) => {
            if (event.error === 'interrupted' || event.error === 'canceled') {
                if (!isResolved) {
                    isResolved = true;
                    currentUtterance = null;
                    resolve();
                }
                return;
            }
            
            console.error("Speech error:", event.error);
            currentUtterance = null;
            
            if (!isResolved) {
                isResolved = true;
                if (event.error === 'network') {
                    setTimeout(() => {
                        speakText(text, language, rate).then(resolve).catch(reject);
                    }, 500);
                } else {
                    reject(new Error(event.error));
                }
            }
        };

        currentUtterance = utterance;
        
        try {
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Failed to speak:", error);
            currentUtterance = null;
            if (!isResolved) {
                isResolved = true;
                reject(error);
            }
        }
    });
}

export async function playAudio(text: string, language: Language = 'english', rate: number = 0.9): Promise<void> {
    if (!text || text.trim() === "") {
        console.warn("Text is empty, cannot play audio");
        return;
    }

    if (typeof window === 'undefined') {
        console.warn("Window is undefined");
        return;
    }

    if (!('speechSynthesis' in window)) {
        console.warn("Browser does not support Web Speech API");
        return;
    }

    try {
        if (!voicesLoaded) {
            await loadVoices();
        }

        speechQueue.push({ text: text.trim(), language, rate });
        await processQueue();
        
    } catch (error) {
        if (error !== 'cancelled' && error !== 'interrupted') {
            console.error("Failed to play audio:", error);
        }
    }
}

export async function playAudioSlow(text: string, language: Language = 'english'): Promise<void> {
    return playAudio(text, language, 0.5);
}

export function stopAudio(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            if (currentUtterance) {
                currentUtterance.onend = null;
                currentUtterance.onerror = null;
                currentUtterance = null;
            }
            
            window.speechSynthesis.cancel();
            speechQueue = [];
            isSpeaking = false;
        } catch (error) {
            console.error("Error stopping audio:", error);
        }
    }
}

export function isSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}