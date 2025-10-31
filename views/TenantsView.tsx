
import React, { useState, useMemo } from 'react';
import { useAppData } from '../hooks/useAppData';
import Header from '../components/Header';
import { type Tenant, type View } from '../types';
import { PRIMARY_COLOR } from '../constants';
import EditTenantModal from '../components/modals/EditTenantModal';

interface TenantCardProps {
    tenant: Tenant;
    onEdit: () => void;
    onDelete: () => void;
}

const TenantCard: React.FC<TenantCardProps> = ({ tenant, onEdit, onDelete }) => {
    const { leases, rooms } = useAppData();
    const activeLease = leases.find(l => l.tenantId === tenant.id && l.status === 'active');
    const room = rooms.find(r => r.id === activeLease?.roomId);
    
    // Check if tenant has any leases OR is a participant in any lease (for delete validation)
    const isPrimaryTenant = leases.some(l => l.tenantId === tenant.id);
    const isSubTenant = leases.some(l => 
        l.participants?.some(p => p.tenantId === tenant.id && !p.leaveDate)
    );
    const hasAnyLease = isPrimaryTenant || isSubTenant;
    
    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('vi-VN');

    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-center">
                <h3 className="text-base font-bold">{tenant.fullName}</h3>
                {room && (
                    <span className="text-xs font-semibold text-emerald-700">{room.name}</span>
                )}
            </div>
            <div className="mt-1.5 text-xs text-slate-600 space-y-0.5">
                <p>SĐT: {tenant.phone || 'Chưa có'}</p>
                <p>CCCD: {tenant.idNumber || 'Chưa có'}</p>
            </div>
            
            {/* Lease Info */}
            {activeLease && room && (
                <div className="mt-2 pt-2 border-t border-slate-200 text-xs space-y-0.5">
                    <div className="flex justify-between text-slate-600">
                        <span>Ngày vào:</span>
                        <span className="font-semibold">{formatDate(activeLease.startDate)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Tiền cọc:</span>
                        <span className="font-semibold">{formatCurrency(activeLease.deposit)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Tiền thuê:</span>
                        <span className="font-semibold">{formatCurrency(activeLease.monthlyRent)}/tháng</span>
                    </div>
                </div>
            )}
            
            {/* Action Buttons */}
            <div className="mt-3 space-y-2">
                <button
                    onClick={onEdit}
                    className="w-full py-1.5 text-xs font-semibold rounded-lg border hover:bg-slate-50 transition-colors"
                    style={{ borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR }}
                >
                    ✏️ Sửa thông tin
                </button>
                
                {/* Delete Button - Only show if tenant has no leases */}
                {!hasAnyLease && (
                    <button
                        onClick={onDelete}
                        className="w-full py-1.5 text-xs font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
                    >
                        🗑️ Xóa người thuê
                    </button>
                )}
            </div>
        </div>
    );
};

interface TenantsViewProps {
    setActiveView: (view: View) => void;
    currentView: View;
}

const TenantsView: React.FC<TenantsViewProps> = ({ setActiveView, currentView }) => {
    const { tenants, deleteTenant, leases } = useAppData();
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    
    // Remove duplicates by ID (temporary fix until cleanup script runs)
    const uniqueTenants = useMemo(() => {
        const seen = new Set<number>();
        return tenants.filter(tenant => {
            if (seen.has(tenant.id)) {
                console.warn(`Duplicate tenant found: ID ${tenant.id} - ${tenant.fullName}`);
                return false;
            }
            seen.add(tenant.id);
            return true;
        });
    }, [tenants]);

    const handleEdit = (tenant: Tenant) => {
        setSelectedTenant(tenant);
    };

    const handleCloseModal = () => {
        setSelectedTenant(null);
    };

    const handleDelete = async (tenant: Tenant) => {
        // Double check: tenant should not be primary OR sub-tenant in any active lease
        const isPrimaryInLease = leases.some(l => l.tenantId === tenant.id);
        const isSubTenantInLease = leases.some(l => 
            l.participants?.some(p => p.tenantId === tenant.id && !p.leaveDate)
        );
        
        if (isPrimaryInLease || isSubTenantInLease) {
            alert('❌ Không thể xóa!\n\nNgười này đang ở phòng (hoặc đang ở ghép).\nVui lòng kết thúc hợp đồng hoặc xóa khỏi phòng trước.');
            return;
        }
        
        const confirmed = confirm(
            `⚠️ XÓA NGƯỜI THUÊ?\n\n` +
            `Họ tên: ${tenant.fullName}\n` +
            `SĐT: ${tenant.phone || 'Không có'}\n` +
            `CCCD: ${tenant.idNumber || 'Không có'}\n\n` +
            `Xác nhận xóa?`
        );
        
        if (!confirmed) return;
        
        try {
            await deleteTenant(tenant.id);
            alert('✅ Đã xóa người thuê!');
        } catch (error) {
            console.error('Error deleting tenant:', error);
            alert('❌ Có lỗi khi xóa người thuê!');
        }
    };

    return (
        <div>
            <Header title="Quản lý người thuê" />
            
            {/* Warning if duplicates detected */}
            {uniqueTenants.length < tenants.length && (
                <div className="mx-3 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    <p className="font-semibold">⚠️ Phát hiện {tenants.length - uniqueTenants.length} người thuê bị trùng lặp!</p>
                    <p className="mt-1">Mở Console (F12) và chạy: <code className="bg-red-100 px-1 rounded">cleanupDuplicateTenants()</code></p>
                </div>
            )}
            
            <div className="p-3 space-y-3">
                {uniqueTenants.map(tenant => (
                    <TenantCard 
                        key={tenant.id} 
                        tenant={tenant}
                        onEdit={() => handleEdit(tenant)}
                        onDelete={() => handleDelete(tenant)}
                    />
                ))}
            </div>
            
            {/* Edit Modal */}
            {selectedTenant && (
                <EditTenantModal 
                    tenant={selectedTenant}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default TenantsView;
