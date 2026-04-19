// app/page.tsx (phần cập nhật)
"use client";

import { useState, useEffect, useCallback } from "react";
import Flashcard from "./components/Flashcard";
import ManagerPanel from "./components/ManagerPanel";
import CardModal from "./components/CardModal";
import { VocabularyCard } from "./types";

export default function Home() {
    const [cards, setCards] = useState<VocabularyCard[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showManager, setShowManager] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<VocabularyCard | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCards = useCallback(async () => {
        try {
            const response = await fetch("/api/cards");
            const data = await response.json();
            setCards(data);
            setCurrentIndex(0);
        } catch (error) {
            console.error("Failed to fetch cards:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCards();
    }, [fetchCards]);

    const handleNext = () => {
        if (currentIndex < cards.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleShuffle = () => {
        const shuffled = [...cards];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setCards(shuffled);
        setCurrentIndex(0);
    };

    const handleAddCard = async (cardData: Partial<VocabularyCard>) => {
        try {
            const response = await fetch("/api/cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cardData),
            });
            const newCard = await response.json();
            setCards([...cards, newCard]);
        } catch (error) {
            console.error("Failed to add card:", error);
            alert("Thêm thẻ thất bại!");
        }
    };

    const handleEditCard = async (cardData: Partial<VocabularyCard>) => {
        if (!editingCard) return;
        
        try {
            const updatedCard = { ...editingCard, ...cardData };
            const response = await fetch("/api/cards", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedCard),
            });
            const result = await response.json();
            
            const updatedCards = cards.map((c) =>
                c.id === editingCard.id ? result : c
            );
            setCards(updatedCards);
            setEditingCard(null);
        } catch (error) {
            console.error("Failed to update card:", error);
            alert("Cập nhật thẻ thất bại!");
        }
    };

    const handleDeleteCard = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa thẻ này?")) return;
        
        try {
            await fetch(`/api/cards?id=${id}`, { method: "DELETE" });
            const newCards = cards.filter((c) => c.id !== id);
            setCards(newCards);
            if (currentIndex >= newCards.length && newCards.length > 0) {
                setCurrentIndex(newCards.length - 1);
            } else if (newCards.length === 0) {
                setCurrentIndex(0);
            }
        } catch (error) {
            console.error("Failed to delete card:", error);
            alert("Xóa thẻ thất bại!");
        }
    };

    // Hàm xóa hàng loạt
    const handleBulkDelete = async (ids: string[]) => {
        try {
            const response = await fetch(`/api/cards?ids=${JSON.stringify(ids)}`, { 
                method: "DELETE" 
            });
            const result = await response.json();
            
            if (result.success) {
                const newCards = cards.filter((c) => !ids.includes(c.id));
                setCards(newCards);
                if (currentIndex >= newCards.length && newCards.length > 0) {
                    setCurrentIndex(newCards.length - 1);
                } else if (newCards.length === 0) {
                    setCurrentIndex(0);
                }
                return;
            } else {
                throw new Error("Bulk delete failed");
            }
        } catch (error) {
            console.error("Failed to bulk delete cards:", error);
            throw error;
        }
    };

    const openAddModal = () => {
        setEditingCard(null);
        setModalOpen(true);
    };

    const openEditModal = (card: VocabularyCard) => {
        setEditingCard(card);
        setModalOpen(true);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-white text-xl">Đang tải dữ liệu...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 bg-zinc-900 border border-zinc-800">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                    📚 Học Từ Vựng Flashcard
                </h1>
                <button
                    onClick={() => setShowManager(!showManager)}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-300"
                >
                    {showManager ? "🎴 Học ngay" : "📋 Quản lý"}
                </button>
            </div>

            {cards.length === 0 && !showManager ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
                        <p className="text-white text-xl mb-4">Chưa có từ vựng nào!</p>
                        <button
                            onClick={openAddModal}
                            className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                        >
                            + Thêm từ vựng đầu tiên
                        </button>
                    </div>
                </div>
            ) : showManager ? (
                <ManagerPanel
                    cards={cards}
                    onAdd={openAddModal}
                    onEdit={openEditModal}
                    onDelete={handleDeleteCard}
                    onBulkDelete={handleBulkDelete}
                    onShuffle={handleShuffle}
                />
            ) : (
                <Flashcard
                    card={cards[currentIndex]}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    hasNext={currentIndex < cards.length - 1}
                    hasPrev={currentIndex > 0}
                />
            )}

            {!showManager && cards.length > 0 && (
                <div className="fixed bottom-4 right-4 bg-white/20 backdrop-blur-lg rounded-full px-4 py-2 text-white text-sm">
                    {currentIndex + 1} / {cards.length}
                </div>
            )}

            <CardModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingCard(null);
                }}
                onSave={editingCard ? handleEditCard : handleAddCard}
                card={editingCard}
            />
        </div>
    );
}