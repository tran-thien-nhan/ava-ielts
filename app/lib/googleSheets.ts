// app/lib/googleSheets.ts
import 'server-only';

import { google } from "googleapis";
import { SHEET_HEADERS, VocabularyCard, Language, LANGUAGES } from "../types";

// Cache riêng cho từng sheet - TẠM THỜI TẮT CACHE
let sheetDataCache: Map<string, VocabularyCard[]> = new Map();
let cacheTimestamp: Map<string, number> = new Map();
const CACHE_DURATION = 0; // Đặt thành 0 để tắt cache hoàn toàn

export async function getSheets() {
    if (!process.env.GOOGLE_CLIENT_EMAIL) {
        throw new Error("Missing GOOGLE_CLIENT_EMAIL environment variable");
    }
    if (!process.env.GOOGLE_PRIVATE_KEY) {
        throw new Error("Missing GOOGLE_PRIVATE_KEY environment variable");
    }

    const auth = new google.auth.GoogleAuth({
        credentials: {
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        },
        scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    return google.sheets({ version: "v4", auth });
}

export function clearSheetCache(language?: Language) {
    if (language) {
        const sheetName = LANGUAGES.find(l => l.code === language)?.sheetName || '';
        sheetDataCache.delete(sheetName);
        cacheTimestamp.delete(sheetName);
    } else {
        sheetDataCache.clear();
        cacheTimestamp.clear();
    }
}

function rowToCard(row: string[], language: Language): VocabularyCard {
    return {
        id: row[0] || "",
        word: row[1] || "",
        meaning: row[2] || "",
        language: language,
        createdAt: row[3] || new Date().toISOString(),
        updatedAt: row[4] || new Date().toISOString(),
    };
}

function cardToRow(card: VocabularyCard): string[] {
    return [
        card.id,
        card.word,
        card.meaning,
        card.createdAt,
        card.updatedAt,
    ];
}

async function ensureSheetExists(sheets: any, spreadsheetId: string, sheetName: string) {
    try {
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
            includeGridData: false,
        });

        // Kiểm tra tên sheet không phân biệt hoa/thường
        const sheetExists = spreadsheet.data.sheets?.some(
            (sheet: any) => sheet.properties?.title?.toLowerCase() === sheetName.toLowerCase()
        );

        if (!sheetExists) {
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [{
                        addSheet: {
                            properties: {
                                title: sheetName,
                                gridProperties: {
                                    rowCount: 1000,
                                    columnCount: 5,
                                }
                            }
                        }
                    }]
                }
            });

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${sheetName}!A1:E1`,
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [SHEET_HEADERS] },
            });
        }
    } catch (error) {
        console.error(`Error ensuring sheet ${sheetName} exists:`, error);
    }
}

export async function getCardsByLanguage(language: Language): Promise<VocabularyCard[]> {
    const langConfig = LANGUAGES.find(l => l.code === language);
    if (!langConfig) return [];

    const targetSheetName = langConfig.sheetName;

    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        console.error("SPREADSHEET_ID not defined");
        return [];
    }

    const sheets = await getSheets();

    try {
        // Lấy danh sách sheets để tìm đúng tên (không phân biệt hoa/thường)
        const spreadsheet = await sheets.spreadsheets.get({
            spreadsheetId,
            includeGridData: false,
        });

        const actualSheet = spreadsheet.data.sheets?.find(
            (sheet: any) => sheet.properties?.title?.toLowerCase() === targetSheetName.toLowerCase()
        );

        const actualSheetName = actualSheet?.properties?.title || targetSheetName;

        // Lấy dữ liệu từ sheet
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${actualSheetName}!A:E`,
        });

        let values = response.data.values || [];

        if (values.length === 0) {
            return [];
        }

        // Kiểm tra nếu dòng đầu tiên là header
        const firstRow = values[0];
        const isHeader = firstRow && (firstRow[0] === "ID" || firstRow[0] === "id");

        let dataRows = values;
        if (isHeader) {
            dataRows = values.slice(1); // Bỏ qua header
        }

        // Chuyển đổi dữ liệu
        const cards: VocabularyCard[] = [];

        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (row && row.length >= 3 && row[0] && row[0].trim() !== "") {
                const card: VocabularyCard = {
                    id: row[0] || Date.now().toString(),
                    word: row[1] || "",
                    meaning: row[2] || "",
                    language: language,
                    createdAt: row[3] || new Date().toISOString(),
                    updatedAt: row[4] || new Date().toISOString(),
                };
                cards.push(card);
            }
        }

        return cards;
    } catch (error) {
        console.error(`Error loading ${targetSheetName}:`, error);
        return [];
    }
}

