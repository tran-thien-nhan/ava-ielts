// app/lib/googleSheets.ts
import 'server-only';

import { google } from "googleapis";
import { SHEET_HEADERS, VocabularyCard } from "../types";

let sheetDataCache: VocabularyCard[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 1000 * 60 * 5; // 5 phút

export async function getSheets() {
    // Kiểm tra environment variables
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

export function clearSheetCache() {
    sheetDataCache = null;
    cacheTimestamp = 0;
}

function rowToCard(row: string[]): VocabularyCard {
    return {
        id: row[0] || "",
        vietnamese: row[1] || "",
        english: row[2] || "",
        createdAt: row[3] || new Date().toISOString(),
        updatedAt: row[4] || new Date().toISOString(),
    };
}

function cardToRow(card: VocabularyCard): string[] {
    return [
        card.id,
        card.vietnamese,
        card.english,
        card.createdAt,
        card.updatedAt,
    ];
}

export async function getAllCards(): Promise<VocabularyCard[]> {
    const now = Date.now();

    if (sheetDataCache && (now - cacheTimestamp) < CACHE_DURATION) {
        return sheetDataCache;
    }

    // Kiểm tra spreadsheetId
    const spreadsheetId = process.env.SPREADSHEET_ID || "1kp19fVAyAu6wDK9kvSNs4n5YacSSWXjT2VESiXHpcZ8";
    if (!spreadsheetId) {
        console.error("SPREADSHEET_ID is not defined in environment variables");
        return [];
    }

    const sheets = await getSheets();

    try {
        // Kiểm tra và tạo header nếu chưa có
        const headerCheck = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "Sheet1!A1:E1",
        });

        if (!headerCheck.data.values || headerCheck.data.values.length === 0) {
            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: "Sheet1!A1:E1",
                valueInputOption: "USER_ENTERED",
                requestBody: { values: [SHEET_HEADERS] },
            });
            sheetDataCache = [];
            cacheTimestamp = now;
            return [];
        }

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: "Sheet1!A2:E",
        });

        const values = response.data.values || [];
        const cards: VocabularyCard[] = values
            .map((row: string[]) => rowToCard(row))
            .filter((card: VocabularyCard) => card.id);

        sheetDataCache = cards;
        cacheTimestamp = now;
        return cards;
    } catch (error) {
        console.error("Error getting cards:", error);
        return sheetDataCache || [];
    }
}

export async function addCard(card: VocabularyCard): Promise<VocabularyCard> {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID is not defined");
    }
    
    const sheets = await getSheets();

    const newCard: VocabularyCard = {
        ...card,
        id: card.id || Date.now().toString(),
        createdAt: card.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: "Sheet1!A:E",
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [cardToRow(newCard)] },
    });

    clearSheetCache();
    return newCard;
}

export async function updateCard(card: VocabularyCard): Promise<VocabularyCard> {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID is not defined");
    }
    
    const sheets = await getSheets();

    const cards = await getAllCards();
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
        range: `Sheet1!A${rowIndex + 2}:E${rowIndex + 2}`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [cardToRow(updatedCard)] },
    });

    clearSheetCache();
    return updatedCard;
}

export async function deleteCard(id: string): Promise<void> {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID is not defined");
    }
    
    const sheets = await getSheets();

    const cards = await getAllCards();
    const rowIndex = cards.findIndex((c) => c.id === id);

    if (rowIndex === -1) {
        throw new Error("Card not found");
    }

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
            requests: [{
                deleteDimension: {
                    range: {
                        sheetId: 0,
                        dimension: "ROWS",
                        startIndex: rowIndex + 1,
                        endIndex: rowIndex + 2,
                    }
                }
            }]
        }
    });

    clearSheetCache();
}

export async function deleteMultipleCards(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) {
        throw new Error("SPREADSHEET_ID is not defined");
    }
    
    const sheets = await getSheets();

    const allCards = await getAllCards();

    const rowsToDelete = ids
        .map(id => {
            const index = allCards.findIndex(card => card.id === id);
            return index !== -1 ? index + 1 : -1;
        })
        .filter(index => index !== -1)
        .sort((a, b) => b - a);

    if (rowsToDelete.length === 0) return;

    const requests = rowsToDelete.map(startIndex => ({
        deleteDimension: {
            range: {
                sheetId: 0,
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

    clearSheetCache();
}