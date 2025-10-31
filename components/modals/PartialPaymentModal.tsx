import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import type { Invoice } from '../../types';

interface PartialPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
}

const PartialPaymentModal: React.FC<PartialPaymentModalProps> = ({ invoice, onClose }) => {
  const { updateInvoice, rooms, leases, tenants } = useAppData();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get related data
  const lease = leases.find(l => l.id === invoice.leaseId);
  const room = lease ? rooms.find(r => r.id === lease.roomId) : undefined;
  const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : undefined;

  // Calculate remaining debt
  const remainingDebt = useMemo(() => {
    return invoice.total - invoice.amountPaid;
  }, [invoice]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;

    const paymentAmount = parseFloat(amount);

    // Validation
    if (!paymentAmount || paymentAmount <= 0) {
      alert('⚠️ Vui lòng nhập số tiền hợp lệ!');
      return;
    }

    if (paymentAmount > remainingDebt) {
      alert(`⚠️ Số tiền vượt quá nợ còn lại (${formatCurrency(remainingDebt)})!`);
      return;
    }

    setIsSubmitting(true);

    try {
      const newAmountPaid = invoice.amountPaid + paymentAmount;
      const newStatus = newAmountPaid >= invoice.total ? 'paid' : 'partial';

      await updateInvoice(invoice.id, {
        amountPaid: newAmountPaid,
        status: newStatus as 'unpaid' | 'partial' | 'paid'
      });

      console.log(`✅ Updated invoice ${invoice.id}: amountPaid=${newAmountPaid}, status=${newStatus}`);
      
      // Success message
      if (newStatus === 'paid') {
        alert(`✅ Đã thu đủ ${formatCurrency(invoice.total)}! Hóa đơn hoàn tất.`);
      } else {
        alert(`✅ Đã thu thêm ${formatCurrency(paymentAmount)}. Còn nợ ${formatCurrency(invoice.total - newAmountPaid)}.`);
      }

      // Wait for state to propagate
      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('❌ Có lỗi khi cập nhật hóa đơn!');
      setIsSubmitting(false);
    }
  };

  const handleMarkFullyPaid = async () => {
    if (isSubmitting) return;

    const confirmMsg = `✓ Xác nhận đã thu đủ ${formatCurrency(invoice.total)}?`;
    if (!confirm(confirmMsg)) return;

    setIsSubmitting(true);

    try {
      await updateInvoice(invoice.id, {
        amountPaid: invoice.total,
        status: 'paid'
      });

      console.log(`✅ Marked invoice ${invoice.id} as fully paid`);
      alert(`✅ Đã đánh dấu hóa đơn hoàn tất!`);

      setTimeout(() => {
        onClose();
      }, 300);
    } catch (error) {
      console.error('Error updating invoice:', error);
      alert('❌ Có lỗi khi cập nhật hóa đơn!');
      setIsSubmitting(false);
    }
  };

  return (
    <Modal onClose={onClose}>
      <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">💵 Thu tiền</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        {/* Invoice Info */}
        <div className="bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200">
          <p className="text-sm text-slate-600">
            <span className="font-semibold">{room?.name || 'N/A'}</span> - {tenant?.fullName || 'N/A'}
          </p>
          <p className="text-xs text-slate-500">Kỳ: {invoice.period}</p>
        </div>

        {/* Payment Summary */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Tổng hóa đơn:</span>
            <span className="text-base font-bold text-slate-800">{formatCurrency(invoice.total)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600">Đã thu:</span>
            <span className="text-base font-semibold text-green-600">{formatCurrency(invoice.amountPaid)}</span>
          </div>
          <div className="h-px bg-slate-200"></div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-700">Còn nợ:</span>
            <span className="text-lg font-bold text-orange-600">{formatCurrency(remainingDebt)}</span>
          </div>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              💰 Số tiền thu <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              max={remainingDebt}
              step="1000"
              required
              disabled={isSubmitting}
            />
            <p className="text-xs text-slate-500 mt-1">
              Tối đa: {formatCurrency(remainingDebt)}
            </p>
          </div>

          {/* Note Input (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">
              📝 Ghi chú <span className="text-slate-400 text-xs">(không bắt buộc)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Thu tiền đợt 1, thu qua chuyển khoản..."
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-200 text-slate-700 rounded-lg font-semibold hover:bg-slate-300 transition-colors"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? '⏳ Đang xử lý...' : '✓ Xác nhận thu'}
            </button>
          </div>

          {/* Quick Action: Mark as Fully Paid */}
          <button
            type="button"
            onClick={handleMarkFullyPaid}
            className="w-full px-4 py-2.5 bg-green-50 text-green-700 rounded-lg font-semibold hover:bg-green-100 transition-colors border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            ✓ Đã thanh toán đủ ({formatCurrency(invoice.total)})
          </button>
        </form>
      </div>
    </Modal>
  );
};

export default PartialPaymentModal;

