// app/lib/textToSpeech.ts

let voicesLoaded = false;
let availableVoices: SpeechSynthesisVoice[] = [];

/**
 * Load voices một lần và cache lại (voices load async ở nhiều browser)
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

        // Nếu chưa load, chờ event onvoiceschanged
        const onVoicesChanged = () => {
            availableVoices = window.speechSynthesis.getVoices();
            voicesLoaded = true;
            window.speechSynthesis.onvoiceschanged = null; // chỉ load 1 lần
            resolve(availableVoices);
        };

        window.speechSynthesis.onvoiceschanged = onVoicesChanged;
        
        // Trigger load voices (một số browser cần gọi speak() hoặc getVoices() để kích hoạt)
        if (voices.length === 0) {
            window.speechSynthesis.getVoices();
        }
    });
}

/**
 * Chọn giọng nói tiếng Anh tốt nhất có sẵn (ưu tiên chất lượng cao)
 */
function getBestEnglishVoice(): SpeechSynthesisVoice | null {
    if (!voicesLoaded) return null;

    // Thứ tự ưu tiên: giọng tự nhiên nhất trên Chrome/Edge
    const priorityList = [
        'Samantha', 'Karen', 'Daniel', 'Google US English', 
        'Microsoft Zira', 'Microsoft David', 'Alex', 
        'en-US', 'English (United States)'
    ];

    for (const name of priorityList) {
        const voice = availableVoices.find(v => 
            v.lang.includes('en-US') && 
            (v.name.includes(name) || v.name.toLowerCase().includes(name.toLowerCase()))
        );
        if (voice) return voice;
    }

    // Fallback: bất kỳ giọng en-US nào
    return availableVoices.find(v => v.lang.includes('en-US')) || null;
}

/**
 * Phát âm thanh tiếng Anh tối ưu cho flashcard (chỉ đọc mặt sau - từ/câu tiếng Anh)
 */
export async function playAudio(text: string): Promise<void> {
    if (!text || text.trim() === "") {
        console.warn("Text is empty, cannot play audio");
        return;
    }

    if (!('speechSynthesis' in window)) {
        alert("Trình duyệt của bạn không hỗ trợ phát âm thanh TTS.\nVui lòng dùng Chrome hoặc Edge mới nhất.");
        return;
    }

    try {
        // Dừng mọi âm thanh đang phát để tránh chồng chéo
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text.trim());

        // === Cấu hình tối ưu cho học từ vựng ===
        utterance.lang = 'en-US';
        utterance.rate = 0.88;     // Chậm hơn bình thường → dễ nghe và ghi nhớ (0.8 - 0.95 là ngọt nhất)
        utterance.pitch = 1.02;    // Hơi cao một chút → giọng tự nhiên, dễ chịu
        utterance.volume = 1.0;

        // Load voices nếu chưa có
        if (!voicesLoaded) {
            await loadVoices();
        }

        const bestVoice = getBestEnglishVoice();
        if (bestVoice) {
            utterance.voice = bestVoice;
            console.log(`Đang dùng giọng: ${bestVoice.name} (${bestVoice.lang})`);
        } else {
            console.warn("Không tìm thấy giọng en-US, dùng giọng mặc định.");
        }

        // Event handlers
        utterance.onend = () => {
            console.log("✅ Phát âm thanh xong:", text.substring(0, 60) + "...");
        };

        utterance.onerror = (event) => {
            console.error("Speech synthesis error:", event);
            // Chỉ log lỗi, không alert để tránh làm phiền người dùng
        };

        // Phát âm
        window.speechSynthesis.speak(utterance);

    } catch (error) {
        console.error("Failed to play audio with Web Speech API:", error);
    }
}

// Hàm cũ (giữ để tránh lỗi import ở các file khác)
export async function generateSpeechUrl(_text: string): Promise<string> {
    console.warn("generateSpeechUrl is deprecated. Using optimized Web Speech API instead.");
    return "";
}