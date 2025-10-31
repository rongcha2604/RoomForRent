import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { type Room, type Lease, type Tenant } from '../../types';
import { PRIMARY_COLOR } from '../../constants';
import { buildInvoice, settleWithDeposit, daysBetween } from '../../services/billing';
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
    getUnpaidInvoiceCount,
    getTotalUnpaidAmount
} from '../../services/invoiceHelpers';

interface TerminateLeaseModalProps {
    room: Room;
    lease: Lease;
    tenant: Tenant;
    onClose: () => void;
}

const TerminateLeaseModal: React.FC<TerminateLeaseModalProps> = ({ 
    room, 
    lease, 
    tenant,
    onClose 
}) => {
    const { meters, readings, invoices, addInvoice, addReading, updateLease } = useAppData();
    
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
    const [moveOutDate, setMoveOutDate] = useState(today);
    const [finalElectricReading, setFinalElectricReading] = useState('');
    const [finalWaterReading, setFinalWaterReading] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Unpaid invoices info
    const unpaidCount = getUnpaidInvoiceCount(lease.id, invoices);
    const unpaidTotal = getTotalUnpaidAmount(lease.id, invoices);
    
    // Calculate final invoice and settlement
    const calculation = useMemo(() => {
        const newElec = parseFloat(finalElectricReading);
        const newWater = parseFloat(finalWaterReading);
        
        console.log('TerminateLease Debug:', {
            newElec,
            newWater,
            lastElectricReading,
            lastWaterReading,
            periodStart,
            moveOutDate
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
                end: moveOutDate
            };
            
            const days = daysBetween(period);
            if (days < 1) {
                console.log('Days < 1');
                return null;
            }
            
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
            
            const invoiceResult = buildInvoice(draft);
            
            // Settle with deposit
            const settlement = settleWithDeposit(invoiceResult.total, lease.deposit);
            
            const calcResult = {
                invoiceResult,
                settlement,
                days,
                period,
                electricUsage: newElec - prevElec,
                waterUsage: newWater - prevWater
            };
            
            console.log('Calculation successful:', calcResult);
            return calcResult;
        } catch (error) {
            console.error('Error calculating termination:', error);
            return null;
        }
    }, [finalElectricReading, finalWaterReading, moveOutDate, periodStart, lease, room, electricMeter, waterMeter, lastElectricReading, lastWaterReading]);
    
    const handleTerminate = async () => {
        if (!calculation) {
            alert('Vui lòng nhập đầy đủ thông tin!');
            return;
        }
        
        // Validation
        const newElec = parseFloat(finalElectricReading);
        const newWater = parseFloat(finalWaterReading);
        
        if (newElec < (lastElectricReading?.value || 0)) {
            alert('⚠️ Chỉ số điện cuối không được nhỏ hơn chỉ số cũ!');
            return;
        }
        
        if (newWater < (lastWaterReading?.value || 0)) {
            alert('⚠️ Chỉ số nước cuối không được nhỏ hơn chỉ số cũ!');
            return;
        }
        
        if (moveOutDate < lease.startDate) {
            alert('⚠️ Ngày dọn đi không thể trước ngày bắt đầu thuê!');
            return;
        }
        
        if (calculation.days < 1) {
            alert('⚠️ Kỳ hóa đơn phải có ít nhất 1 ngày!');
            return;
        }
        
        // Build confirmation message (simplified)
        let confirmMsg = `Xác nhận kết thúc hợp đồng?\n\n`;
        confirmMsg += `Phòng: ${room.name}\n`;
        confirmMsg += `Khách: ${tenant.fullName}\n`;
        confirmMsg += `Kỳ cuối: ${formatPeriod(calculation.period)} (${calculation.days} ngày)\n`;
        confirmMsg += `Hóa đơn cuối: ${formatCurrency(calculation.invoiceResult.total)}\n`;
        
        if (calculation.settlement.refund > 0) {
            confirmMsg += `→ Trả lại khách: ${formatCurrency(calculation.settlement.refund)} ✅\n`;
        } else if (calculation.settlement.collectMore > 0) {
            confirmMsg += `→ Khách cần bù: ${formatCurrency(calculation.settlement.collectMore)} ⚠️\n`;
        } else {
            confirmMsg += `→ Quyết toán đủ (0đ) ✅\n`;
        }
        
        confirmMsg += `\nSau khi xác nhận:\n`;
        confirmMsg += `• Tạo hóa đơn cuối kỳ\n`;
        confirmMsg += `• Chuyển hợp đồng sang "Kết thúc"\n`;
        confirmMsg += `• Phòng sẽ trống\n`;
        
        if (unpaidCount > 0) {
            confirmMsg += `\n⚠️ Lưu ý: Có ${unpaidCount} hóa đơn cũ chưa trả (${formatCurrency(unpaidTotal)})\n`;
        }
        
        confirmMsg += `\nBạn chắc chắn muốn kết thúc?`;
        
        if (!confirm(confirmMsg)) return;
        
        try {
            setIsSubmitting(true);
            
            console.log('🔍 Starting lease termination for lease ID:', lease.id);
            
            // 1. Create final invoice
            const periodStr = getPeriodString(moveOutDate);
            const finalInvoice = convertToAppInvoice(calculation.invoiceResult, lease.id, periodStr);
            
            console.log('📝 Creating final invoice:', finalInvoice);
            await addInvoice(finalInvoice);
            console.log('✅ Invoice created successfully');
            
            // 2. Save final readings
            if (electricMeter) {
                console.log('⚡ Creating electric reading:', { meterId: electricMeter.id, period: periodStr, value: newElec });
                await addReading({
                    meterId: electricMeter.id,
                    period: periodStr,
                    value: newElec
                });
                console.log('✅ Electric reading created');
            }
            
            if (waterMeter) {
                console.log('💧 Creating water reading:', { meterId: waterMeter.id, period: periodStr, value: newWater });
                await addReading({
                    meterId: waterMeter.id,
                    period: periodStr,
                    value: newWater
                });
                console.log('✅ Water reading created');
            }
            
            // 3. Update lease to inactive
            console.log('🔄 Updating lease status to inactive:', { leaseId: lease.id, status: 'inactive', endDate: moveOutDate });
            await updateLease(lease.id, {
                status: 'inactive',
                endDate: moveOutDate
            });
            console.log('✅ Lease updated successfully');
            
            // CRITICAL: Wait for state to propagate before closing modal
            console.log('⏳ Waiting for state to propagate...');
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('✅ State propagation complete');
            
            // 4. Show success message
            let successMsg = `✅ Đã kết thúc hợp đồng thành công!\n\n`;
            successMsg += `Hóa đơn cuối: ${formatCurrency(calculation.invoiceResult.total)}\n`;
            successMsg += `Kỳ: ${formatPeriod(calculation.period)} (${calculation.days} ngày)\n\n`;
            successMsg += `QUYẾT TOÁN CỌC:\n`;
            successMsg += `Tiền cọc: ${formatCurrency(lease.deposit)}\n`;
            successMsg += `Trừ hóa đơn: -${formatCurrency(calculation.invoiceResult.total)}\n`;
            
            if (calculation.settlement.refund > 0) {
                successMsg += `\n→ Trả lại khách: ${formatCurrency(calculation.settlement.refund)} ✅`;
            } else if (calculation.settlement.collectMore > 0) {
                successMsg += `\n→ Khách nợ thêm: ${formatCurrency(calculation.settlement.collectMore)} ⚠️`;
            } else {
                successMsg += `\n→ Quyết toán đủ (0đ) ✅`;
            }
            
            alert(successMsg);
            onClose();
        } catch (error) {
            console.error('❌ Error terminating lease:', error);
            alert('❌ Có lỗi xảy ra khi kết thúc hợp đồng!');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    return (
        <Modal title="🏁 Kết Thúc Hợp Đồng" onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Lease Info */}
                <div className="bg-slate-50 rounded-lg p-3">
                    <div className="text-sm space-y-1">
                        <p><span className="font-semibold">Phòng:</span> {room.name}</p>
                        <p><span className="font-semibold">Khách:</span> {tenant.fullName}</p>
                        <p><span className="font-semibold">Thuê từ:</span> {formatDate(lease.startDate)}</p>
                        <p><span className="font-semibold">Tiền cọc:</span> {formatCurrency(lease.deposit)}</p>
                    </div>
                </div>
                
                {/* Warning for unpaid invoices */}
                {unpaidCount > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs font-semibold text-amber-800">
                            ⚠️ Có {unpaidCount} hóa đơn cũ chưa thanh toán
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            Tổng nợ: {formatCurrency(unpaidTotal)}
                        </p>
                        <p className="text-xs text-amber-700 mt-1">
                            Quyết toán này chỉ tính hóa đơn cuối kỳ. Hóa đơn cũ vẫn cần thu riêng.
                        </p>
                    </div>
                )}
                
                {/* Move-out Date */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        Ngày dọn đi
                    </label>
                    <input
                        type="date"
                        value={moveOutDate}
                        min={lease.startDate}
                        max={today}
                        onChange={(e) => setMoveOutDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                        disabled={isSubmitting}
                    />
                    {calculation && (
                        <p className="text-xs text-slate-600 mt-1">
                            Kỳ cuối: {formatDate(periodStart)} - {formatDate(moveOutDate)} ({calculation.days} ngày)
                        </p>
                    )}
                </div>
                
                {/* Final Electric Reading */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        ⚡ Chỉ số điện cuối (kWh)
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
                            <label className="text-xs text-slate-600">Cuối cùng:</label>
                            <input
                                type="number"
                                value={finalElectricReading}
                                onChange={(e) => setFinalElectricReading(e.target.value)}
                                placeholder="Chỉ số cuối"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    {calculation && calculation.electricUsage !== undefined && (
                        <p className="text-xs text-slate-600 mt-1">
                            Dùng: {calculation.electricUsage.toFixed(1)} kWh
                        </p>
                    )}
                </div>
                
                {/* Final Water Reading */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                        💧 Chỉ số nước cuối (m³)
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
                            <label className="text-xs text-slate-600">Cuối cùng:</label>
                            <input
                                type="number"
                                value={finalWaterReading}
                                onChange={(e) => setFinalWaterReading(e.target.value)}
                                placeholder="Chỉ số cuối"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                                disabled={isSubmitting}
                            />
                        </div>
                    </div>
                    {calculation && calculation.waterUsage !== undefined && (
                        <p className="text-xs text-slate-600 mt-1">
                            Dùng: {calculation.waterUsage.toFixed(1)} m³
                        </p>
                    )}
                </div>
                
                {/* Final Invoice Preview */}
                {calculation && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-semibold text-blue-900 mb-2">📋 Hóa Đơn Cuối Kỳ:</p>
                        <div className="text-xs space-y-1 text-blue-800">
                            {calculation.invoiceResult.lines.map((line, idx) => (
                                <div key={idx} className="flex justify-between">
                                    <span>• {line.note || line.code}</span>
                                    <span className="font-semibold">{formatCurrency(line.amount)}</span>
                                </div>
                            ))}
                            <div className="border-t border-blue-300 mt-2 pt-2 flex justify-between">
                                <span className="font-bold">Tổng HĐ:</span>
                                <span className="font-bold">{formatCurrency(calculation.invoiceResult.total)}</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Deposit Settlement */}
                {calculation && (
                    <div className={`rounded-lg p-3 border-2 ${
                        calculation.settlement.refund > 0 
                            ? 'bg-green-50 border-green-300' 
                            : calculation.settlement.collectMore > 0
                            ? 'bg-red-50 border-red-300'
                            : 'bg-slate-50 border-slate-300'
                    }`}>
                        <p className="text-sm font-semibold mb-2" style={{ color: PRIMARY_COLOR }}>
                            💰 QUYẾT TOÁN CỌC:
                        </p>
                        <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                                <span>Tiền cọc:</span>
                                <span className="font-semibold">{formatCurrency(lease.deposit)}</span>
                            </div>
                            <div className="flex justify-between text-red-600">
                                <span>Trừ hóa đơn cuối:</span>
                                <span className="font-semibold">-{formatCurrency(calculation.invoiceResult.total)}</span>
                            </div>
                            <div className="border-t-2 border-slate-300 my-2"></div>
                            {calculation.settlement.refund > 0 && (
                                <div className="flex justify-between text-green-700 font-bold">
                                    <span>→ Trả lại khách:</span>
                                    <span className="text-lg">{formatCurrency(calculation.settlement.refund)} ✅</span>
                                </div>
                            )}
                            {calculation.settlement.collectMore > 0 && (
                                <div className="flex justify-between text-red-700 font-bold">
                                    <span>→ Khách cần bù thêm:</span>
                                    <span className="text-lg">{formatCurrency(calculation.settlement.collectMore)} ⚠️</span>
                                </div>
                            )}
                            {calculation.settlement.refund === 0 && calculation.settlement.collectMore === 0 && (
                                <div className="flex justify-between text-slate-700 font-bold">
                                    <span>→ Quyết toán đủ:</span>
                                    <span className="text-lg">0đ ✅</span>
                                </div>
                            )}
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
                        onClick={handleTerminate}
                        disabled={!calculation || isSubmitting}
                        className="flex-1 py-2.5 text-sm font-semibold text-white rounded-lg disabled:bg-slate-400"
                        style={{ backgroundColor: calculation ? '#ef4444' : undefined }}
                    >
                        {isSubmitting ? 'Đang xử lý...' : 'Xác Nhận Kết Thúc'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default TerminateLeaseModal;

