// app/lib/textToSpeech.ts

let voicesLoaded = false;
let availableVoices: SpeechSynthesisVoice[] = [];
let currentUtterance: SpeechSynthesisUtterance | null = null;
let speechQueue: string[] = [];
let isSpeaking = false;

/**
 * Load voices một lần và cache lại
 */
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

/**
 * Chọn giọng nói tiếng Anh tốt nhất - ưu tiên giọng to và rõ
 */
function getBestEnglishVoice(): SpeechSynthesisVoice | null {
    if (!voicesLoaded || availableVoices.length === 0) return null;

    // Thứ tự ưu tiên giọng (giọng Google US English thường to và rõ nhất)
    const priorityList = [
        'Google US English',      // Ưu tiên hàng đầu - to và rõ
        'Microsoft Zira',         // Giọng nữ Windows - to
        'Microsoft David',        // Giọng nam Windows
        'Samantha',               // Giọng macOS - to
        'Alex',                   // Giọng macOS
        'Google UK English Female',
        'Google UK English Male',
        'Karen',
        'Daniel',
        'en-US',
        'en-GB'
    ];

    for (const name of priorityList) {
        const voice = availableVoices.find(v => 
            (v.lang === 'en-US' || v.lang === 'en-GB') && 
            v.name.toLowerCase().includes(name.toLowerCase())
        );
        if (voice) return voice;
    }

    // Fallback: bất kỳ giọng tiếng Anh nào
    return availableVoices.find(v => v.lang.startsWith('en')) || null;
}

/**
 * Xử lý queue phát âm thanh
 */
async function processQueue(): Promise<void> {
    if (isSpeaking || speechQueue.length === 0) return;
    
    isSpeaking = true;
    const text = speechQueue.shift();
    
    if (!text) {
        isSpeaking = false;
        return;
    }
    
    try {
        await speakText(text);
    } catch (error) {
        console.error("Error speaking text:", error);
    } finally {
        isSpeaking = false;
        if (speechQueue.length > 0) {
            setTimeout(() => processQueue(), 150);
        }
    }
}

/**
 * Phát text bằng Web Speech API - TĂNG ÂM LƯỢNG
 */
function speakText(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!('speechSynthesis' in window)) {
            reject(new Error("Speech synthesis not supported"));
            return;
        }

        // Hủy utterance hiện tại nếu có
        if (currentUtterance) {
            try {
                window.speechSynthesis.cancel();
            } catch (e) {
                console.warn("Error canceling speech:", e);
            }
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        // === CẤU HÌNH TỐI ƯU CHO MOBILE ===
        utterance.lang = 'en-US';
        utterance.rate = 1.0;      // Chậm hơn một chút để rõ chữ
        utterance.pitch = 1.0;       // Giọng tự nhiên
        utterance.volume = 1.0;      // Volume tối đa (1.0 là max)
        
        // Ghi đè volume nếu browser hỗ trợ (một số browser cho phép >1)
        // @ts-ignore - Một số browser hỗ trợ volume > 1
        if (utterance.volume !== undefined) {
            // @ts-ignore
            utterance.volume = 1.0;
        }

        // Set voice nếu có (ưu tiên giọng to)
        const bestVoice = getBestEnglishVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
            console.log(`🎤 Using voice: ${bestVoice.name} (${bestVoice.lang})`);
        }

        // Event handlers
        utterance.onend = () => {
            console.log("✅ Speech ended");
            currentUtterance = null;
            resolve();
        };

        utterance.onerror = (event) => {
            console.error("Speech error:", event.error);
            currentUtterance = null;
            
            if (event.error === 'interrupted' || event.error === 'network') {
                console.log("Retrying...");
                setTimeout(() => {
                    speakText(text).then(resolve).catch(reject);
                }, 300);
            } else if (event.error === 'not-allowed') {
                // User chưa tương tác với trang
                console.warn("Speech not allowed. User needs to interact first.");
                reject(new Error("not-allowed"));
            } else {
                reject(new Error(event.error));
            }
        };

        currentUtterance = utterance;
        
        try {
            window.speechSynthesis.speak(utterance);
        } catch (error) {
            console.error("Failed to speak:", error);
            currentUtterance = null;
            reject(error);
        }
    });
}

/**
 * Phát âm thanh tiếng Anh (sử dụng queue) - PHIÊN BẢN MOBILE
 */
export async function playAudio(text: string): Promise<void> {
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
        // Load voices nếu chưa có
        if (!voicesLoaded) {
            await loadVoices();
        }

        // Log để debug
        console.log(`🔊 Playing: "${text.substring(0, 50)}..."`);

        // Thêm vào queue
        speechQueue.push(text.trim());
        
        // Xử lý queue
        await processQueue();
        
    } catch (error) {
        console.error("Failed to play audio:", error);
    }
}

/**
 * Dừng tất cả âm thanh đang phát
 */
export function stopAudio(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            window.speechSynthesis.cancel();
            currentUtterance = null;
            speechQueue = [];
            isSpeaking = false;
        } catch (error) {
            console.error("Error stopping audio:", error);
        }
    }
}

/**
 * Kiểm tra hỗ trợ TTS
 */
export function isSpeechSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * Phát âm thanh và trả về promise (không dùng queue) - Dùng cho manual play
 */
export async function playAudioImmediate(text: string): Promise<void> {
    if (!text || text.trim() === "") {
        return;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        return;
    }

    try {
        if (!voicesLoaded) {
            await loadVoices();
        }

        // Cancel current speech
        window.speechSynthesis.cancel();
        
        // Delay để cancel hoàn tất
        await new Promise(resolve => setTimeout(resolve, 80));

        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.lang = 'en-US';
        utterance.rate = 0.85;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const bestVoice = getBestEnglishVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        return new Promise((resolve, reject) => {
            utterance.onend = () => resolve();
            utterance.onerror = (event) => {
                console.error("Speech error:", event.error);
                reject(event);
            };
            window.speechSynthesis.speak(utterance);
        });
    } catch (error) {
        console.error("Failed to play audio:", error);
        throw error;
    }
}

// Giữ lại cho tương thích
export async function generateSpeechUrl(_text: string): Promise<string> {
    return "";
}