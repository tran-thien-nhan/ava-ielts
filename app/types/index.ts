// app/types/index.ts
export type Language = 'english' | 'korean' | 'japanese' | 'chinese' | 'russian';

export interface VocabularyCard {
    id: string;
    word: string;
    meaning: string;
    language: Language;
    createdAt: string;
    updatedAt: string;
}

export interface LanguageConfig {
    code: Language;
    name: string;
    flag: string;
    nativeName: string;
    ttsLang: string;
    sheetName: string;  // Tên sheet trong Google Sheets - PHẢI ĐÚNG VỚI TÊN THỰC TẾ
    direction: 'ltr' | 'rtl';
    color: string;
}

// QUAN TRỌNG: Tên sheet phải CHÍNH XÁC với tên trong Google Sheets
// Nếu sheet tên là "English" (E hoa) thì phải để "English"
export const LANGUAGES: LanguageConfig[] = [
    { code: 'english', name: 'Tiếng Anh', flag: '🇬🇧', nativeName: 'English', ttsLang: 'en-US', sheetName: 'English', direction: 'ltr', color: 'from-blue-600 to-cyan-600' },
    { code: 'korean', name: 'Tiếng Hàn', flag: '🇰🇷', nativeName: '한국어', ttsLang: 'ko-KR', sheetName: 'Korean', direction: 'ltr', color: 'from-red-600 to-pink-600' },
    { code: 'japanese', name: 'Tiếng Nhật', flag: '🇯🇵', nativeName: '日本語', ttsLang: 'ja-JP', sheetName: 'Japanese', direction: 'ltr', color: 'from-purple-600 to-indigo-600' },
    { code: 'chinese', name: 'Tiếng Trung', flag: '🇨🇳', nativeName: '中文', ttsLang: 'zh-CN', sheetName: 'Chinese', direction: 'ltr', color: 'from-red-700 to-orange-600' },
    { code: 'russian', name: 'Tiếng Nga', flag: '🇷🇺', nativeName: 'Русский', ttsLang: 'ru-RU', sheetName: 'Russian', direction: 'ltr', color: 'from-gray-600 to-gray-800' },
];

export const SHEET_HEADERS: string[] = [
    "ID",
    "Từ vựng",
    "Nghĩa",
    "Ngày tạo",
    "Ngày cập nhật"
];