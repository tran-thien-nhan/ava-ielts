// app/types/index.ts
export interface VocabularyCard {
    id: string;
    vietnamese: string;
    english: string;
    // audioUrl?: string;   ← XÓA DÒNG NÀY
    createdAt: string;
    updatedAt: string;
}

export const SHEET_HEADERS: string[] = [
    "ID",
    "Tiếng Việt",
    "Tiếng Anh",
    "Ngày tạo",
    "Ngày cập nhật"
];