export async function getAllCards(): Promise<VocabularyCard[]> {
    const allCardsPromises = LANGUAGES.map(lang => getCardsByLanguage(lang.code));
    const allCardsArrays = await Promise.all(allCardsPromises);
    const totalCards = allCardsArrays.flat();
    return totalCards;
}

// Phần còn lại giữ nguyên...
export async function addCard(card: VocabularyCard): Promise<VocabularyCard> {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID is not defined");
    }

    const langConfig = LANGUAGES.find(l => l.code === card.language);
    if (!langConfig) {
        throw new Error(`Invalid language: ${card.language}`);
    }

    const sheetName = langConfig.sheetName;
    const sheets = await getSheets();

    await ensureSheetExists(sheets, spreadsheetId, sheetName);

    const newCard: VocabularyCard = {
        ...card,
        id: card.id || Date.now().toString(),
        createdAt: card.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };


    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A:E`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [cardToRow(newCard)] },
    });

    // Xóa cache cho language này
    clearSheetCache(card.language);

    return newCard;
}

export async function updateCard(card: VocabularyCard): Promise<VocabularyCard> {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID is not defined");
    }

    const langConfig = LANGUAGES.find(l => l.code === card.language);
    if (!langConfig) {
        throw new Error(`Invalid language: ${card.language}`);
    }

    const sheetName = langConfig.sheetName;
    const sheets = await getSheets();

    const cards = await getCardsByLanguage(card.language);
    const rowIndex = cards.findIndex((c) => c.id === card.id);

    if (rowIndex === -1) {
        throw new Error("Card not found");
    }

    const updatedCard: VocabularyCard = {
        ...card,
        updatedAt: new Date().toISOString(),
    };


    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${rowIndex + 2}:E${rowIndex + 2}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [cardToRow(updatedCard)] },
    });

    clearSheetCache(card.language);
    return updatedCard;
}

// app/lib/googleSheets.ts - Sửa lại deleteCard

// app/lib/googleSheets.ts - Sửa lại deleteCard

export async function deleteCard(id: string, language: Language): Promise<void> {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID is not defined");
    }

    const langConfig = LANGUAGES.find(l => l.code === language);
    if (!langConfig) {
        throw new Error(`Invalid language: ${language}`);
    }

    const targetSheetName = langConfig.sheetName;
    const sheets = await getSheets();

    // Lấy danh sách sheets để tìm đúng tên (không phân biệt hoa/thường)
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
    });

    // Tìm sheet với tên không phân biệt hoa/thường
    const actualSheet = spreadsheet.data.sheets?.find(
        (sheet: any) => sheet.properties?.title?.toLowerCase() === targetSheetName.toLowerCase()
    );

    if (!actualSheet || !actualSheet.properties) {
        throw new Error(`Sheet ${targetSheetName} not found`);
    }

    const actualSheetName = actualSheet.properties.title;
    const sheetId = actualSheet.properties.sheetId;

    if (!sheetId) {
        throw new Error(`Sheet ${actualSheetName} has no sheetId`);
    }

    // Lấy dữ liệu trực tiếp từ sheet
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${actualSheetName}!A:E`,
    });

    const values = response.data.values || [];
    if (values.length === 0) {
        throw new Error("No data found in sheet");
    }

    console.log(`Searching for card with ID: "${id}" in sheet: ${actualSheetName}`);
    console.log(`Total rows in sheet: ${values.length}`);

    // Kiểm tra xem có header không
    const firstRow = values[0];
    const hasHeader = firstRow && (firstRow[0] === "ID" || firstRow[0] === "id");

    let startIndex = hasHeader ? 1 : 0; // Nếu có header thì bắt đầu từ 1, không thì từ 0

    // Debug: In ra tất cả ID trong sheet để so sánh
    for (let i = 0; i < values.length; i++) {
        const row = values[i];
        if (row && row[0]) {
            console.log(`Row ${i}: ID = "${row[0]}" (type: ${typeof row[0]})`);
        }
    }

    // Tìm row index của card cần xóa
    let rowIndex = -1;
    for (let i = startIndex; i < values.length; i++) {
        const row = values[i];
        if (row && row[0]) {
            // So sánh ID, trim khoảng trắng
            const sheetId_ = row[0].toString().trim();
            const searchId = id.toString().trim();
            if (sheetId_ === searchId) {
                rowIndex = i;
                console.log(`Found match at row ${i}: ${sheetId_} === ${searchId}`);
                break;
            }
        }
    }

    if (rowIndex === -1) {
        console.error(`Card with id ${id} not found in sheet ${actualSheetName}`);
        throw new Error(`Card with id ${id} not found`);
    }

    // Xóa row
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: sheetId,
                        dimension: "ROWS",
                        startIndex: rowIndex,
                        endIndex: rowIndex + 1,
                    }
                }
            }]
        }
    });

    console.log(`Successfully deleted card with id ${id} from row ${rowIndex}`);

    clearSheetCache(language);
}

