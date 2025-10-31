import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { PRIMARY_COLOR } from '../../constants';
import AddTenantModal from './AddTenantModal';

interface AddLeaseModalProps {
    onClose: () => void;
}

const AddLeaseModal: React.FC<AddLeaseModalProps> = ({ onClose }) => {
    const { rooms, tenants, leases, addLease, settings, meters, readings, invoices, addReading } = useAppData();
    
    // Get available rooms (vacant, active, no active lease)
    const availableRooms = useMemo(() => {
        return rooms.filter(room => {
            if (!room.isActive) return false;
            const hasActiveLease = leases.some(
                l => l.roomId === room.id && l.status === 'active'
            );
            return !hasActiveLease;
        });
    }, [rooms, leases]);
    
    // Get available tenants (no active lease AND not participating in any active lease) - with deduplication
    const availableTenants = useMemo(() => {
        // First, deduplicate tenants by ID (keep first occurrence)
        const seenIds = new Set<number>();
        const uniqueTenants = tenants.filter(tenant => {
            if (seenIds.has(tenant.id)) {
                return false; // Skip duplicate
            }
            seenIds.add(tenant.id);
            return true;
        });
        
        // Then filter for tenants without active lease AND not participating in any active lease
        return uniqueTenants.filter(tenant => {
            // Check if tenant has active lease as primary
            const hasActiveLease = leases.some(
                l => l.tenantId === tenant.id && l.status === 'active'
            );
            
            if (hasActiveLease) return false;
            
            // Check if tenant is participating in any active lease (as sub-tenant or primary)
            const isParticipating = leases.some(lease => {
                if (lease.status !== 'active') return false;
                if (!lease.participants || lease.participants.length === 0) return false;
                
                // Check if tenant is in participants and hasn't left yet (leaveDate is undefined)
                return lease.participants.some(p => 
                    p.tenantId === tenant.id && !p.leaveDate
                );
            });
            
            return !isParticipating;
        });
    }, [tenants, leases]);
    
    const [formData, setFormData] = useState({
        roomId: '',
        tenantId: '',
        startDate: new Date().toISOString().split('T')[0],
        monthlyRent: '',
        wifiFee: (settings.wifiPrice || 0).toString(),
        trashFee: (settings.trashPrice || 0).toString(),
        deposit: '', // Tiền cọc
        note: '',
        initialElectric: '',
        initialWater: ''
    });
    
    // Payment Mode - default from settings
    const [paymentMode, setPaymentMode] = useState<'advance' | 'deposit'>(
        settings.defaultPaymentMode || 'advance'
    );
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showAddTenantModal, setShowAddTenantModal] = useState(false);
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    
    // Helper: Get period string from date (YYYY-MM)
    const getPeriodString = (dateStr: string): string => {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${year}-${month}`;
    };
    
    // Auto-fill monthly rent and deposit when room is selected
    useEffect(() => {
        if (formData.roomId) {
            const room = rooms.find(r => r.id === Number(formData.roomId));
            if (room) {
                setFormData(prev => ({
                    ...prev,
                    monthlyRent: room.baseRent.toString(),
                    deposit: room.deposit.toString()
                }));
            }
        } else {
            setFormData(prev => ({
                ...prev,
                monthlyRent: '',
                deposit: ''
            }));
        }
    }, [formData.roomId, rooms]);
    
    // Auto-fill initial readings when room is selected
    useEffect(() => {
        if (!formData.roomId) {
            setFormData(prev => ({
                ...prev,
                initialElectric: '',
                initialWater: ''
            }));
            return;
        }
        
        const roomId = Number(formData.roomId);
        
        // Get meters for this room
        const electricMeter = meters.find(m => m.roomId === roomId && m.type === 'electric');
        const waterMeter = meters.find(m => m.roomId === roomId && m.type === 'water');
        
        // Get last invoice for this room (from any lease)
        const roomLeases = leases.filter(l => l.roomId === roomId);
        const roomInvoices = invoices
            .filter(inv => roomLeases.some(l => l.id === inv.leaseId))
            .sort((a, b) => b.period.localeCompare(a.period));
        
        if (roomInvoices.length === 0) {
            // No previous invoice, default to 0
            setFormData(prev => ({
                ...prev,
                initialElectric: '0',
                initialWater: '0'
            }));
            return;
        }
        
        const lastInvoice = roomInvoices[0];
        
        // Get readings from that period
        const electricReading = readings.find(
            r => r.meterId === electricMeter?.id && r.period === lastInvoice.period
        );
        const waterReading = readings.find(
            r => r.meterId === waterMeter?.id && r.period === lastInvoice.period
        );
        
        setFormData(prev => ({
            ...prev,
            initialElectric: electricReading?.value.toString() || '0',
            initialWater: waterReading?.value.toString() || '0'
        }));
    }, [formData.roomId, meters, leases, invoices, readings]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        if (!formData.roomId) {
            alert('Vui lòng chọn phòng!');
            return;
        }
        
        if (!formData.tenantId) {
            alert('Vui lòng chọn người thuê!');
            return;
        }
        
        const rent = parseFloat(formData.monthlyRent);
        if (isNaN(rent) || rent <= 0) {
            alert('Tiền thuê phải lớn hơn 0!');
            return;
        }
        
        const wifi = parseFloat(formData.wifiFee);
        const trash = parseFloat(formData.trashFee);
        
        if (isNaN(wifi) || wifi < 0) {
            alert('Phí wifi không hợp lệ!');
            return;
        }
        
        if (isNaN(trash) || trash < 0) {
            alert('Phí rác không hợp lệ!');
            return;
        }
        
        const deposit = parseFloat(formData.deposit);
        if (isNaN(deposit) || deposit < 0) {
            alert('Tiền cọc không hợp lệ!');
            return;
        }
        
        // Validate initial readings
        const initElec = parseFloat(formData.initialElectric);
        const initWater = parseFloat(formData.initialWater);
        
        if (isNaN(initElec) || initElec < 0) {
            alert('Chỉ số điện ban đầu không hợp lệ!');
            return;
        }
        
        if (isNaN(initWater) || initWater < 0) {
            alert('Chỉ số nước ban đầu không hợp lệ!');
            return;
        }
        
        try {
            setIsSubmitting(true);
            
            // 1. Create lease
            await addLease({
                roomId: Number(formData.roomId),
                tenantId: Number(formData.tenantId),
                startDate: formData.startDate,
                endDate: undefined, // No end date - open-ended lease
                monthlyRent: rent,
                wifiFee: wifi,
                trashFee: trash,
                deposit: deposit,
                paymentMode: paymentMode, // NEW: Kiểu thanh toán
                status: 'active',
                note: formData.note.trim() || undefined,
                // Initialize participants array for co-tenant feature
                participants: [{
                    tenantId: Number(formData.tenantId),
                    isPrimary: true,
                    joinDate: formData.startDate,
                    leaveDate: undefined
                }],
                numberOfPeople: 1
            });
            
            // 2. Create initial readings
            const roomId = Number(formData.roomId);
            const period = getPeriodString(formData.startDate);
            
            const electricMeter = meters.find(m => m.roomId === roomId && m.type === 'electric');
            const waterMeter = meters.find(m => m.roomId === roomId && m.type === 'water');
            
            if (electricMeter) {
                await addReading({
                    meterId: electricMeter.id,
                    period: period,
                    value: initElec
                });
            }
            
            if (waterMeter) {
                await addReading({
                    meterId: waterMeter.id,
                    period: period,
                    value: initWater
                });
            }
            
            const room = rooms.find(r => r.id === roomId);
            const tenant = tenants.find(t => t.id === Number(formData.tenantId));
            
            alert(`✅ Tạo hợp đồng thành công!\n\n${tenant?.fullName} thuê ${room?.name}\n\nĐã ghi chỉ số ban đầu:\n⚡ Điện: ${initElec} kWh\n💧 Nước: ${initWater} m³`);
            
            // Wait for state to propagate before closing
            setTimeout(() => {
                console.log('🔄 Closing modal after state propagation');
                onClose();
            }, 500);
        } catch (error) {
            console.error('Error creating lease:', error);
            alert('❌ Có lỗi xảy ra khi tạo hợp đồng!');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal title="Tạo Hợp Đồng Thuê Mới" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Room Selection */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Chọn phòng <span className="text-red-500">*</span>
                    </label>
                    {availableRooms.length === 0 ? (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
                            ⚠️ Không có phòng trống nào. Vui lòng thêm phòng hoặc kết thúc hợp đồng cũ.
                        </div>
                    ) : (
                        <select
                            name="roomId"
                            value={formData.roomId}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                            required
                            disabled={isSubmitting}
                        >
                            <option value="">-- Chọn phòng --</option>
                            {availableRooms.map(room => (
                                <option key={room.id} value={room.id}>
                                    {room.name} - {formatCurrency(room.baseRent)}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                
                {/* Tenant Selection */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Chọn người thuê <span className="text-red-500">*</span>
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
                            <option value="">-- Chọn người thuê --</option>
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
                            title="Thêm người thuê mới"
                            disabled={isSubmitting}
                        >
                            +
                        </button>
                    </div>
                    
                    {availableTenants.length === 0 && (
                        <p className="text-xs text-amber-700 mt-1">
                            ⚠️ Không có người thuê khả dụng. Bấm "+" để thêm mới.
                        </p>
                    )}
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
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        required
                        disabled={isSubmitting}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        💡 Hợp đồng không có ngày kết thúc (thuê dài hạn)
                    </p>
                </div>
                
                {/* Initial Readings */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <h4 className="text-sm font-semibold text-yellow-800 mb-1 flex items-center">
                        ⚡💧 Chỉ Số Điện/Nước Ban Đầu
                    </h4>
                    <p className="text-xs text-yellow-700 mb-3">
                        Ghi chỉ số đồng hồ tại thời điểm bắt đầu thuê (tự động từ lần cuối)
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-yellow-800 mb-1">
                                ⚡ Điện (kWh) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="initialElectric"
                                value={formData.initialElectric}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                                step="1"
                                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1] bg-white"
                                required
                                disabled={isSubmitting || !formData.roomId}
                            />
                        </div>
                        
                        <div>
                            <label className="block text-xs font-semibold text-yellow-800 mb-1">
                                💧 Nước (m³) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                name="initialWater"
                                value={formData.initialWater}
                                onChange={handleChange}
                                placeholder="0"
                                min="0"
                                step="0.1"
                                className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1] bg-white"
                                required
                                disabled={isSubmitting || !formData.roomId}
                            />
                        </div>
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
                        placeholder="VD: 2500000"
                        min="0"
                        step="1000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        required
                        disabled={isSubmitting}
                    />
                </div>
                
                {/* Deposit - Label thay đổi theo Payment Mode */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        {paymentMode === 'advance' ? (
                            <>💰 Tiền ứng trước (đ) <span className="text-red-500">*</span></>
                        ) : (
                            <>💰 Tiền cọc cố định (đ) <span className="text-red-500">*</span></>
                        )}
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
                        placeholder="VD: 1700000"
                        min="0"
                        step="10000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        required
                        disabled={isSubmitting || !formData.roomId}
                    />
                    <p className="text-xs text-slate-600 mt-1">
                        {paymentMode === 'advance' 
                            ? '💡 Số tiền khách ứng trước, dùng trừ vào các kỳ tiếp theo'
                            : '💡 Số tiền ký quỹ, giữ nguyên không tính doanh thu'
                        }
                    </p>
                </div>
                
                {/* Payment Mode */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        💳 Kiểu thanh toán <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={paymentMode}
                        onChange={(e) => setPaymentMode(e.target.value as 'advance' | 'deposit')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        disabled={isSubmitting}
                    >
                        <option value="advance">Đóng trước – Ở sau</option>
                        <option value="deposit">Cọc cố định (ký quỹ)</option>
                    </select>
                    <p className="text-xs text-slate-600 mt-1">
                        {paymentMode === 'advance' 
                            ? '💡 Khách luôn giữ số dư = giá phòng tháng kế (mặc định từ Cài đặt)'
                            : '💡 Thu đủ tiền kỳ hiện tại, tiền cọc không đụng (mặc định từ Cài đặt)'
                        }
                    </p>
                </div>
                
                {/* Service Fees */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Phí wifi (đ)
                        </label>
                        <input
                            type="number"
                            name="wifiFee"
                            value={formData.wifiFee}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            step="1000"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                            disabled={isSubmitting}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">
                            Phí rác (đ)
                        </label>
                        <input
                            type="number"
                            name="trashFee"
                            value={formData.trashFee}
                            onChange={handleChange}
                            placeholder="0"
                            min="0"
                            step="1000"
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                            disabled={isSubmitting}
                        />
                    </div>
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
                        placeholder="Ghi chú về hợp đồng..."
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1] resize-none"
                        disabled={isSubmitting}
                    />
                </div>
                
                {/* Info Box */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                    <p className="font-semibold mb-1">💡 Lưu ý:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                        <li>Hợp đồng sẽ được tạo với trạng thái "active"</li>
                        <li>Chỉ số điện/nước được ghi tự động và có thể chỉnh sửa</li>
                    </ul>
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
                        disabled={isSubmitting || availableRooms.length === 0}
                    >
                        {isSubmitting ? 'Đang tạo...' : 'Tạo hợp đồng'}
                    </button>
                </div>
            </form>
            
            {/* Sub-modal: Add Tenant */}
            {showAddTenantModal && (
                <AddTenantModal 
                    onClose={() => setShowAddTenantModal(false)}
                />
            )}
        </Modal>
    );
};

export default AddLeaseModal;

