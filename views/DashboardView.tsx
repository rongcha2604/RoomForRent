import React, { useMemo, useState } from 'react';
import { useAppData } from '../hooks/useAppData';
import { type View, type ModalType, type Invoice } from '../types';
import Header from '../components/Header';
import SummaryCard from '../components/SummaryCard';
import { Building2Icon, FileTextIcon, UsersIcon, LandmarkIcon } from '../components/Icons';
import { PRIMARY_COLOR } from '../constants';
import PartialPaymentModal from '../components/modals/PartialPaymentModal';

interface DashboardViewProps {
  setActiveView: (view: View) => void;
  setActiveModal: (modal: ModalType | null) => void;
  currentView: View;
}

const DashboardView: React.FC<DashboardViewProps> = ({ setActiveView, setActiveModal, currentView }) => {
  const { rooms, leases, invoices, tenants, updateInvoice } = useAppData();
  const [debtSortBy, setDebtSortBy] = useState<'period' | 'amount' | 'name'>('period');
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  const occupiedRooms = leases.filter(l => l.status === 'active').length;
  
  // Count all tenants in the system
  const tenantCount = tenants.length;
  
  // Count invoices that are unpaid or partially paid
  const unpaidInvoicesCount = invoices.filter(i => i.status === 'unpaid' || i.status === 'partial').length;
  // Calculate total remaining debt (total - amountPaid)
  const totalDebt = invoices
    .filter(i => i.status === 'unpaid' || i.status === 'partial')
    .reduce((sum, inv) => sum + (inv.total - inv.amountPaid), 0);

  // Monthly Revenue Stats
  const currentPeriod = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  }, []);

  const revenueStats = useMemo(() => {
    const currentMonthInvoices = invoices.filter(inv => inv.period === currentPeriod);
    
    const total = currentMonthInvoices.reduce((sum, inv) => sum + inv.total, 0);
    // Paid = sum of all amountPaid
    const paid = currentMonthInvoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
    // Unpaid = total - paid
    const unpaid = total - paid;
    
    return { total, paid, unpaid, count: currentMonthInvoices.length };
  }, [invoices, currentPeriod]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }
  
  const formatCurrencyAbbreviated = (value: number) => {
    if (value >= 1000000) {
        const millions = value / 1000000;
        const formatted = (Math.round(millions * 10) / 10).toString();
        return `${formatted}M`;
    }
    if (value >= 1000) {
        return `${Math.round(value / 1000)}K`;
    }
    return value.toString();
  };

  // Unpaid/Partial invoices with sorting
  const sortedUnpaidInvoices = useMemo(() => {
    const unpaid = invoices.filter(inv => inv.status === 'unpaid' || inv.status === 'partial');
    
    return unpaid.sort((a, b) => {
      if (debtSortBy === 'period') {
        return b.period.localeCompare(a.period); // Newest first
      } else if (debtSortBy === 'amount') {
        // Sort by remaining debt (total - amountPaid)
        const remainingA = a.total - a.amountPaid;
        const remainingB = b.total - b.amountPaid;
        return remainingB - remainingA; // Highest first
      } else {
        // Sort by tenant name
        const leaseA = leases.find(l => l.id === a.leaseId);
        const leaseB = leases.find(l => l.id === b.leaseId);
        const tenantA = tenants.find(t => t.id === leaseA?.tenantId);
        const tenantB = tenants.find(t => t.id === leaseB?.tenantId);
        return (tenantA?.fullName || '').localeCompare(tenantB?.fullName || '');
      }
    });
  }, [invoices, debtSortBy, leases, tenants]);
  
  // Helper: Get payment percentage
  const getPaymentPercentage = (invoice: Invoice) => {
    if (invoice.total === 0) return 0;
    return Math.round((invoice.amountPaid / invoice.total) * 100);
  };

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
      <Header title="Tổng quan" />
      <div className="p-3 space-y-3">
        {/* Summary Cards - Now Clickable! */}
        <div className="grid grid-cols-2 gap-2.5">
          <div onClick={() => setActiveView('rooms')} className="cursor-pointer transform transition-all duration-200 hover:scale-105 active:scale-95">
            <SummaryCard 
              title="Phòng đang thuê" 
              value={`${occupiedRooms}/${rooms.length}`} 
              icon={<Building2Icon />} 
              color="#0ea5e9" 
              bgColor="#e0f2fe"
              textColor="#0369a1"
            />
          </div>
          <div onClick={() => setActiveView('tenants')} className="cursor-pointer transform transition-all duration-200 hover:scale-105 active:scale-95">
            <SummaryCard 
              title="Khách thuê" 
              value={tenantCount} 
              icon={<UsersIcon />} 
              color="#10b981"
              bgColor="#d1fae5"
              textColor="#047857"
            />
          </div>
          <div onClick={() => setActiveView('invoices')} className="cursor-pointer transform transition-all duration-200 hover:scale-105 active:scale-95">
            <SummaryCard 
              title="Hóa đơn chưa thu" 
              value={unpaidInvoicesCount} 
              icon={<FileTextIcon />} 
              color="#f59e0b"
              bgColor="#fef3c7"
              textColor="#d97706"
            />
          </div>
          <div onClick={() => setActiveView('invoices')} className="cursor-pointer transform transition-all duration-200 hover:scale-105 active:scale-95">
            <SummaryCard 
              title="Công nợ" 
              value={formatCurrencyAbbreviated(totalDebt)} 
              icon={<LandmarkIcon />} 
              color="#ef4444"
              bgColor="#fee2e2"
              textColor="#dc2626"
            />
          </div>
        </div>

        {/* Monthly Revenue Card */}
        <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200">
          <h2 className="text-sm font-semibold text-slate-700 mb-2.5">
            💰 Doanh thu tháng {currentPeriod.split('-')[1]}/{currentPeriod.split('-')[0]}
          </h2>
          
          {/* Single Row: 3 Columns */}
          <div className="grid grid-cols-3 gap-2">
            {/* Total */}
            <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-200">
              <p className="text-[10px] text-blue-700 font-semibold mb-1">Tổng thu</p>
              <p className="text-base font-bold text-blue-800">{formatCurrencyAbbreviated(revenueStats.total)}</p>
            </div>
            
            {/* Paid */}
            <div className="bg-green-50 p-2.5 rounded-lg border border-green-200">
              <p className="text-[10px] text-green-700 font-semibold mb-1">Đã thu</p>
              <p className="text-base font-bold text-green-800">{formatCurrencyAbbreviated(revenueStats.paid)}</p>
            </div>
            
            {/* Remaining (Unpaid) */}
            <div className="bg-orange-50 p-2.5 rounded-lg border border-orange-200">
              <p className="text-[10px] text-orange-700 font-semibold mb-1">Còn lại</p>
              <p className="text-base font-bold text-orange-800">{formatCurrencyAbbreviated(revenueStats.unpaid)}</p>
            </div>
          </div>
        </div>

        {/* Unpaid Invoices (Debt) Section */}
        {sortedUnpaidInvoices.length > 0 && (
          <div className="bg-white p-3 rounded-xl shadow-md border border-slate-200">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-semibold text-slate-700">
                💰 CÔNG NỢ CẦN THU
              </h2>
              <span className="text-xs text-slate-500">({sortedUnpaidInvoices.length})</span>
            </div>

            {/* Sort Tabs */}
            <div className="flex space-x-1 mb-3 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setDebtSortBy('period')}
                className={`flex-1 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
                  debtSortBy === 'period' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600'
                }`}
              >
                📅 Kỳ
              </button>
              <button
                onClick={() => setDebtSortBy('amount')}
                className={`flex-1 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
                  debtSortBy === 'amount' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600'
                }`}
              >
                💰 Tiền
              </button>
              <button
                onClick={() => setDebtSortBy('name')}
                className={`flex-1 py-1.5 text-[10px] font-semibold rounded-md transition-all ${
                  debtSortBy === 'name' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-600'
                }`}
              >
                👤 Tên
              </button>
            </div>

            {/* Invoice List (Top 3) */}
            <div className="space-y-2.5">
              {sortedUnpaidInvoices.slice(0, 3).map((invoice, index) => {
                const lease = leases.find(l => l.id === invoice.leaseId);
                const room = rooms.find(r => r.id === lease?.roomId);
                const tenant = tenants.find(t => t.id === lease?.tenantId);
                const remainingDebt = invoice.total - invoice.amountPaid;
                const percentage = getPaymentPercentage(invoice);

                return (
                  <div
                    key={invoice.id}
                    className={`p-2.5 rounded-lg bg-slate-50 border border-slate-200 ${
                      index !== 0 ? 'mt-2.5' : ''
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-semibold text-slate-800">
                            📍 {room?.name} - {tenant?.fullName}
                          </p>
                          {invoice.status === 'partial' && (
                            <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-orange-100 text-orange-700 font-semibold">
                              Nợ 1 phần
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">Kỳ: {invoice.period}</p>
                      </div>
                    </div>

                    {/* Progress Bar (only for partial payments) */}
                    {invoice.status === 'partial' && (
                      <div className="mb-2">
                        <div className="w-full bg-slate-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-[9px] text-slate-500 mt-0.5">{percentage}% đã trả</p>
                      </div>
                    )}

                    {/* Amount Info */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-600">
                        {formatCurrency(invoice.total)} 
                        {invoice.status === 'partial' && (
                          <span className="text-green-600"> | Đã: {formatCurrency(invoice.amountPaid)}</span>
                        )}
                      </span>
                      <span className="font-bold text-orange-600">
                        Nợ: {formatCurrency(remainingDebt)}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => setSelectedInvoiceForPayment(invoice)}
                        className="flex-1 text-[10px] text-white px-2.5 py-1.5 rounded-md font-semibold transition-all duration-200 hover:opacity-90 active:scale-95 bg-blue-500"
                      >
                        💵 Thu tiền
                      </button>
                      <button
                        onClick={() => handleMarkAsPaid(invoice)}
                        className="flex-1 text-[10px] text-white px-2.5 py-1.5 rounded-md font-semibold transition-all duration-200 hover:opacity-90 active:scale-95"
                        style={{ backgroundColor: PRIMARY_COLOR }}
                      >
                        ✓ Hoàn tất
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* View All Link */}
            {sortedUnpaidInvoices.length > 3 && (
              <div className="mt-3 pt-3 border-t border-slate-200 text-center">
                <button
                  onClick={() => setActiveView('invoices')}
                  className="text-sm text-blue-600 font-semibold hover:text-blue-700 active:scale-95 transition-all"
                >
                  📋 Xem tất cả ({sortedUnpaidInvoices.length}) →
                </button>
              </div>
            )}
          </div>
        )}

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

export default DashboardView;
