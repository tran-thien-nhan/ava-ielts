// app/components/ManagerPanel.tsx
"use client";

import { useState, useMemo } from "react";
import { VocabularyCard } from "../types";
import { playAudio } from "../lib/textToSpeech";

interface ManagerPanelProps {
    cards: VocabularyCard[];
    onAdd: () => void;
    onEdit: (card: VocabularyCard) => void;
    onDelete: (id: string) => void;
    onBulkDelete: (ids: string[]) => Promise<void>;
    onShuffle: () => void;
}

type SortField = "vietnamese" | "english" | "createdAt";
type SortOrder = "asc" | "desc";

export default function ManagerPanel({ 
    cards, 
    onAdd, 
    onEdit, 
    onDelete, 
    onBulkDelete,
    onShuffle 
}: ManagerPanelProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [sortField, setSortField] = useState<SortField>("createdAt");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);

    // Lọc + Sắp xếp
    const filteredAndSortedCards = useMemo(() => {
        let result = cards.filter(card =>
            card.vietnamese.toLowerCase().includes(searchTerm.toLowerCase()) ||
            card.english.toLowerCase().includes(searchTerm.toLowerCase())
        );

        result.sort((a, b) => {
            let valA: string | number = a[sortField];
            let valB: string | number = b[sortField];

            if (sortField === "createdAt") {
                valA = new Date(valA as string).getTime();
                valB = new Date(valB as string).getTime();
            } else {
                valA = (valA as string).toLowerCase();
                valB = (valB as string).toLowerCase();
            }

            if (valA < valB) return sortOrder === "asc" ? -1 : 1;
            if (valA > valB) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return result;
    }, [cards, searchTerm, sortField, sortOrder]);

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredAndSortedCards.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredAndSortedCards.map(c => c.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        
        const count = selectedIds.size;
        if (!confirm(`Bạn có chắc chắn muốn xóa ${count} thẻ đã chọn?\nHành động này không thể hoàn tác!`)) return;

        setIsDeleting(true);
        try {
            const idsArray = Array.from(selectedIds);
            await onBulkDelete(idsArray);
            setSelectedIds(new Set());
            // Hiển thị thông báo thành công (có thể thêm toast)
            alert(`✅ Đã xóa thành công ${count} thẻ!`);
        } catch (error) {
            console.error("Bulk delete failed:", error);
            alert(`❌ Xóa thất bại. Vui lòng thử lại sau.`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handlePlayAudio = (english: string) => {
        playAudio(english);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert(`📋 Đã copy: "${text}"`);
    };

    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8">
            {/* Header + Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white">Quản lý từ vựng</h2>
                    <p className="text-zinc-400 text-sm mt-1">
                        Tổng cộng: <span className="text-emerald-400 font-medium">{cards.length}</span> thẻ
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onShuffle}
                        className="px-5 py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl transition-all flex items-center gap-2 font-medium"
                    >
                        🔀 Xáo trộn
                    </button>
                    <button
                        onClick={onAdd}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl transition-all flex items-center gap-2 font-medium"
                    >
                        + Thêm thẻ mới
                    </button>
                </div>
            </div>

            {/* Search & Sort */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <input
                    type="text"
                    placeholder="🔍 Tìm kiếm từ vựng..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 px-5 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />

                <select
                    value={`${sortField}-${sortOrder}`}
                    onChange={(e) => {
                        const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
                        setSortField(field);
                        setSortOrder(order);
                    }}
                    className="px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white focus:outline-none"
                >
                    <option value="createdAt-desc">Mới nhất</option>
                    <option value="createdAt-asc">Cũ nhất</option>
                    <option value="vietnamese-asc">Tiếng Việt (A-Z)</option>
                    <option value="english-asc">Tiếng Anh (A-Z)</option>
                </select>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="mb-4 p-4 bg-red-950/50 border border-red-800/50 rounded-2xl flex items-center justify-between backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                        <span className="text-white font-medium">
                            Đã chọn: <strong className="text-red-400 text-lg">{selectedIds.size}</strong> thẻ
                        </span>
                        <button
                            onClick={() => setSelectedIds(new Set())}
                            className="text-zinc-400 hover:text-white text-sm transition-colors"
                        >
                            Bỏ chọn tất cả
                        </button>
                    </div>
                    <button
                        onClick={handleBulkDelete}
                        disabled={isDeleting}
                        className={`px-6 py-2.5 rounded-xl transition-all flex items-center gap-2 font-medium ${
                            isDeleting 
                                ? "bg-gray-600 cursor-not-allowed text-gray-300" 
                                : "bg-red-600 hover:bg-red-500 text-white"
                        }`}
                    >
                        {isDeleting ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Đang xóa...
                            </>
                        ) : (
                            <>
                                🗑️ Xóa {selectedIds.size} thẻ
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
                <table className="w-full text-sm text-zinc-200">
                    <thead className="bg-zinc-950 border-b border-zinc-800">
                        <tr>
                            <th className="w-10 py-4 px-4">
                                <input 
                                    type="checkbox"
                                    checked={selectedIds.size === filteredAndSortedCards.length && filteredAndSortedCards.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                                    disabled={filteredAndSortedCards.length === 0}
                                />
                            </th>
                            <th className="text-left py-4 px-6 font-medium text-zinc-400">Tiếng Việt</th>
                            <th className="text-left py-4 px-6 font-medium text-zinc-400">Tiếng Anh</th>
                            <th className="text-center py-4 px-6 font-medium text-zinc-400 w-20">Nghe</th>
                            <th className="text-center py-4 px-6 font-medium text-zinc-400 w-40">Thao tác</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                        {filteredAndSortedCards.map((card) => (
                            <tr key={card.id} className="hover:bg-zinc-800/50 transition-colors">
                                <td className="py-4 px-4">
                                    <input 
                                        type="checkbox"
                                        checked={selectedIds.has(card.id)}
                                        onChange={() => toggleSelect(card.id)}
                                        className="w-4 h-4 accent-emerald-500 cursor-pointer"
                                    />
                                </td>
                                <td className="py-4 px-6 font-medium">{card.vietnamese}</td>
                                <td className="py-4 px-6 text-emerald-300">
                                    <span 
                                        onClick={() => copyToClipboard(card.english)}
                                        className="cursor-pointer hover:text-emerald-400 transition-colors"
                                        title="Click để copy"
                                    >
                                        {card.english}
                                    </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <button
                                        onClick={() => handlePlayAudio(card.english)}
                                        className="inline-flex items-center justify-center w-9 h-9 bg-zinc-800 hover:bg-emerald-600 hover:text-white text-emerald-400 rounded-xl transition-all"
                                        title="Nghe phát âm"
                                    >
                                        🔊
                                    </button>
                                </td>
                                <td className="py-4 px-6 text-center">
                                    <button
                                        onClick={() => onEdit(card)}
                                        className="inline-flex items-center justify-center w-9 h-9 bg-zinc-800 hover:bg-yellow-600 hover:text-white text-yellow-400 rounded-xl transition-all mr-2"
                                        title="Sửa"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => onDelete(card.id)}
                                        className="inline-flex items-center justify-center w-9 h-9 bg-zinc-800 hover:bg-red-600 hover:text-white text-red-400 rounded-xl transition-all"
                                        title="Xóa"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredAndSortedCards.length === 0 && (
                <div className="text-center py-16 text-zinc-500">
                    {searchTerm ? "🔍 Không tìm thấy từ vựng nào phù hợp" : "📭 Chưa có từ vựng nào. Hãy thêm thẻ mới!"}
                </div>
            )}

            {/* Hiển thị số lượng đã chọn ở footer */}
            {selectedIds.size > 0 && !isDeleting && (
                <div className="mt-4 text-center text-zinc-500 text-sm">
                    Đã chọn {selectedIds.size} / {filteredAndSortedCards.length} thẻ
                </div>
            )}
        </div>
    );
}