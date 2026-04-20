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
        // Kiểm tra nếu đã có voices
        const voices = window.speechSynthesis.getVoices();
        
        if (voices.length > 0) {
            availableVoices = voices;
            voicesLoaded = true;
            resolve(voices);
            return;
        }

        // Set timeout để tránh treo vô hạn
        const timeout = setTimeout(() => {
            if (!voicesLoaded) {
                console.warn("Voice loading timeout");
                voicesLoaded = true;
                resolve([]);
            }
        }, 3000);

        // Nếu chưa load, chờ event onvoiceschanged
        const onVoicesChanged = () => {
            clearTimeout(timeout);
            availableVoices = window.speechSynthesis.getVoices();
            voicesLoaded = true;
            window.speechSynthesis.onvoiceschanged = null;
            resolve(availableVoices);
        };

        window.speechSynthesis.onvoiceschanged = onVoicesChanged;
        
        // Trigger load voices
        window.speechSynthesis.getVoices();
    });
}

/**
 * Chọn giọng nói tiếng Anh tốt nhất
 */
function getBestEnglishVoice(): SpeechSynthesisVoice | null {
    if (!voicesLoaded || availableVoices.length === 0) return null;

    // Thứ tự ưu tiên giọng
    const priorityList = [
        'Google US English',
        'Microsoft David',
        'Google UK English',
        'Samantha',
        'Alex'
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
        // Chỉ log lỗi nếu không phải lỗi do cancel
        if (error !== 'cancelled' && error !== 'interrupted') {
            console.error("Error speaking text:", error);
        }
    } finally {
        isSpeaking = false;
        // Xử lý tiếp queue nếu còn
        if (speechQueue.length > 0) {
            setTimeout(() => processQueue(), 100);
        }
    }
}

/**
 * Phát text bằng Web Speech API
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
                // Bỏ qua lỗi khi cancel
            }
        }

        const utterance = new SpeechSynthesisUtterance(text);
        
        // Cấu hình
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        // Set voice nếu có
        const bestVoice = getBestEnglishVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        let isResolved = false;

        // Event handlers
        utterance.onend = () => {
            if (!isResolved) {
                isResolved = true;
                currentUtterance = null;
                resolve();
            }
        };

        utterance.onerror = (event) => {
            // 'interrupted' là lỗi bình thường khi dừng phát âm, không cần xử lý đặc biệt
            if (event.error === 'interrupted') {
                console.log("Speech was interrupted (normal when stopping)");
                if (!isResolved) {
                    isResolved = true;
                    currentUtterance = null;
                    // Không reject, coi như thành công vì đã dừng theo yêu cầu
                    resolve();
                }
                return;
            }
            
            // 'canceled' cũng là lỗi bình thường khi hủy
            if (event.error === 'canceled') {
                console.log("Speech was cancelled");
                if (!isResolved) {
                    isResolved = true;
                    currentUtterance = null;
                    resolve();
                }
                return;
            }
            
            // Các lỗi khác mới log và reject
            console.error("Speech error:", event.error);
            currentUtterance = null;
            
            if (!isResolved) {
                isResolved = true;
                // Một số lỗi có thể thử lại (trừ lỗi không phải mạng)
                if (event.error === 'network') {
                    console.log("Network error, retrying...");
                    setTimeout(() => {
                        speakText(text).then(resolve).catch(reject);
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

/**
 * Phát âm thanh tiếng Anh (sử dụng queue)
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

        // Thêm vào queue
        speechQueue.push(text.trim());
        
        // Xử lý queue
        await processQueue();
        
    } catch (error) {
        // Chỉ log nếu không phải lỗi do cancel/interrupt
        if (error !== 'cancelled' && error !== 'interrupted') {
            console.error("Failed to play audio:", error);
        }
    }
}

/**
 * Dừng tất cả âm thanh đang phát
 */
export function stopAudio(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
            // Hủy utterance hiện tại
            if (currentUtterance) {
                currentUtterance.onend = null;
                currentUtterance.onerror = null;
                currentUtterance = null;
            }
            
            // Cancel speech synthesis
            window.speechSynthesis.cancel();
            
            // Clear queue
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
 * Phát âm thanh và trả về promise (không dùng queue)
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
        
        // Delay nhỏ để cancel hoàn tất
        await new Promise(resolve => setTimeout(resolve, 50));

        const utterance = new SpeechSynthesisUtterance(text.trim());
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const bestVoice = getBestEnglishVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
        }

        let isResolved = false;

        return new Promise((resolve, reject) => {
            utterance.onend = () => {
                if (!isResolved) {
                    isResolved = true;
                    resolve();
                }
            };
            
            utterance.onerror = (event) => {
                // 'interrupted' và 'canceled' là bình thường
                if (event.error === 'interrupted' || event.error === 'canceled') {
                    if (!isResolved) {
                        isResolved = true;
                        resolve();
                    }
                    return;
                }
                
                if (!isResolved) {
                    isResolved = true;
                    reject(event);
                }
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