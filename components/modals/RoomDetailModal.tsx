import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { type Room } from '../../types';
import { PRIMARY_COLOR } from '../../constants';
import CreateSingleInvoiceModal from './CreateSingleInvoiceModal';
import TerminateLeaseModal from './TerminateLeaseModal';
import AddSubTenantModal from './AddSubTenantModal';
import EditLeaseModal from './EditLeaseModal';
import { calculateProRataRent, getPrimaryParticipant, getSubParticipants } from '../../services/proRataCalculator';

interface RoomDetailModalProps {
    room: Room;
    onClose: () => void;
    onEdit: () => void;
}

const RoomDetailModal: React.FC<RoomDetailModalProps> = ({ room, onClose, onEdit }) => {
    const { leases, tenants, meters, readings, maintenance, updateRoom, deleteRoom, deleteMeter, deleteReading, deleteMaintenance, deleteLease, invoices, deleteInvoice, updateLease } = useAppData();
    const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
    const [isUtilityHistoryExpanded, setIsUtilityHistoryExpanded] = useState(false);
    const [activeModal, setActiveModal] = useState<'createInvoice' | 'terminateLease' | 'addSubTenant' | 'editLease' | null>(null);

    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN');

    // Current lease & tenant
    const activeLease = leases.find(l => l.roomId === room.id && l.status === 'active');
    const currentTenant = activeLease ? tenants.find(t => t.id === activeLease.tenantId) : undefined;

    // Participants (người ở ghép)
    const primaryParticipant = activeLease ? getPrimaryParticipant(activeLease.participants) : undefined;
    const subParticipants = activeLease ? getSubParticipants(activeLease.participants) : [];
    const primaryTenant = primaryParticipant ? tenants.find(t => t.id === primaryParticipant.tenantId) : currentTenant;
    
    // Calculate rent breakdown (for current month)
    const rentBreakdown = useMemo(() => {
        if (!activeLease || !activeLease.participants || activeLease.participants.length <= 1) {
            return [];
        }
        
        // Current month period
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
        
        const billingPeriod = {
            start: `${year}-${month}-01`,
            end: `${year}-${month}-${lastDay.toString().padStart(2, '0')}`
        };
        
        const results = calculateProRataRent({
            monthlyRent: activeLease.monthlyRent,
            participants: activeLease.participants,
            billingPeriod
        });
        
        // Add tenant names
        return results.map(r => ({
            ...r,
            tenantName: tenants.find(t => t.id === r.tenantId)?.fullName || 'Unknown'
        }));
    }, [activeLease, tenants]);

    // Lease history (inactive leases)
    const inactiveLeases = leases
        .filter(l => l.roomId === room.id && l.status === 'inactive')
        .sort((a, b) => new Date(b.endDate || '').getTime() - new Date(a.endDate || '').getTime());

    // Electric & water meters
    const electricMeter = meters.find(m => m.roomId === room.id && m.type === 'electric');
    const waterMeter = meters.find(m => m.roomId === room.id && m.type === 'water');

    // Recent readings (last 3 months)
    const getRecentReadings = (meterId: number | undefined) => {
        if (!meterId) return [];
        return readings
            .filter(r => r.meterId === meterId)
            .sort((a, b) => b.period.localeCompare(a.period))
            .slice(0, 3);
    };

    const electricReadings = getRecentReadings(electricMeter?.id);
    const waterReadings = getRecentReadings(waterMeter?.id);

    // Latest readings - Priority: from last invoice, fallback to newest reading
    const lastInvoiceReadings = useMemo(() => {
        if (!activeLease) return null;
        
        // Get invoices for this lease, sorted by period descending
        const leaseInvoices = invoices
            .filter(inv => inv.leaseId === activeLease.id)
            .sort((a, b) => b.period.localeCompare(a.period));
        
        if (leaseInvoices.length === 0) {
            // No invoices yet - get newest readings (e.g., initial readings)
            const latestElec = readings
                .filter(r => r.meterId === electricMeter?.id)
                .sort((a, b) => b.period.localeCompare(a.period))[0];
            
            const latestWater = readings
                .filter(r => r.meterId === waterMeter?.id)
                .sort((a, b) => b.period.localeCompare(a.period))[0];
            
            return {
                electric: latestElec || null,
                water: latestWater || null,
                period: latestElec?.period || latestWater?.period || ''
            };
        }
        
        const lastInvoice = leaseInvoices[0];
        
        // Find readings from that invoice period
        const elecReading = readings.find(
            r => r.meterId === electricMeter?.id && r.period === lastInvoice.period
        );
        const waterReading = readings.find(
            r => r.meterId === waterMeter?.id && r.period === lastInvoice.period
        );
        
        return {
            electric: elecReading || null,
            water: waterReading || null,
            period: lastInvoice.period
        };
    }, [activeLease, invoices, readings, electricMeter, waterMeter]);

    const latestElectricReading = lastInvoiceReadings?.electric || null;
    const latestWaterReading = lastInvoiceReadings?.water || null;

    // Maintenance history
    const roomMaintenance = maintenance
        .filter(m => m.roomId === room.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

    // Handle toggle lock/unlock
    const handleToggleLock = async () => {
        if (activeLease && room.isActive) {
            alert('Không thể khóa phòng đang có người thuê!');
            return;
        }

        const action = room.isActive ? 'khóa' : 'mở khóa';
        if (confirm(`Bạn muốn ${action} phòng ${room.name}?`)) {
            try {
                await updateRoom(room.id, { isActive: !room.isActive });
                alert(`Đã ${action} phòng thành công!`);
                onClose();
            } catch (error) {
                console.error('Error toggling room lock:', error);
                alert(`Có lỗi xảy ra khi ${action} phòng!`);
            }
        }
    };

    // Handle delete room
    const handleDeleteRoom = async () => {
        // Check if room has active lease
        if (activeLease) {
            alert('❌ Không thể xóa phòng đang có người thuê!\n\nVui lòng kết thúc hợp đồng trước, hoặc dùng "Khóa phòng" để tạm ngưng cho thuê.');
            return;
        }

        // Get all related data
        const roomLeases = leases.filter(l => l.roomId === room.id);
        const roomMeters = meters.filter(m => m.roomId === room.id);
        const roomMaintenance = maintenance.filter(m => m.roomId === room.id);
        
        // Count related data
        const leaseCount = roomLeases.length;
        const invoiceCount = invoices.filter(inv => 
            roomLeases.some(l => l.id === inv.leaseId)
        ).length;
        const readingCount = roomMeters.reduce((count, meter) => 
            count + readings.filter(r => r.meterId === meter.id).length, 0
        );
        const maintenanceCount = roomMaintenance.length;

        // Build warning message
        let warningMsg = `⚠️ XÓA VĨNH VIỄN phòng "${room.name}"?\n\n`;
        warningMsg += `❗ Hành động này KHÔNG THỂ HOÀN TÁC!\n\n`;
        
        if (leaseCount > 0 || invoiceCount > 0 || readingCount > 0 || maintenanceCount > 0) {
            warningMsg += `Sẽ xóa tất cả data liên quan:\n`;
            if (leaseCount > 0) warningMsg += `• ${leaseCount} hợp đồng (cũ)\n`;
            if (invoiceCount > 0) warningMsg += `• ${invoiceCount} hóa đơn\n`;
            if (readingCount > 0) warningMsg += `• ${readingCount} chỉ số điện nước\n`;
            if (maintenanceCount > 0) warningMsg += `• ${maintenanceCount} bảo trì\n`;
            warningMsg += `• ${roomMeters.length} đồng hồ\n\n`;
            warningMsg += `⚠️ DATA TÀI CHÍNH SẼ MẤT!\n\n`;
        }
        
        warningMsg += `💡 Nếu chỉ muốn tạm ngưng cho thuê,\ndùng "Khóa phòng" thay vì xóa.\n\n`;
        warningMsg += `Bạn CHẮC CHẮN muốn xóa?`;

        const confirmed = confirm(warningMsg);
        if (!confirmed) return;

        try {
            // Delete cascade: invoices → leases → readings → meters → maintenance → room
            
            // 1. Delete invoices
            for (const lease of roomLeases) {
                const leaseInvoices = invoices.filter(inv => inv.leaseId === lease.id);
                for (const invoice of leaseInvoices) {
                    await deleteInvoice(invoice.id);
                }
            }

            // 2. Delete leases
            for (const lease of roomLeases) {
                await deleteLease(lease.id);
            }

            // 3. Delete readings
            for (const meter of roomMeters) {
                const meterReadings = readings.filter(r => r.meterId === meter.id);
                for (const reading of meterReadings) {
                    await deleteReading(reading.id);
                }
            }

            // 4. Delete meters
            for (const meter of roomMeters) {
                await deleteMeter(meter.id);
            }

            // 5. Delete maintenance
            for (const maint of roomMaintenance) {
                await deleteMaintenance(maint.id);
            }

            // 6. Finally delete room
            await deleteRoom(room.id);

            alert('✅ Đã xóa phòng và toàn bộ data liên quan thành công!');
            onClose();
        } catch (error) {
            console.error('Error deleting room:', error);
            alert('❌ Có lỗi xảy ra khi xóa phòng! Vui lòng thử lại.');
        }
    };

    // Handle remove sub-tenant
    const handleRemoveSubTenant = async (tenantId: number) => {
        if (!activeLease || !activeLease.participants) return;
        
        const tenant = tenants.find(t => t.id === tenantId);
        const confirmed = confirm(
            `⚠️ XÓA NGƯỜI Ở GHÉP?\n\n` +
            `${tenant?.fullName}\n\n` +
            `Người này sẽ được đánh dấu "rời đi" từ hôm nay.\n` +
            `Tiền phòng tháng sau sẽ tính lại cho số người còn lại.\n\n` +
            `Xác nhận?`
        );
        
        if (!confirmed) return;
        
        try {
            // Set leaveDate = today for this sub-tenant
            const today = new Date().toISOString().split('T')[0];
            const updatedParticipants = activeLease.participants.map(p => 
                p.tenantId === tenantId 
                    ? { ...p, leaveDate: today }
                    : p
            );
            
            // Filter out participants who left (for clean display)
            // Keep them in array but with leaveDate set
            
            await updateLease(activeLease.id, {
                participants: updatedParticipants,
                numberOfPeople: updatedParticipants.filter(p => !p.leaveDate).length
            });
            
            alert(`✅ Đã xóa người ở ghép: ${tenant?.fullName}\nTiền phòng tháng sau sẽ chia cho ${updatedParticipants.filter(p => !p.leaveDate).length} người.`);
        } catch (error) {
            console.error('Error removing sub-tenant:', error);
            alert('❌ Có lỗi khi xóa người ở ghép!');
        }
    };

    return (
        <Modal title={`🏠 ${room.name}`} onClose={onClose}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {/* Status Badge */}
                <div className="flex items-center space-x-2">
                    {!room.isActive ? (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-slate-200 text-slate-700">
                            🔒 Đã khóa
                        </span>
                    ) : activeLease ? (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                            ✓ Đang thuê
                        </span>
                    ) : (
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                            ○ Còn trống
                        </span>
                    )}
                </div>

                {/* Basic Info */}
                <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <h3 className="text-sm font-bold text-slate-700">📋 THÔNG TIN CƠ BẢN</h3>
                    <div className="text-xs space-y-1.5">
                        <div className="flex justify-between">
                            <span className="text-slate-600">Giá thuê:</span>
                            <span className="font-semibold text-slate-800">{formatCurrency(room.baseRent)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-600">
                                {activeLease?.paymentMode === 'advance' 
                                    ? 'Tiền ứng trước:' 
                                    : activeLease?.paymentMode === 'deposit' 
                                        ? 'Tiền cọc cố định:' 
                                        : 'Tiền cọc:'}
                            </span>
                            <span className="font-semibold text-slate-800">
                                {formatCurrency(activeLease?.deposit ?? room.deposit)}
                            </span>
                        </div>
                        {room.note && (
                            <div>
                                <span className="text-slate-600">Ghi chú:</span>
                                <p className="text-slate-800 mt-1">{room.note}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Current Tenant */}
                {activeLease && primaryTenant && (
                    <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                        <h3 className="text-sm font-bold text-blue-700">👤 NGƯỜI THUÊ CHÍNH</h3>
                        <div className="text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-blue-600">Họ tên:</span>
                                <span className="font-semibold text-blue-800">{primaryTenant.fullName}</span>
                            </div>
                            {primaryTenant.phone && (
                                <div className="flex justify-between">
                                    <span className="text-blue-600">SĐT:</span>
                                    <span className="font-semibold text-blue-800">{primaryTenant.phone}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-blue-600">Ngày vào:</span>
                                <span className="font-semibold text-blue-800">{formatDate(primaryParticipant?.joinDate || activeLease.startDate)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-blue-600">
                                    {activeLease.paymentMode === 'advance' ? 'Tiền ứng trước:' : 'Tiền cọc cố định:'}
                                </span>
                                <span className="font-semibold text-blue-800">{formatCurrency(activeLease.deposit)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-blue-600">Tiền thuê/tháng:</span>
                                <span className="font-semibold text-blue-800">{formatCurrency(activeLease.monthlyRent)}</span>
                            </div>

                            {/* Sub-tenants Section */}
                            {subParticipants.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-300">
                                    <h4 className="font-bold text-blue-700 mb-2">👥 NGƯỜI Ở GHÉP ({subParticipants.filter(p => !p.leaveDate).length})</h4>
                                    {subParticipants.map(p => {
                                        const subTenant = tenants.find(t => t.id === p.tenantId);
                                        if (!subTenant || p.leaveDate) return null; // Skip if left
                                        
                                        return (
                                            <div key={p.tenantId} className="flex justify-between items-start bg-white rounded p-2 mb-1.5">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-blue-800">{subTenant.fullName}</p>
                                                    <p className="text-blue-600 text-[10px]">
                                                        Từ: {formatDate(p.joinDate)}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleRemoveSubTenant(p.tenantId)}
                                                    className="ml-2 text-red-600 hover:text-red-800 text-sm"
                                                    title="Xóa người ở ghép"
                                                >
                                                    ❌
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            
                            {/* Add Sub-tenant Button */}
                            <button
                                onClick={() => setActiveModal('addSubTenant')}
                                className="w-full mt-2 py-2 text-xs font-semibold bg-white text-green-700 rounded-lg border border-green-300 hover:bg-green-50 transition"
                            >
                                + Thêm người ở ghép
                            </button>
                            
                            {/* Rent Breakdown (if multiple people) */}
                            {rentBreakdown.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-blue-300 bg-yellow-50 -mx-3 -mb-2 p-3 rounded-b-lg">
                                    <p className="font-bold text-yellow-800 text-xs mb-2">💰 PHÂN BỔ TIỀN PHÒNG (Tháng này)</p>
                                    <div className="space-y-1">
                                        {rentBreakdown.map(b => (
                                            <div key={b.tenantId} className="flex justify-between text-[10px]">
                                                <span className="text-yellow-700">
                                                    {b.tenantName} ({b.days} ngày):
                                                </span>
                                                <span className="font-bold text-yellow-900">
                                                    {formatCurrency(b.rentShare)}
                                                </span>
                                            </div>
                                        ))}
                                        <div className="pt-1 border-t border-yellow-300 flex justify-between font-bold text-xs">
                                            <span className="text-yellow-800">TỔNG:</span>
                                            <span className="text-yellow-900">{formatCurrency(activeLease.monthlyRent)}</span>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-yellow-700 mt-1.5 italic">
                                        * Tính theo số ngày ở thực tế
                                    </p>
                                </div>
                            )}

                            {/* Latest Electric & Water Readings */}
                            {(latestElectricReading || latestWaterReading) && (
                                <div className="mt-2 pt-2 border-t border-blue-300">
                                    <p className="font-semibold text-blue-700 mb-1.5">⚡💧 Chỉ số hiện tại:</p>
                                    {latestElectricReading && (
                                        <div className="flex justify-between">
                                            <span className="text-blue-600">Điện:</span>
                                            <span className="font-semibold text-blue-800">
                                                {latestElectricReading.value} kWh <span className="text-blue-500">({latestElectricReading.period})</span>
                                            </span>
                                        </div>
                                    )}
                                    {latestWaterReading && (
                                        <div className="flex justify-between">
                                            <span className="text-blue-600">Nước:</span>
                                            <span className="font-semibold text-blue-800">
                                                {latestWaterReading.value} m³ <span className="text-blue-500">({latestWaterReading.period})</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Lease History (Collapsible) */}
                {inactiveLeases.length > 0 && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                            className="w-full px-3 py-2.5 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                        >
                            <h3 className="text-sm font-bold text-slate-700">📜 LỊCH SỬ THUÊ</h3>
                            <span className="text-slate-500 text-lg">
                                {isHistoryExpanded ? '▼' : '▶'}
                            </span>
                        </button>
                        
                        {isHistoryExpanded && (
                            <div className="p-3 space-y-2 bg-white">
                                {inactiveLeases.map(lease => {
                                    const tenant = tenants.find(t => t.id === lease.tenantId);
                                    return (
                                        <div key={lease.id} className="text-xs border-l-2 border-slate-300 pl-3 py-1">
                                            <p className="font-semibold text-slate-800">{tenant?.fullName || 'N/A'}</p>
                                            <p className="text-slate-600">
                                                {formatDate(lease.startDate)} ~ {lease.endDate ? formatDate(lease.endDate) : 'N/A'}
                                            </p>
                                            <p className="text-slate-600">{formatCurrency(lease.monthlyRent)}/tháng</p>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Electric & Water History (Collapsible) */}
                {(electricReadings.length > 0 || waterReadings.length > 0) && (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <button
                            onClick={() => setIsUtilityHistoryExpanded(!isUtilityHistoryExpanded)}
                            className="w-full px-3 py-2.5 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
                        >
                            <h3 className="text-sm font-bold text-slate-700">⚡ LỊCH SỬ ĐIỆN NƯỚC</h3>
                            <span className="text-slate-500 text-lg">
                                {isUtilityHistoryExpanded ? '▼' : '▶'}
                            </span>
                        </button>
                        
                        {isUtilityHistoryExpanded && (
                            <div className="p-3 space-y-2 bg-yellow-50">
                                <div className="text-xs space-y-2">
                                    {electricReadings.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-yellow-800 mb-1">Điện:</p>
                                            {electricReadings.map(reading => (
                                                <div key={reading.id} className="flex justify-between text-yellow-700">
                                                    <span>{reading.period}</span>
                                                    <span>{reading.value} kWh</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {waterReadings.length > 0 && (
                                        <div>
                                            <p className="font-semibold text-yellow-800 mb-1">Nước:</p>
                                            {waterReadings.map(reading => (
                                                <div key={reading.id} className="flex justify-between text-yellow-700">
                                                    <span>{reading.period}</span>
                                                    <span>{reading.value} m³</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Maintenance History */}
                {roomMaintenance.length > 0 && (
                    <div className="bg-orange-50 rounded-lg p-3 space-y-2">
                        <h3 className="text-sm font-bold text-orange-700">🔧 LỊCH SỬ BẢO TRÌ</h3>
                        <div className="text-xs space-y-2">
                            {roomMaintenance.map(item => (
                                <div key={item.id} className="border-l-2 border-orange-300 pl-2 py-1">
                                    <p className="font-semibold text-orange-800">{item.title}</p>
                                    <div className="flex justify-between text-orange-700">
                                        <span>{formatDate(item.date)}</span>
                                        <span>{formatCurrency(item.cost)}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                            item.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                        }`}>
                                            {item.status === 'open' ? 'Đang xử lý' : 'Đã xong'}
                                        </span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                            item.payer === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                        }`}>
                                            {item.payer === 'owner' ? 'Chủ trả' : 'Khách trả'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions - For Active Lease */}
                {activeLease && (
                    <div className="space-y-2 pt-2">
                        <p className="text-xs font-semibold text-slate-600">⚡ Thao tác nhanh:</p>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setActiveModal('createInvoice')}
                                className="flex-1 py-2.5 text-xs font-semibold text-white rounded-lg hover:opacity-90"
                                style={{ backgroundColor: PRIMARY_COLOR }}
                            >
                                📝 Tạo Hóa Đơn
                            </button>
                            <button
                                onClick={() => setActiveModal('terminateLease')}
                                className="flex-1 py-2.5 text-xs font-semibold text-white rounded-lg hover:opacity-90"
                                style={{ backgroundColor: '#f59e0b' }}
                            >
                                🏁 Kết Thúc HĐ
                            </button>
                        </div>
                        
                        {/* Edit Lease Button */}
                        <button
                            onClick={() => setActiveModal('editLease')}
                            className="w-full py-2.5 text-xs font-semibold rounded-lg border hover:bg-slate-50 transition-colors"
                            style={{ borderColor: '#8b5cf6', color: '#8b5cf6' }}
                        >
                            ✏️ Sửa hợp đồng
                        </button>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="space-y-2 pt-2">
                    <div className="flex space-x-2">
                        <button
                            onClick={onEdit}
                            className="flex-1 py-2.5 text-xs font-semibold rounded-lg border"
                            style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
                        >
                            ✏️ Sửa
                        </button>
                        <button
                            onClick={handleToggleLock}
                            className="flex-1 py-2.5 text-xs font-semibold text-white rounded-lg"
                            style={{ backgroundColor: room.isActive ? '#ef4444' : '#10b981' }}
                        >
                            {room.isActive ? '🔒 Khóa phòng' : '🔓 Mở khóa'}
                        </button>
                    </div>

                    {/* Info Box */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-xs text-blue-800">
                        <p className="font-semibold mb-1">💡 Phân biệt:</p>
                        <p>• <strong>Khóa phòng:</strong> Tạm ngưng, giữ data</p>
                        <p>• <strong>Xóa phòng:</strong> Vĩnh viễn, mất hết</p>
                    </div>

                    {/* Danger Zone */}
                    <div className="border-t-2 border-red-200 pt-2">
                        <p className="text-xs text-red-600 font-semibold mb-2">⚠️ DANGER ZONE:</p>
                        <button
                            onClick={handleDeleteRoom}
                            className="w-full py-2.5 text-xs font-semibold text-white rounded-lg hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#dc2626' }}
                        >
                            🗑️ Xóa phòng vĩnh viễn
                        </button>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="w-full py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
                >
                    Đóng
                </button>
            </div>
            
            {/* Sub-modals */}
            {activeModal === 'createInvoice' && activeLease && (
                <CreateSingleInvoiceModal 
                    room={room}
                    lease={activeLease}
                    onClose={() => {
                        setActiveModal(null);
                        // Close parent modal after creating invoice to force data refresh
                        setTimeout(() => {
                            console.log('🔄 Closing RoomDetailModal to refresh data');
                            onClose();
                        }, 1000);
                    }}
                />
            )}
            
            {activeModal === 'terminateLease' && activeLease && currentTenant && (
                <TerminateLeaseModal 
                    room={room}
                    lease={activeLease}
                    tenant={currentTenant}
                    onClose={() => setActiveModal(null)}
                />
            )}
            
            {activeModal === 'addSubTenant' && activeLease && (
                <AddSubTenantModal 
                    lease={activeLease}
                    onClose={() => setActiveModal(null)}
                />
            )}
            
            {activeModal === 'editLease' && activeLease && primaryTenant && (
                <EditLeaseModal 
                    lease={activeLease}
                    room={room}
                    tenant={primaryTenant}
                    onClose={() => setActiveModal(null)}
                />
            )}
        </Modal>
    );
};

export default RoomDetailModal;

