
import React, { useState, useMemo } from 'react';
import { useAppData } from '../hooks/useAppData';
import Header from '../components/Header';
import { type Invoice, type ModalType, type View, type Lease } from '../types';
import { PRIMARY_COLOR } from '../constants';
import PartialPaymentModal from '../components/modals/PartialPaymentModal';
import { daysBetween } from '../services/billing';
import { createPeriodForNewLease } from '../services/billingAdapter';

interface InvoicesViewProps {
  setActiveModal: (modal: ModalType | null) => void;
  setActiveView: (view: View) => void;
  currentView: View;
}

// Helper: Calculate period info (start, end, days) from invoice period and lease
const getPeriodInfo = (invoice: Invoice, lease: Lease | undefined) => {
    if (!lease) {
        // Fallback to full month
        const [year, month] = invoice.period.split('-').map(Number);
        const start = new Date(Date.UTC(year, month - 1, 1));
        const end = new Date(Date.UTC(year, month, 0)); // Last day of month
        
        const startStr = start.toISOString().slice(0, 10);
        const endStr = end.toISOString().slice(0, 10);
        const days = daysBetween({ start: startStr, end: `${year}-${String(month + 1).padStart(2, '0')}-01` });
        
        return { start: startStr, end: endStr, days, isProRated: false };
    }
    
    // Calculate period - if lease started in this month, use pro-rate logic
    const billingPeriod = createPeriodForNewLease(lease, invoice.period);
    const days = daysBetween(billingPeriod);
    const isProRated = billingPeriod.start !== `${invoice.period}-01`;
    
    // Format end date for display (exclusive to inclusive)
    // billingPeriod.end is exclusive (first day of next month), convert to inclusive (last day of current month)
    const endDate = new Date(billingPeriod.end + 'T00:00:00');
    endDate.setUTCDate(endDate.getUTCDate() - 1); // Use UTC to avoid timezone issues
    const endStr = endDate.toISOString().slice(0, 10);
    
    return {
        start: billingPeriod.start,
        end: endStr,
        days,
        isProRated
    };
};

// Helper: Format date to DD/MM/YYYY
const formatDateDDMMYYYY = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
};

