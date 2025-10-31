import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { type Room, type Lease } from '../../types';
import { PRIMARY_COLOR } from '../../constants';
import { buildInvoice, daysBetween } from '../../services/billing';
import { 
    createInvoiceDraft, 
    convertToAppInvoice,
    formatPeriod
} from '../../services/billingAdapter';
import {
    getLastReadingFromInvoice,
    getNextInvoicePeriodStart,
    formatCurrency,
    formatDate,
    getPeriodString,
    hasUnpaidInvoices
} from '../../services/invoiceHelpers';

interface CreateSingleInvoiceModalProps {
    room: Room;
    lease: Lease;
    onClose: () => void;
}

const CreateSingleInvoiceModal: React.FC<CreateSingleInvoiceModalProps> = ({ 
    room, 
    lease, 
    onClose 
}) => {
    const { meters, readings, invoices, tenants, addInvoice, addReading } = useAppData();
    
    // Get meters
    const electricMeter = meters.find(m => m.roomId === room.id && m.type === 'electric');
    const waterMeter = meters.find(m => m.roomId === room.id && m.type === 'water');
    
    // Get last readings from last invoice (FIX: Must use invoice-based readings)
    const lastElectricReading = getLastReadingFromInvoice(lease.id, electricMeter?.id, invoices, readings);
    const lastWaterReading = getLastReadingFromInvoice(lease.id, waterMeter?.id, invoices, readings);
    
    // Period calculation
    const periodStart = getNextInvoicePeriodStart(lease, invoices);
    const today = new Date().toISOString().slice(0, 10);
    
    // State
    const [endDate, setEndDate] = useState(today);
    const [newElectricReading, setNewElectricReading] = useState('');
    const [newWaterReading, setNewWaterReading] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Get tenant
    const tenant = tenants.find(t => t.id === lease.tenantId);
    
    // Check for unpaid invoices
    const hasUnpaid = hasUnpaidInvoices(lease.id, invoices);
    
    // Calculate preview
    const preview = useMemo(() => {
        const newElec = parseFloat(newElectricReading);
        const newWater = parseFloat(newWaterReading);
        
        console.log('CreateSingleInvoice Debug:', {
            newElec,
            newWater,
            lastElectricReading,
            lastWaterReading,
            periodStart,
            endDate
        });
        
        if (isNaN(newElec) || isNaN(newWater)) {
            console.log('Invalid readings: isNaN');
            return null;
        }
        
        // Allow readings even if no previous reading (use 0)
        const prevElec = lastElectricReading?.value || 0;
        const prevWater = lastWaterReading?.value || 0;
        
        if (newElec < prevElec || newWater < prevWater) {
            console.log('Readings decreased');
            return null;
        }
        
        try {
            const period = {
                start: periodStart,
                end: endDate
            };
            
            // Create dummy readings if none exist
            const dummyElecReading = { id: 0, meterId: electricMeter?.id || 0, period: '', value: prevElec };
            const dummyWaterReading = { id: 0, meterId: waterMeter?.id || 0, period: '', value: prevWater };
            
            const draft = createInvoiceDraft({
                lease,
                room,
                period,
                electricMeter,
                waterMeter,
                prevElectricReading: lastElectricReading || dummyElecReading,
                currElectricReading: { ...(lastElectricReading || dummyElecReading), value: newElec },
                prevWaterReading: lastWaterReading || dummyWaterReading,
                currWaterReading: { ...(lastWaterReading || dummyWaterReading), value: newWater }
            });
            
            const result = buildInvoice(draft);
            const days = daysBetween(period);
            
            const previewResult = {
                result,
                days,
                period,
                electricUsage: newElec - prevElec,
                waterUsage: newWater - prevWater
            };
            
            console.log('Preview calculated successfully:', previewResult);
            return previewResult;
        } catch (error) {
            console.error('Error calculating preview:', error);
            return null;
        }
    }, [newElectricReading, newWaterReading, endDate, periodStart, lease, room, electricMeter, waterMeter, lastElectricReading, lastWaterReading]);
    
    const handleSubmit = async () => {
        // Guard: Prevent double submission
        if (isSubmitting) {
            console.log('⚠️ Already submitting, ignoring duplicate call');
            return;
        }
        
        if (!preview) {
            alert('Vui lòng nhập đầy đủ chỉ số điện nước!');
            return;
        }
        
        // Validation
        const newElec = parseFloat(newElectricReading);
        const newWater = parseFloat(newWaterReading);
        
        if (newElec < (lastElectricReading?.value || 0)) {
            alert('⚠️ Chỉ số điện mới không được nhỏ hơn chỉ số cũ!');
            return;
        }
        
        if (newWater < (lastWaterReading?.value || 0)) {
            alert('⚠️ Chỉ số nước mới không được nhỏ hơn chỉ số cũ!');
            return;
        }
        
        if (preview.days < 1) {
            alert('⚠️ Kỳ hóa đơn phải có ít nhất 1 ngày!');
            return;
        }
        
        // Confirmation
        let confirmMsg = `Xác nhận tạo hóa đơn?\n\n`;
        confirmMsg += `Phòng: ${room.name}\n`;
        confirmMsg += `Khách: ${tenant?.fullName || 'N/A'}\n`;
        confirmMsg += `Kỳ: ${formatPeriod(preview.period)} (${preview.days} ngày)\n`;
        confirmMsg += `Tổng: ${formatCurrency(preview.result.total)}\n\n`;
        confirmMsg += `Bạn chắc chắn muốn tạo hóa đơn này?`;
        
        if (!confirm(confirmMsg)) return;
        
        try {
            setIsSubmitting(true);
            console.log('🟢 [MODAL] Creating single invoice...');
            
            // Create invoice (without auto-reload to prevent race condition)
            const periodStr = getPeriodString(endDate);
            const invoice = convertToAppInvoice(preview.result, lease.id, periodStr);
            console.log('🟢 [MODAL] Calling addInvoice...');
            await addInvoice(invoice);
            console.log('🟢 [MODAL] Invoice added successfully');
            
            // Save readings (without auto-reload to prevent race condition)
            console.log('🟢 [MODAL] Adding readings...');
            if (electricMeter) {
                await addReading({
                    meterId: electricMeter.id,
                    period: periodStr,
                    value: newElec
                });
                console.log('🟢 [MODAL] Electric reading added:', newElec, 'kWh');
            }
            
            if (waterMeter) {
                await addReading({
                    meterId: waterMeter.id,
                    period: periodStr,
                    value: newWater
                });
                console.log('🟢 [MODAL] Water reading added:', newWater, 'm³');
            }
            
            console.log('🟢 [MODAL] All operations completed, data should be in DB');
            alert(`✅ Đã tạo hóa đơn thành công!\n\nTổng: ${formatCurrency(preview.result.total)}\nKỳ: ${formatPeriod(preview.period)} (${preview.days} ngày)`);
            
            // Wait for state to propagate + close parent modal to force refresh
            setTimeout(() => {
                console.log('🔄 Closing all modals to force data refresh');
                onClose();
            }, 800); // Increased delay to ensure all loadAllData() calls complete
        } catch (error) {
            console.error('❌ [MODAL] Error creating invoice:', error);
            alert('❌ Có lỗi xảy ra khi tạo hóa đơn!');
        } finally {
            setIsSubmitting(false);
            console.log('🟢 [MODAL] Submit finished, isSubmitting reset');
        }
    };
    
    return (
        <Modal title="📝 Tạo Hóa Đơn Riêng" onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Room & Tenant Info */}
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-sm space-y-1">
                        <p><span className="font-semibold">Phòng:</span> {room.name}</p>
                        <p><span className="font-semibold">Khách:</span> {tenant?.fullName || 'N/A'}</p>
                        <p><span className="font-semibold">Giá thuê:</span> {formatCurrency(lease.monthlyRent)}/tháng</p>
                    </div>
                </div>
                
                {/* Warning for unpaid invoices */}
                {hasUnpaid && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-800">
                            ⚠️ Có hóa đơn chưa thanh toán
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            Vẫn có thể tạo hóa đơn mới, nhưng nên thu tiền các hóa đơn cũ trước.
                        </p>
                    </div>
                )}
                
                {/* Period */}
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">
                        Kỳ hóa đơn
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-600">Từ ngày:</label>
                            <input
                                type="date"
                                value={periodStart}
                                disabled
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-600">Đến ngày:</label>
                            <input
                                type="date"
                                value={endDate}
                                max={today}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                            />
                        </div>
                    </div>
                    {preview && (
                        <p className="text-xs text-slate-600">
                            → {preview.days} ngày ({formatDate(periodStart)} - {formatDate(endDate)})
                        </p>
                    )}
                </div>
                
                {/* Electric Reading */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        ⚡ Chỉ số điện (kWh)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-600">Cũ:</label>
                            <input
                                type="number"
                                value={lastElectricReading?.value || 0}
                                disabled
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-600">Mới:</label>
                            <input
                                type="number"
                                value={newElectricReading}
                                onChange={(e) => setNewElectricReading(e.target.value)}
                                placeholder="Nhập chỉ số mới"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    {preview && preview.electricUsage !== undefined && (
                        <p className="text-xs text-slate-600 mt-1">
                            Dùng: {preview.electricUsage.toFixed(1)} kWh
                        </p>
                    )}
                </div>
                
                {/* Water Reading */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        💧 Chỉ số nước (m³)
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs text-slate-600">Cũ:</label>
                            <input
                                type="number"
                                value={lastWaterReading?.value || 0}
                                disabled
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-slate-600">Mới:</label>
                            <input
                                type="number"
                                value={newWaterReading}
                                onChange={(e) => setNewWaterReading(e.target.value)}
                                placeholder="Nhập chỉ số mới"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    {preview && preview.waterUsage !== undefined && (
                        <p className="text-xs text-slate-600 mt-1">
                            Dùng: {preview.waterUsage.toFixed(1)} m³
                        </p>
                    )}
                </div>
                
                {/* Preview */}
                {preview && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-blue-900 mb-2">📋 Preview Hóa Đơn:</p>
                        <div className="text-xs space-y-1 text-blue-800">
                            {preview.result.lines.map((line, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>• {line.note || line.code}</span>
                                    <span className="font-semibold">{formatCurrency(line.amount)}</span>
                                </div>
                            ))}
                            <div className="border-t border-blue-300 mt-2 pt-2 flex justify-between">
                                <span className="font-bold">TỔNG CỘNG:</span>
                                <span className="font-bold text-base" style={{ color: PRIMARY_COLOR }}>
                                    {formatCurrency(preview.result.total)}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Buttons */}
                <div className="flex space-x-3 pt-2">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                        disabled={isSubmitting}
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!preview || isSubmitting}
                        className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:bg-slate-400"
                        style={{ backgroundColor: preview ? PRIMARY_COLOR : undefined }}
                    >
                        {isSubmitting ? 'Đang tạo...' : 'Tạo Hóa Đơn'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CreateSingleInvoiceModal;

