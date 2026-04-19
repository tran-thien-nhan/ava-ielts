// app/api/cards/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAllCards, addCard, updateCard, deleteCard, deleteMultipleCards } from "../../lib/googleSheets";
import { VocabularyCard } from "../../types";

export async function GET() {
    try {
        const cards = await getAllCards();
        return NextResponse.json(cards);
    } catch (error: any) {
        console.error("GET error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch cards" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        
        // Validate input
        if (!body.vietnamese || !body.english) {
            return NextResponse.json(
                { error: "Missing required fields: vietnamese and english" },
                { status: 400 }
            );
        }
        
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
        return NextResponse.json(
            { error: error.message || "Failed to add card" },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        
        if (!body.id) {
            return NextResponse.json(
                { error: "Missing card id" },
                { status: 400 }
            );
        }
        
        const updatedCard = await updateCard(body);
        return NextResponse.json(updatedCard);
    } catch (error: any) {
        console.error("PUT error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update card" },
            { status: 500 }
        );
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
                return NextResponse.json(
                    { error: "Invalid ids array" },
                    { status: 400 }
                );
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