import React, { useState } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { type Tenant } from '../../types';
import { PRIMARY_COLOR } from '../../constants';

interface EditTenantModalProps {
    tenant: Tenant;
    onClose: () => void;
}

const EditTenantModal: React.FC<EditTenantModalProps> = ({ tenant, onClose }) => {
    const { updateTenant } = useAppData();
    const [formData, setFormData] = useState({
        fullName: tenant.fullName,
        phone: tenant.phone || '',
        idNumber: tenant.idNumber || '',
        note: tenant.note || ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.fullName.trim()) {
            alert('Vui lòng nhập họ tên!');
            return;
        }

        try {
            setIsSubmitting(true);

            await updateTenant(tenant.id, {
                fullName: formData.fullName.trim(),
                phone: formData.phone.trim() || undefined,
                idNumber: formData.idNumber.trim() || undefined,
                note: formData.note.trim() || undefined
            });

            alert('✅ Cập nhật thông tin khách thuê thành công!');
            onClose();
        } catch (error) {
            console.error('Error updating tenant:', error);
            alert('❌ Có lỗi xảy ra khi cập nhật!');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal title="Chỉnh Sửa Thông Tin Khách" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Họ tên <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="VD: Nguyễn Văn A"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        disabled={isSubmitting}
                    />
                </div>

                {/* Phone */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Số điện thoại
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="VD: 0901234567"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        disabled={isSubmitting}
                    />
                </div>

                {/* ID Number */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        CCCD/CMND
                    </label>
                    <input
                        type="text"
                        name="idNumber"
                        value={formData.idNumber}
                        onChange={handleChange}
                        placeholder="VD: 123456789"
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
                        placeholder="Ghi chú về khách thuê..."
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

export default EditTenantModal;

