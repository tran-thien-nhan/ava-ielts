// app/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import CardModal from "./components/CardModal";
import LanguageSelector from "./components/LanguageSelector";
import { VocabularyCard, Language, LANGUAGES } from "./types";
import ManagerPanel from "./components/ManagerPanel";
import Flashcard from "./components/Flashcard";

export default function Home() {
    const [cards, setCards] = useState<VocabularyCard[]>([]);
    const [currentLanguage, setCurrentLanguage] = useState<Language>('english');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showManager, setShowManager] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState<VocabularyCard | null>(null);
    const [loading, setLoading] = useState(true);
    const [allCards, setAllCards] = useState<VocabularyCard[]>([]);
    const currentCard = cards[currentIndex];

    const fetchCards = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/cards/${currentLanguage}`);
            const data = await response.json();
            setCards(data);
            setCurrentIndex(0);
        } catch (error) {
            console.error("Failed to fetch cards:", error);
        } finally {
            setLoading(false);
        }
    }, [currentLanguage]);

    useEffect(() => {
        fetchCards();
    }, [fetchCards, currentLanguage]);

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

    const handleShuffle = useCallback(() => {
        if (cards.length <= 1) return;

        const shuffled = [...cards];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        setCards(shuffled);
        setCurrentIndex(0);
    }, [cards]);

    const handleAddCard = async (cardData: Partial<VocabularyCard>) => {
        try {
            const response = await fetch(`/api/cards/${currentLanguage}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(cardData),
            });
            const newCard = await response.json();
            await fetchCards();
        } catch (error) {
            console.error("Failed to add card:", error);
            alert("Thêm thẻ thất bại!");
        }
    };

    const handleEditCard = async (cardData: Partial<VocabularyCard>) => {
        if (!editingCard) return;

        try {
            // Kiểm tra language có thay đổi không, nếu có và khác undefined
            const languageChanged = cardData.language !== undefined &&
                cardData.language !== editingCard.language;

            if (languageChanged && cardData.language) {
                // Chuyển sang ngôn ngữ mới
                const response = await fetch("/api/cards/move-language", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        card: { ...editingCard, ...cardData },
                        oldLanguage: editingCard.language,
                        newLanguage: cardData.language,
                    }),
                });

                const result = await response.json();
                if (result.success) {
                    // Nếu đang ở tab cũ, refresh; nếu sang tab mới, chuyển tab
                    if (cardData.language === currentLanguage) {
                        await fetchCards();
                    } else {
                        setCurrentLanguage(cardData.language);
                    }
                }
            } else {
                // Cập nhật trong cùng ngôn ngữ
                const updatedCard = { ...editingCard, ...cardData, language: currentLanguage };
                const response = await fetch(`/api/cards/${currentLanguage}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedCard),
                });
                const result = await response.json();
                if (result) {
                    await fetchCards();
                }
            }

            setEditingCard(null);
        } catch (error) {
            console.error("Failed to update card:", error);
            alert("Cập nhật thẻ thất bại!");
        }
    };

    const handleDeleteCard = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa thẻ này?")) return;

        try {
            await fetch(`/api/cards/${currentLanguage}?id=${id}`, { method: "DELETE" });
            await fetchCards();
        } catch (error) {
            console.error("Failed to delete card:", error);
            alert("Xóa thẻ thất bại!");
        }
    };

    const handleBulkDelete = async (ids: string[]) => {
        try {
            const response = await fetch(`/api/cards/${currentLanguage}?ids=${JSON.stringify(ids)}`, {
                method: "DELETE"
            });
            const result = await response.json();

            if (result.success) {
                await fetchCards();
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

    const handleLanguageChange = (lang: Language) => {
        setCurrentLanguage(lang);
        setShowManager(false);
    };

    const currentLangInfo = LANGUAGES.find(l => l.code === currentLanguage);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-zinc-950">
                <div className="text-white text-xl">Đang tải dữ liệu...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 bg-zinc-950">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
                <h1 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg flex items-center gap-2">
                    <span>{currentLangInfo?.flag}</span>
                    <span>Học {currentLangInfo?.name} với Flashcard</span>
                </h1>
                <div className="flex gap-3">
                    <LanguageSelector
                        currentLanguage={currentLanguage}
                        onLanguageChange={handleLanguageChange}
                    />
                    <button
                        onClick={() => setShowManager(!showManager)}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-300 backdrop-blur-sm"
                    >
                        {showManager ? "🎴 Học ngay" : "📋 Quản lý"}
                    </button>
                </div>
            </div>

            {cards.length === 0 && !showManager ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
                        <p className="text-white text-xl mb-4">
                            Chưa có từ vựng {currentLangInfo?.name} nào!
                        </p>
                        <button
                            onClick={openAddModal}
                            className={`px-6 py-3 bg-gradient-to-r ${currentLangInfo?.color} hover:opacity-90 text-white rounded-lg transition-colors`}
                        >
                            + Thêm từ vựng {currentLangInfo?.name} đầu tiên
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
                    currentLanguage={currentLanguage}
                />
            ) : (
                <Flashcard
                    card={currentCard}
                    onNext={handleNext}
                    onPrev={handlePrev}
                    onShuffle={handleShuffle}
                    hasNext={currentIndex < cards.length - 1}
                    hasPrev={currentIndex > 0}
                    totalCards={cards.length}
                    currentIndex={currentIndex}
                    language={currentLanguage}
                />
            )}

            <CardModal
                isOpen={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setEditingCard(null);
                }}
                onSave={editingCard ? handleEditCard : handleAddCard}
                card={editingCard}
                defaultLanguage={currentLanguage}
            />
        </div>
    );
}