export async function deleteMultipleCards(ids: string[], language: Language): Promise<void> {
    if (ids.length === 0) return;

    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID is not defined");
    }

    const langConfig = LANGUAGES.find(l => l.code === language);
    if (!langConfig) {
        throw new Error(`Invalid language: ${language}`);
    }

    const targetSheetName = langConfig.sheetName;
    const sheets = await getSheets();

    // Lấy danh sách sheets để tìm đúng tên (không phân biệt hoa/thường)
    const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId,
        includeGridData: false,
    });

    // Tìm sheet với tên không phân biệt hoa/thường
    const actualSheet = spreadsheet.data.sheets?.find(
        (sheet: any) => sheet.properties?.title?.toLowerCase() === targetSheetName.toLowerCase()
    );

    if (!actualSheet || !actualSheet.properties) {
        throw new Error(`Sheet ${targetSheetName} not found`);
    }

    const actualSheetName = actualSheet.properties.title;
    const sheetId = actualSheet.properties.sheetId;

    if (!sheetId) {
        throw new Error(`Sheet ${actualSheetName} has no sheetId`);
    }

    // Lấy dữ liệu trực tiếp từ sheet
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${actualSheetName}!A:E`,
    });

    const values = response.data.values || [];
    if (values.length === 0) {
        return;
    }

    // Kiểm tra xem có header không
    const firstRow = values[0];
    const hasHeader = firstRow && (firstRow[0] === "ID" || firstRow[0] === "id");

    let startIndex = hasHeader ? 1 : 0;

    console.log(`Searching for multiple cards in sheet: ${actualSheetName}`);
    console.log(`IDs to delete: ${ids.join(', ')}`);
    console.log(`Has header: ${hasHeader}, startIndex: ${startIndex}`);

    // Tìm tất cả row index cần xóa
    const rowsToDelete: number[] = [];
    for (let i = startIndex; i < values.length; i++) {
        const row = values[i];
        if (row && row[0]) {
            const sheetId_ = row[0].toString().trim();
            if (ids.some(searchId => searchId.toString().trim() === sheetId_)) {
                rowsToDelete.push(i);
                console.log(`Found match at row ${i}: ID = ${sheetId_}`);
            }
        }
    }

    if (rowsToDelete.length === 0) {
        console.error(`No matching cards found for ids: ${ids.join(', ')}`);
        return;
    }

    // Sắp xếp giảm dần để xóa từ dưới lên
    rowsToDelete.sort((a, b) => b - a);

    // Tạo requests xóa từng row
    const requests = rowsToDelete.map(startIndex => ({
        deleteDimension: {
            range: {
                sheetId: sheetId,
                dimension: "ROWS",
                startIndex: startIndex,
                endIndex: startIndex + 1,
            }
        }
    }));

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
    });

    console.log(`Successfully deleted ${rowsToDelete.length} cards from sheet ${actualSheetName}`);

    clearSheetCache(language);
}
