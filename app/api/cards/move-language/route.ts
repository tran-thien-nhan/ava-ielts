// app/api/cards/move-language/route.ts
import { NextRequest, NextResponse } from "next/server";
import { deleteCard, addCard, getCardsByLanguage } from "../../../lib/googleSheets";
import { VocabularyCard, Language } from "../../../types";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { card, oldLanguage, newLanguage } = body;

        if (!card || !card.id || !oldLanguage || !newLanguage) {
            return NextResponse.json(
                { error: "Missing required fields: card, oldLanguage, newLanguage" },
                { status: 400 }
            );
        }

        if (oldLanguage === newLanguage) {
            // Nếu không đổi ngôn ngữ, chỉ cần update card bình thường
            return NextResponse.json({ success: true, moved: false });
        }

        // Xóa card khỏi sheet cũ
        await deleteCard(card.id, oldLanguage as Language);

        // Tạo card mới với ngôn ngữ mới (giữ nguyên id)
        const newCard: VocabularyCard = {
            ...card,
            language: newLanguage as Language,
            updatedAt: new Date().toISOString(),
        };

        // Thêm vào sheet mới
        const addedCard = await addCard(newCard);

        return NextResponse.json({
            success: true,
            moved: true,
            card: addedCard
        });
    } catch (error: any) {
        console.error("Move language error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to move card to new language" },
            { status: 500 }
        );
    }
}