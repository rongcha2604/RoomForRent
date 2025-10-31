import React, { useState } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { type Lease, type Room, type Tenant } from '../../types';
import { PRIMARY_COLOR } from '../../constants';

interface EditLeaseModalProps {
    lease: Lease;
    room: Room;
    tenant: Tenant;
    onClose: () => void;
}

const EditLeaseModal: React.FC<EditLeaseModalProps> = ({ lease, room, tenant, onClose }) => {
    const { updateLease, invoices } = useAppData();
    
    const [formData, setFormData] = useState({
        monthlyRent: lease.monthlyRent.toString(),
        wifiFee: lease.wifiFee.toString(),
        trashFee: lease.trashFee.toString(),
        deposit: lease.deposit.toString(),
        startDate: lease.startDate,
        note: lease.note || ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (isSubmitting) return;
        
        // Validation
        const rent = parseFloat(formData.monthlyRent);
        if (isNaN(rent) || rent <= 0) {
            alert('❌ Tiền thuê phải lớn hơn 0!');
            return;
        }
        
        const wifi = parseFloat(formData.wifiFee);
        if (isNaN(wifi) || wifi < 0) {
            alert('❌ Phí wifi không hợp lệ!');
            return;
        }
        
        const trash = parseFloat(formData.trashFee);
        if (isNaN(trash) || trash < 0) {
            alert('❌ Phí rác không hợp lệ!');
            return;
        }
        
        const deposit = parseFloat(formData.deposit);
        if (isNaN(deposit) || deposit < 0) {
            alert('❌ Tiền cọc không hợp lệ!');
            return;
        }
        
        // Warning if changing start date and invoices exist
        if (formData.startDate !== lease.startDate) {
            const hasInvoices = invoices.some(inv => inv.leaseId === lease.id);
            if (hasInvoices) {
                const confirmed = confirm(
                    '⚠️ CẢNH BÁO: Hợp đồng này đã có hóa đơn!\n\n' +
                    'Thay đổi ngày bắt đầu có thể làm sai lệch dữ liệu hóa đơn và tính toán pro-rata.\n\n' +
                    'Bạn có chắc chắn muốn thay đổi?'
                );
                if (!confirmed) return;
            }
        }
        
        try {
            setIsSubmitting(true);
            
            // Update participants if startDate changed (sync primary tenant's joinDate)
            let updatedParticipants = lease.participants;
            if (formData.startDate !== lease.startDate) {
                updatedParticipants = lease.participants.map(p => 
                    p.isPrimary ? { ...p, joinDate: formData.startDate } : p
                );
                console.log('🔄 Updated primary tenant joinDate to match startDate:', formData.startDate);
            }
            
            await updateLease(lease.id, {
                monthlyRent: rent,
                wifiFee: wifi,
                trashFee: trash,
                deposit: deposit,
                startDate: formData.startDate,
                participants: updatedParticipants,
                note: formData.note.trim() || undefined
            });
            
            console.log('✅ Lease updated successfully:', lease.id);
            alert('✅ Đã cập nhật hợp đồng thành công!');
            
            // Wait for state to propagate before closing
            setTimeout(() => {
                console.log('🔄 Closing modal after state propagation');
                onClose();
            }, 500);
        } catch (error) {
            console.error('Error updating lease:', error);
            alert('❌ Có lỗi khi cập nhật hợp đồng! Vui lòng thử lại.');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal title="✏️ Chỉnh sửa hợp đồng" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Current Info (Read-only) */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">📋 Thông tin hiện tại</h3>
                    <div className="text-xs space-y-1">
                        <p><span className="text-slate-600">Phòng:</span> <span className="font-semibold">{room.name}</span></p>
                        <p><span className="text-slate-600">Người thuê:</span> <span className="font-semibold">{tenant.fullName}</span></p>
                        <p className="text-slate-500 italic mt-2">⚠️ Không thể đổi phòng hoặc người thuê</p>
                    </div>
                </div>
                
                {/* Monthly Rent */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Tiền thuê/tháng (đ) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="monthlyRent"
                        value={formData.monthlyRent}
                        onChange={handleChange}
                        onBlur={(e) => {
                            const val = e.target.value;
                            if (val) {
                                const num = parseFloat(val);
                                // Auto-format: Nếu < 10000, nhân 1000 (ví dụ: 1800 → 1800000)
                                if (num > 0 && num < 10000) {
                                    setFormData(prev => ({ ...prev, monthlyRent: String(num * 1000) }));
                                }
                            }
                        }}
                        required
                        min="0"
                        step="1000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">Hiện tại: {formatCurrency(lease.monthlyRent)}</p>
                </div>
                
                {/* Fees Row */}
                <div className="grid grid-cols-2 gap-3">
                    {/* WiFi Fee */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Phí wifi (đ)
                        </label>
                        <input
                            type="number"
                            name="wifiFee"
                            value={formData.wifiFee}
                            onChange={handleChange}
                            min="0"
                            step="1000"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                    
                    {/* Trash Fee */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Phí rác (đ)
                        </label>
                        <input
                            type="number"
                            name="trashFee"
                            value={formData.trashFee}
                            onChange={handleChange}
                            min="0"
                            step="1000"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                    </div>
                </div>
                
                {/* Deposit */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Tiền cọc (đ) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        name="deposit"
                        value={formData.deposit}
                        onChange={handleChange}
                        onBlur={(e) => {
                            const val = e.target.value;
                            if (val) {
                                const num = parseFloat(val);
                                // Auto-format: Nếu < 10000, nhân 1000 (ví dụ: 1800 → 1800000)
                                if (num > 0 && num < 10000) {
                                    setFormData(prev => ({ ...prev, deposit: String(num * 1000) }));
                                }
                            }
                        }}
                        required
                        min="0"
                        step="1000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    <p className="text-xs text-slate-500 mt-1">Hiện tại: {formatCurrency(lease.deposit)}</p>
                </div>
                
                {/* Start Date */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Ngày bắt đầu <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                    {formData.startDate !== lease.startDate && (
                        <p className="text-xs text-orange-600 mt-1 flex items-start">
                            <span className="mr-1">⚠️</span>
                            <span>Cẩn thận khi đổi ngày bắt đầu - có thể ảnh hưởng đến hóa đơn và tính toán!</span>
                        </p>
                    )}
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
                        rows={3}
                        placeholder="Thêm ghi chú về hợp đồng (nếu có)..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                    />
                </div>
                
                {/* Submit Buttons */}
                <div className="flex space-x-3 pt-2">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                        {isSubmitting ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                    >
                        Hủy
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default EditLeaseModal;

