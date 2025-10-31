import React, { useState } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import type { Expense, ExpenseCategory } from '../../types';
import { getExpenseCategoryName, getExpenseCategoryIcon } from '../../services/reportHelpers';

interface AddExpenseModalProps {
    expense?: Expense; // For editing
    onClose: () => void;
}

const AddExpenseModal: React.FC<AddExpenseModalProps> = ({ expense, onClose }) => {
    const { rooms, addExpense, updateExpense } = useAppData();
    const isEditing = !!expense;

    const [formData, setFormData] = useState({
        category: expense?.category || 'other' as ExpenseCategory,
        amount: expense?.amount.toString() || '',
        date: expense?.date || new Date().toISOString().slice(0, 10),
        description: expense?.description || '',
        isRecurring: expense?.isRecurring || false,
        roomId: expense?.roomId?.toString() || '',
        note: expense?.note || ''
    });

    const [isSubmitting, setIsSubmitting] = useState(false);

    const categories: ExpenseCategory[] = ['electric_shared', 'internet_shared', 'trash_shared', 'repair', 'other'];
    
    // Auto-fill description based on category
    const getAutoDescription = (category: ExpenseCategory): string => {
        switch (category) {
            case 'electric_shared': return 'Tiền điện chung';
            case 'internet_shared': return 'Tiền internet chung';
            case 'trash_shared': return 'Tiền rác chung';
            case 'repair': return ''; // User nhập tự do
            case 'other': return ''; // User nhập tự do
            default: return '';
        }
    };
    
    // Handle category change → Auto-fill description
    const handleCategoryChange = (newCategory: ExpenseCategory) => {
        const autoDesc = getAutoDescription(newCategory);
        setFormData({ 
            ...formData, 
            category: newCategory,
            description: autoDesc || formData.description // Keep existing if no auto-desc
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (isSubmitting) return;

        // Validation
        if (!formData.category) {
            alert('⚠️ Vui lòng chọn danh mục!');
            return;
        }

        const amount = parseFloat(formData.amount);
        if (!amount || amount <= 0) {
            alert('⚠️ Vui lòng nhập số tiền hợp lệ!');
            return;
        }

        if (!formData.date) {
            alert('⚠️ Vui lòng chọn ngày!');
            return;
        }

        if (!formData.description.trim()) {
            alert('⚠️ Vui lòng nhập mô tả!');
            return;
        }

        setIsSubmitting(true);

        try {
            // Calculate period from date (YYYY-MM)
            const period = formData.date.slice(0, 7);
            
            const expenseData: Omit<Expense, 'id'> = {
                category: formData.category,
                amount,
                date: formData.date,
                period,
                description: formData.description.trim(),
                isRecurring: formData.isRecurring,
                roomId: formData.roomId ? parseInt(formData.roomId) : undefined,
                note: formData.note.trim() || undefined
            };

            if (isEditing) {
                await updateExpense(expense.id, expenseData);
                alert('✅ Đã cập nhật chi phí!');
            } else {
                await addExpense(expenseData);
                const msg = formData.isRecurring 
                    ? '✅ Đã thêm chi phí! Chi phí này sẽ tự động tạo mỗi tháng.' 
                    : '✅ Đã thêm chi phí!';
                alert(msg);
            }

            setTimeout(() => {
                onClose();
            }, 300);
        } catch (error) {
            console.error('Error saving expense:', error);
            alert('❌ Có lỗi khi lưu chi phí!');
            setIsSubmitting(false);
        }
    };

    return (
        <Modal onClose={onClose}>
            <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-slate-800">
                        {isEditing ? '✏️ Sửa chi phí' : '➕ Thêm chi phí'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                        disabled={isSubmitting}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            📂 Danh mục <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.category}
                            onChange={(e) => handleCategoryChange(e.target.value as ExpenseCategory)}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isSubmitting}
                        >
                            <option value="electric_shared">⚡ Tiền điện chung</option>
                            <option value="internet_shared">🌐 Tiền internet chung</option>
                            <option value="trash_shared">🗑️ Tiền rác chung</option>
                            <option value="repair">🔧 Sửa chữa</option>
                            <option value="other">📝 Khác</option>
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            {formData.category !== 'repair' && formData.category !== 'other' && '💡 Mô tả sẽ tự động điền'}
                        </p>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            💰 Số tiền <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                            placeholder="0"
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            min="0"
                            step="1000"
                            required
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-slate-500 mt-1">Đơn vị: VNĐ</p>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            📅 Ngày <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Recurring Checkbox */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <label className="flex items-start cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.isRecurring}
                                onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                                className="mt-0.5 h-4 w-4 text-amber-600 focus:ring-amber-500 border-slate-300 rounded"
                                disabled={isSubmitting}
                            />
                            <div className="ml-2.5">
                                <span className="text-sm font-semibold text-amber-900">
                                    🔁 Chi phí cố định hàng tháng
                                </span>
                                <p className="text-xs text-amber-700 mt-0.5">
                                    Tự động tạo chi phí này mỗi tháng (VD: Internet, Rác)
                                </p>
                            </div>
                        </label>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            📝 Mô tả <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="VD: Sửa điều hòa phòng 101, Tiền điện chung tháng 10..."
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Room (Optional) */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            🏠 Phòng <span className="text-slate-400 text-xs">(không bắt buộc)</span>
                        </label>
                        <select
                            value={formData.roomId}
                            onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={isSubmitting}
                        >
                            <option value="">-- Không chọn phòng --</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    {room.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-slate-500 mt-1">
                            Chọn phòng nếu chi phí liên quan đến phòng cụ thể
                        </p>
                    </div>

                    {/* Note (Optional) */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                            💬 Ghi chú thêm <span className="text-slate-400 text-xs">(không bắt buộc)</span>
                        </label>
                        <textarea
                            value={formData.note}
                            onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            placeholder="Ghi chú thêm nếu cần..."
                            className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={2}
                            disabled={isSubmitting}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
                            disabled={isSubmitting}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '⏳ Đang lưu...' : (isEditing ? '✓ Cập nhật' : '✓ Lưu')}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
};

export default AddExpenseModal;

