import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { type Lease, type Tenant, type LeaseParticipant } from '../../types';
import { PRIMARY_COLOR } from '../../constants';
import AddTenantModal from './AddTenantModal';

interface AddSubTenantModalProps {
    lease: Lease;
    onClose: () => void;
}

const AddSubTenantModal: React.FC<AddSubTenantModalProps> = ({ lease, onClose }) => {
    const { tenants, updateLease } = useAppData();
    
    const [formData, setFormData] = useState({
        tenantId: '',
        joinDate: new Date().toISOString().split('T')[0]
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddTenantModal, setShowAddTenantModal] = useState(false);
    
    // Get available tenants (not already in this lease)
    const availableTenants = useMemo(() => {
        const participantIds = new Set(
            lease.participants?.map(p => p.tenantId) || [lease.tenantId]
        );
        
        const available = tenants.filter(t => !participantIds.has(t.id));
        
        // DEDUPLICATE by tenant ID (in case database has duplicates)
        const seen = new Set<number>();
        return available.filter(t => {
            if (seen.has(t.id)) return false;
            seen.add(t.id);
            return true;
        });
    }, [tenants, lease]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.tenantId) {
            alert('Vui lòng chọn người thuê!');
            return;
        }
        
        if (!formData.joinDate) {
            alert('Vui lòng chọn ngày vào!');
            return;
        }
        
        // Validate: joinDate must be >= lease.startDate
        if (formData.joinDate < lease.startDate) {
            alert('Ngày vào không thể trước ngày bắt đầu hợp đồng!');
            return;
        }
        
        try {
            setIsSubmitting(true);
            
            // Get current participants (or create from old tenantId)
            const currentParticipants: LeaseParticipant[] = lease.participants || [{
                tenantId: lease.tenantId,
                joinDate: lease.startDate,
                leaveDate: lease.endDate,
                isPrimary: true
            }];
            
            // Add new sub-tenant
            const newParticipant: LeaseParticipant = {
                tenantId: Number(formData.tenantId),
                joinDate: formData.joinDate,
                leaveDate: undefined,  // Still staying
                isPrimary: false       // Sub-tenant
            };
            
            const updatedParticipants = [...currentParticipants, newParticipant];
            
            // Update lease
            await updateLease(lease.id, {
                participants: updatedParticipants,
                numberOfPeople: updatedParticipants.length
            });
            
            const tenant = tenants.find(t => t.id === Number(formData.tenantId));
            alert(`✅ Đã thêm người ở ghép: ${tenant?.fullName}`);
            onClose();
        } catch (error) {
            console.error('Error adding sub-tenant:', error);
            alert('❌ Có lỗi khi thêm người ở ghép!');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <>
            <Modal title="Thêm Người Ở Ghép" onClose={onClose}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                        <p className="font-semibold mb-1">💡 Lưu ý:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                            <li>Tiền phòng sẽ tính theo số ngày ở thực tế</li>
                            <li>Người ở ghép phụ thuộc hợp đồng của người chính</li>
                            <li>Điện/nước chia đều cho tất cả người</li>
                        </ul>
                    </div>
                    
                    {/* Tenant Selection */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Chọn người <span className="text-red-500">*</span>
                        </label>
                        
                        <div className="flex space-x-2">
                            <select
                                name="tenantId"
                                value={formData.tenantId}
                                onChange={handleChange}
                                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                                required
                                disabled={isSubmitting}
                            >
                                <option value="">-- Chọn người --</option>
                                {availableTenants.map(tenant => (
                                    <option key={tenant.id} value={tenant.id}>
                                        {tenant.fullName} {tenant.phone ? `(${tenant.phone})` : ''}
                                    </option>
                                ))}
                            </select>
                            
                            <button
                                type="button"
                                onClick={() => setShowAddTenantModal(true)}
                                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-lg"
                                title="Thêm người mới"
                                disabled={isSubmitting}
                            >
                                +
                            </button>
                        </div>
                        
                        {availableTenants.length === 0 && (
                            <p className="text-xs text-amber-700 mt-1">
                                ⚠️ Không có người khả dụng. Bấm "+" để thêm mới.
                            </p>
                        )}
                    </div>
                    
                    {/* Join Date */}
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Ngày vào <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="joinDate"
                            value={formData.joinDate}
                            onChange={handleChange}
                            min={lease.startDate}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                            required
                            disabled={isSubmitting}
                        />
                        <p className="text-xs text-slate-600 mt-1">
                            Ngày bắt đầu ở ghép (tính tiền từ ngày này)
                        </p>
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
                            disabled={isSubmitting || availableTenants.length === 0}
                        >
                            {isSubmitting ? 'Đang thêm...' : 'Thêm người ở ghép'}
                        </button>
                    </div>
                </form>
            </Modal>
            
            {/* Sub-modal: Add Tenant */}
            {showAddTenantModal && (
                <AddTenantModal 
                    onClose={() => setShowAddTenantModal(false)}
                />
            )}
        </>
    );
};

export default AddSubTenantModal;

