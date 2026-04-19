// app/api/cards/route.ts (cập nhật để hỗ trợ xóa nhiều)
import { NextRequest, NextResponse } from "next/server";
import { getAllCards, addCard, updateCard, deleteCard, deleteMultipleCards } from "../../lib/googleSheets";
import { VocabularyCard } from "../../types";

export async function GET() {
    try {
        const cards = await getAllCards();
        return NextResponse.json(cards);
    } catch (error: any) {
        console.error("GET error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const card: VocabularyCard = {
            ...body,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        
        const newCard = await addCard(card);
        return NextResponse.json(newCard, { status: 201 });
    } catch (error: any) {
        console.error("POST error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const updatedCard = await updateCard(body);
        return NextResponse.json(updatedCard);
    } catch (error: any) {
        console.error("PUT error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const idsParam = searchParams.get("ids");
        
        // Xóa nhiều card
        if (idsParam) {
            const ids = JSON.parse(idsParam);
            if (!Array.isArray(ids) || ids.length === 0) {
                return NextResponse.json({ error: "Invalid ids array" }, { status: 400 });
            }
            await deleteMultipleCards(ids);
            return NextResponse.json({ success: true, deletedCount: ids.length });
        } 
        // Xóa một card
        else if (id) {
            await deleteCard(id);
            return NextResponse.json({ success: true });
        } 
        else {
            return NextResponse.json({ error: "Missing id or ids parameter" }, { status: 400 });
        }
    } catch (error: any) {
        console.error("DELETE error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}