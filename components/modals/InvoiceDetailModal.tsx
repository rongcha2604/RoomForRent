import React from 'react';
import Modal from './Modal';
import { type Invoice, type Lease, type Room, type Tenant } from '../../types';
import { PRIMARY_COLOR } from '../../constants';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  lease: Lease;
  room: Room;
  tenant: Tenant;
  onClose: () => void;
  onMarkAsPaid?: () => void;
}

const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({ 
  invoice, 
  lease, 
  room, 
  tenant, 
  onClose,
  onMarkAsPaid 
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatDate = (period: string) => {
    const [year, month] = period.split('-');
    return `Tháng ${month}/${year}`;
  };

  return (
    <Modal title="Chi Tiết Hóa Đơn" onClose={onClose}>
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-slate-50 p-4 rounded-xl">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-lg">{room.name}</h3>
              <p className="text-sm text-slate-600">Khách thuê: {tenant.fullName}</p>
              {tenant.phone && <p className="text-sm text-slate-600">SĐT: {tenant.phone}</p>}
            </div>
            <div className="text-right">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                invoice.status === 'paid' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {invoice.status === 'paid' ? '✓ Đã Thanh Toán' : '⏳ Chưa Thanh Toán'}
              </span>
              <p className="text-sm text-slate-600 mt-2">{formatDate(invoice.period)}</p>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">📋 Chi tiết thanh toán:</h4>
          
          <div className="flex justify-between py-2 border-b border-slate-200">
            <span className="text-slate-600">🏠 Tiền thuê phòng</span>
            <span className="font-semibold">{formatCurrency(invoice.rent)}</span>
          </div>

          {invoice.electricUsage !== undefined && invoice.electricUsage > 0 && (
            <div className="flex justify-between py-2 border-b border-slate-200">
              <div>
                <span className="text-slate-600">⚡ Tiền điện</span>
                <span className="text-xs text-slate-500 ml-2">
                  ({invoice.electricUsage} kWh)
                </span>
              </div>
              <span className="font-semibold">{formatCurrency(invoice.electricCost || 0)}</span>
            </div>
          )}

          {invoice.waterUsage !== undefined && invoice.waterUsage > 0 && (
            <div className="flex justify-between py-2 border-b border-slate-200">
              <div>
                <span className="text-slate-600">💧 Tiền nước</span>
                <span className="text-xs text-slate-500 ml-2">
                  ({invoice.waterUsage} m³)
                </span>
              </div>
              <span className="font-semibold">{formatCurrency(invoice.waterCost || 0)}</span>
            </div>
          )}

          {invoice.otherFees > 0 && (
            <div className="py-2 border-b border-slate-200">
              <div className="flex justify-between mb-1">
                <span className="text-slate-600">📡 Dịch vụ khác</span>
                <span className="font-semibold">{formatCurrency(invoice.otherFees)}</span>
              </div>
              <div className="ml-4 space-y-0.5 text-xs text-slate-500">
                {lease.wifiFee > 0 && (
                  <div className="flex justify-between">
                    <span>• Wifi</span>
                    <span>{formatCurrency(lease.wifiFee)}</span>
                  </div>
                )}
                {lease.trashFee > 0 && (
                  <div className="flex justify-between">
                    <span>• Rác</span>
                    <span>{formatCurrency(lease.trashFee)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between py-3 bg-slate-50 px-4 rounded-xl">
            <span className="text-lg font-bold">💰 TỔNG CỘNG</span>
            <span className="text-xl font-bold" style={{ color: PRIMARY_COLOR }}>
              {formatCurrency(invoice.total)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 space-y-2">
          {invoice.status === 'unpaid' && onMarkAsPaid && (
            <button
              onClick={() => {
                onMarkAsPaid();
                onClose();
              }}
              className="w-full text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 hover:opacity-90 active:scale-95"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              ✓ Đánh dấu đã thanh toán
            </button>
          )}
          
          <button
            onClick={onClose}
            className="w-full bg-slate-200 text-slate-700 font-semibold py-3 px-4 rounded-xl transition-all duration-200 hover:bg-slate-300 active:scale-95"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default InvoiceDetailModal;


