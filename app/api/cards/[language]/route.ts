// app/api/cards/[language]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCardsByLanguage, addCard, updateCard, deleteCard, deleteMultipleCards } from "../../../lib/googleSheets";
import { VocabularyCard, Language } from "../../../types";

// GET: Lấy tất cả cards của một ngôn ngữ
export async function GET(
    request: NextRequest,
    { params }: { params: { language: string } }
) {
    try {
        const language = params.language as Language;

        const cards = await getCardsByLanguage(language);

        return NextResponse.json(cards);
    } catch (error: any) {
        console.error("GET error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch cards" },
            { status: 500 }
        );
    }
}

// POST: Thêm card mới cho ngôn ngữ
export async function POST(
    request: NextRequest,
    { params }: { params: { language: string } }
) {
    try {
        const language = params.language as Language;
        const body = await request.json();

        if (!body.word || !body.meaning) {
            return NextResponse.json(
                { error: "Missing required fields: word and meaning" },
                { status: 400 }
            );
        }

        const card: VocabularyCard = {
            ...body,
            language: language,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const newCard = await addCard(card);
        return NextResponse.json(newCard, { status: 201 });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to add card" },
            { status: 500 }
        );
    }
}

// PUT: Cập nhật card
export async function PUT(
    request: NextRequest,
    { params }: { params: { language: string } }
) {
    try {
        const language = params.language as Language;
        const body = await request.json();

        if (!body.id) {
            return NextResponse.json(
                { error: "Missing card id" },
                { status: 400 }
            );
        }

        const updatedCard = await updateCard({ ...body, language });
        return NextResponse.json(updatedCard);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to update card" },
            { status: 500 }
        );
    }
}

// DELETE: Xóa card(s)
export async function DELETE(
    request: NextRequest,
    { params }: { params: { language: string } }
) {
    try {
        const language = params.language as Language;
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const idsParam = searchParams.get("ids");

        if (idsParam) {
            const ids = JSON.parse(idsParam);
            if (!Array.isArray(ids) || ids.length === 0) {
                return NextResponse.json(
                    { error: "Invalid ids array" },
                    { status: 400 }
                );
            }
            await deleteMultipleCards(ids, language);
            return NextResponse.json({ success: true, deletedCount: ids.length });
        }
        else if (id) {
            await deleteCard(id, language);
            return NextResponse.json({ success: true });
        }
        else {
            return NextResponse.json(
                { error: "Missing id or ids parameter" },
                { status: 400 }
            );
        }
    } catch (error: any) {
        console.error("DELETE error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete card" },
            { status: 500 }
        );
    }
}