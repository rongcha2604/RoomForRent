import React, { useState } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { type Room } from '../../types';
import { PRIMARY_COLOR } from '../../constants';

interface EditRoomModalProps {
    room: Room;
    onClose: () => void;
}

const EditRoomModal: React.FC<EditRoomModalProps> = ({ room, onClose }) => {
    const { rooms, updateRoom } = useAppData();
    const [formData, setFormData] = useState({
        name: room.name,
        baseRent: room.baseRent.toString(),
        deposit: room.deposit.toString(),
        note: room.note || ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.name.trim()) {
            alert('Vui lòng nhập tên phòng!');
            return;
        }

        // Check duplicate name (exclude current room)
        const isDuplicate = rooms.some(r => 
            r.id !== room.id && 
            r.name.toLowerCase() === formData.name.trim().toLowerCase()
        );
        if (isDuplicate) {
            alert('Tên phòng đã tồn tại!');
            return;
        }

        const baseRent = parseFloat(formData.baseRent);
        if (isNaN(baseRent) || baseRent <= 0) {
            alert('Giá thuê phải lớn hơn 0!');
            return;
        }

        const deposit = formData.deposit ? parseFloat(formData.deposit) : 0;
        if (isNaN(deposit) || deposit < 0) {
            alert('Tiền cọc không hợp lệ!');
            return;
        }

        try {
            setIsSubmitting(true);

            await updateRoom(room.id, {
                name: formData.name.trim(),
                baseRent,
                deposit,
                note: formData.note.trim()
            });

            alert('Cập nhật phòng thành công!');
            onClose();
        } catch (error) {
            console.error('Error updating room:', error);
            alert('Có lỗi xảy ra khi cập nhật phòng!');
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatCurrency = (value: string) => {
        const num = value.replace(/\D/g, '');
        return num ? parseInt(num).toLocaleString('vi-VN') : '';
    };

    return (
        <Modal title="Chỉnh sửa phòng" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Room Name */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Tên phòng <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="VD: Phòng 101, P201..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Base Rent */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Giá thuê (VNĐ/tháng) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="baseRent"
                        value={formatCurrency(formData.baseRent)}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setFormData(prev => ({ ...prev, baseRent: value }));
                        }}
                        onBlur={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value) {
                                const num = parseFloat(value);
                                // Auto-format: Nếu < 10000, nhân 1000 (ví dụ: 1800 → 1800000)
                                if (num > 0 && num < 10000) {
                                    setFormData(prev => ({ ...prev, baseRent: String(num * 1000) }));
                                }
                            }
                        }}
                        placeholder="VD: 3.000.000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Deposit */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Tiền cọc (VNĐ)
                    </label>
                    <input
                        type="text"
                        name="deposit"
                        value={formatCurrency(formData.deposit)}
                        onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            setFormData(prev => ({ ...prev, deposit: value }));
                        }}
                        onBlur={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            if (value) {
                                const num = parseFloat(value);
                                // Auto-format: Nếu < 10000, nhân 1000 (ví dụ: 1800 → 1800000)
                                if (num > 0 && num < 10000) {
                                    setFormData(prev => ({ ...prev, deposit: String(num * 1000) }));
                                }
                            }
                        }}
                        placeholder="VD: 3.000.000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Note */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Ghi chú
                    </label>
                    <textarea
                        name="note"
                        value={formData.note}
                        onChange={handleChange}
                        placeholder="Ghi chú về phòng..."
                        rows={3}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1] resize-none"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Buttons */}
                <div className="flex space-x-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    <button
                        type="submit"
                        className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditRoomModal;

