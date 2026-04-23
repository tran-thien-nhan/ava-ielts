// app/api/fix-header/route.ts
import { NextResponse } from "next/server";
import { getSheets } from "../../lib/googleSheets";
import { LANGUAGES, SHEET_HEADERS } from "../../types";

export async function POST() {
    try {
        const spreadsheetId = process.env.SPREADSHEET_ID;
        const sheets = await getSheets();
        const results: any = {};

        for (const lang of LANGUAGES) {
            const sheetName = lang.sheetName;

            // Lấy dữ liệu hiện tại
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range: `${sheetName}!A:E`,
            });

            const currentData = response.data.values || [];

            if (currentData.length > 0 && currentData[0][0] !== "ID") {
                // Chèn header vào đầu sheet
                await sheets.spreadsheets.values.update({
                    spreadsheetId,
                    range: `${sheetName}!A1:E1`,
                    valueInputOption: "USER_ENTERED",
                    requestBody: { values: [SHEET_HEADERS] },
                });

                // Di chuyển dữ liệu cũ xuống dưới
                if (currentData.length > 0) {
                    await sheets.spreadsheets.values.update({
                        spreadsheetId,
                        range: `${sheetName}!A2:E${currentData.length + 1}`,
                        valueInputOption: "USER_ENTERED",
                        requestBody: { values: currentData },
                    });
                }

                results[sheetName] = "Header added, data moved down";
            } else {
                results[sheetName] = "Already has header or empty";
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// xong vào F12 gõ:
// fetch('/api/fix-header', { method: 'POST' })
//   .then(res => res.json())
//   .then(data => console.log(data))
//   .catch(err => console.error(err));