const InvoiceCard: React.FC<{ 
    invoice: Invoice; 
    onMarkAsPaid: (invoice: Invoice) => void;
    onOpenPartialPayment: (invoice: Invoice) => void;
}> = ({ invoice, onMarkAsPaid, onOpenPartialPayment }) => {
    const { rooms, leases, tenants } = useAppData();
    const lease = leases.find(l => l.id === invoice.leaseId);
    const room = rooms.find(r => r.id === lease?.roomId);
    const tenant = tenants.find(t => t.id === lease?.tenantId);
    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
    
    const remainingDebt = invoice.total - invoice.amountPaid;
    const percentage = invoice.total > 0 ? Math.round((invoice.amountPaid / invoice.total) * 100) : 0;
    
    // Calculate period info
    const periodInfo = getPeriodInfo(invoice, lease);

    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
            {/* Header */}
            <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold">{room?.name} - {tenant?.fullName}</h3>
                        {invoice.status === 'partial' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-orange-100 text-orange-700 font-semibold">
                                Nợ 1 phần
                            </span>
                        )}
                        {invoice.status === 'paid' && (
                            <span className="px-2 py-0.5 text-[10px] rounded-full bg-green-100 text-green-700 font-semibold">
                                Đã thu
                            </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500">
                        <p>Kỳ: {formatDateDDMMYYYY(periodInfo.start)} - {formatDateDDMMYYYY(periodInfo.end)} ({periodInfo.days} ngày)</p>
                    </div>
                </div>
            </div>

            {/* Progress Bar (for partial/unpaid) */}
            {invoice.status !== 'paid' && (
                <div className="mb-3">
                    <div className="w-full bg-slate-200 rounded-full h-2">
                        <div
                            className="bg-green-500 h-2 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">{percentage}% đã trả</p>
                </div>
            )}

            {/* Amount Summary */}
            {invoice.status !== 'paid' && (
                <div className="bg-slate-50 rounded-lg p-2.5 mb-3 space-y-1.5">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Tổng hóa đơn:</span>
                        <span className="font-bold text-slate-800">{formatCurrency(invoice.total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Đã thanh toán:</span>
                        <span className="font-semibold text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                    </div>
                    <div className="h-px bg-slate-200"></div>
                    <div className="flex justify-between text-sm">
                        <span className="font-semibold text-slate-700">Còn nợ:</span>
                        <span className="font-bold text-orange-600">{formatCurrency(remainingDebt)}</span>
                    </div>
                </div>
            )}

            {/* Invoice Details */}
            <div className="border-t border-slate-200 pt-2 text-xs text-slate-600 space-y-0.5 mb-3">
                <div className="flex justify-between"><span>Tiền phòng ({periodInfo.days} ngày):</span> <span>{formatCurrency(invoice.rent)}</span></div>
                <div className="flex justify-between"><span>Tiền điện ({invoice.electricUsage} kWh):</span> <span>{formatCurrency(invoice.electricCost || 0)}</span></div>
                <div className="flex justify-between"><span>Tiền nước ({invoice.waterUsage} m³):</span> <span>{formatCurrency(invoice.waterCost || 0)}</span></div>
                <div className="flex justify-between"><span>Phí khác:</span> <span>{formatCurrency(invoice.otherFees)}</span></div>
            </div>

            {/* Action Buttons */}
            {invoice.status === 'paid' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
                    <p className="text-xs text-green-700 font-semibold">✓ Đã thanh toán đủ {formatCurrency(invoice.total)}</p>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button
                        onClick={() => onOpenPartialPayment(invoice)}
                        className="flex-1 py-2 rounded-lg font-semibold text-xs bg-blue-500 text-white hover:bg-blue-600 transition-all active:scale-95"
                    >
                        💵 Thu tiền
                    </button>
                    <button
                        onClick={() => onMarkAsPaid(invoice)}
                        className="flex-1 py-2 rounded-lg font-semibold text-xs text-white transition-all active:scale-95"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                    >
                        ✓ Hoàn tất
                    </button>
                </div>
            )}
        </div>
    );
};


const InvoicesView: React.FC<InvoicesViewProps> = ({ setActiveModal, setActiveView, currentView }) => {
    const { invoices, updateInvoice, rooms, leases, tenants } = useAppData();
    const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Deduplicate invoices by ID for display (in case of database duplicates)
    const uniqueInvoices = useMemo(() => {
        const seen = new Set<number>();
        return invoices.filter(invoice => {
            if (seen.has(invoice.id)) {
                return false; // Skip duplicate
            }
            seen.add(invoice.id);
            return true;
        });
    }, [invoices]);
    
    // Detect if duplicates exist
    const hasDuplicates = uniqueInvoices.length !== invoices.length;
    
    const filteredInvoices = useMemo(() => {
        return uniqueInvoices.filter(invoice => {
            // Filter by status
            let statusMatch = true;
            if (filter === 'unpaid') {
                statusMatch = invoice.status === 'unpaid' || invoice.status === 'partial';
            } else if (filter !== 'all') {
                statusMatch = invoice.status === filter;
            }
            
            // Filter by search query (name, phone, room)
            let searchMatch = true;
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase().trim();
                const lease = leases.find(l => l.id === invoice.leaseId);
                const tenant = tenants.find(t => t.id === lease?.tenantId);
                const room = rooms.find(r => r.id === lease?.roomId);
                
                const tenantName = tenant?.fullName?.toLowerCase() || '';
                const tenantPhone = tenant?.phone || '';
                const roomName = room?.name?.toLowerCase() || '';
                
                searchMatch = tenantName.includes(query) || 
                             tenantPhone.includes(query) || 
                             roomName.includes(query);
            }
            
            return statusMatch && searchMatch;
        }).sort((a,b) => b.id - a.id);
    }, [uniqueInvoices, filter, searchQuery, leases, tenants, rooms]);

    const handleMarkAsPaid = async (invoice: Invoice) => {
        try {
            await updateInvoice(invoice.id, {
                amountPaid: invoice.total,
                status: 'paid'
            });
        } catch (error) {
            console.error('Error updating invoice:', error);
            alert('❌ Có lỗi khi cập nhật hóa đơn!');
        }
    };

    return (
        <div>
            <Header title="Quản lý hóa đơn" />
             <div className="p-3 space-y-3">
                {/* Warning for duplicate invoices */}
                {hasDuplicates && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                        <div className="flex items-start">
                            <span className="text-xl mr-2">⚠️</span>
                            <div className="flex-1">
                                <p className="text-xs font-semibold text-yellow-800 mb-1">
                                    Phát hiện hóa đơn bị trùng lặp!
                                </p>
                                <p className="text-xs text-yellow-700 mb-2">
                                    Có {invoices.length - uniqueInvoices.length} hóa đơn bị duplicate. 
                                    Để xóa vĩnh viễn, mở Console (F12) và chạy:
                                </p>
                                <code className="text-xs bg-yellow-100 px-2 py-1 rounded text-yellow-900 font-mono">
                                    cleanupDuplicateInvoices()
                                </code>
                            </div>
                        </div>
                    </div>
                )}
                
              <button
                onClick={() => setActiveModal('generateInvoices')}
                className="w-full text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-300 text-sm"
                style={{ background: `linear-gradient(to right, ${PRIMARY_COLOR}, #2ca3af)` }}
              >
                Tạo hoá đơn hàng loạt
              </button>
              
              {/* Search Box */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-slate-400 text-sm">🔍</span>
                </div>
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT, phòng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    <span className="text-lg">×</span>
                  </button>
                )}
              </div>
              
                <div className="flex space-x-1 bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setFilter('all')} className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md ${filter === 'all' ? 'bg-white shadow' : ''}`}>Tất cả</button>
                    <button onClick={() => setFilter('unpaid')} className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md ${filter === 'unpaid' ? 'bg-white shadow' : ''}`}>Chưa thu</button>
                    <button onClick={() => setFilter('partial')} className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md ${filter === 'partial' ? 'bg-white shadow' : ''}`}>Nợ 1 phần</button>
                    <button onClick={() => setFilter('paid')} className={`flex-1 py-1.5 text-[11px] font-semibold rounded-md ${filter === 'paid' ? 'bg-white shadow' : ''}`}>Đã thu</button>
                </div>
                
                {/* Search Results Counter */}
                {(searchQuery || filter !== 'all') && (
                    <div className="text-xs text-slate-600 flex items-center gap-1.5">
                        <span>📊</span>
                        <span>Tìm thấy <strong className="text-teal-600">{filteredInvoices.length}</strong> hóa đơn</span>
                    </div>
                )}
            </div>
            <div className="p-3 pt-0 space-y-3">
                {filteredInvoices.map(invoice => (
                    <InvoiceCard 
                        key={invoice.id} 
                        invoice={invoice} 
                        onMarkAsPaid={handleMarkAsPaid}
                        onOpenPartialPayment={setSelectedInvoiceForPayment}
                    />
                ))}
            </div>

            {/* Partial Payment Modal */}
            {selectedInvoiceForPayment && (
                <PartialPaymentModal
                    invoice={selectedInvoiceForPayment}
                    onClose={() => setSelectedInvoiceForPayment(null)}
                />
            )}
        </div>
    );
};

export default InvoicesView;
