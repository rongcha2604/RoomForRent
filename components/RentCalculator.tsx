import React, { useState, useMemo } from 'react';

/**
 * RentCalculator Component
 * Công cụ tính toán tiền thuê với 2 chế độ thanh toán:
 * 1. Đóng trước - Ở sau (Advance): Duy trì số dư = giá phòng tháng kế
 * 2. Cọc cố định (Deposit): Thu đủ chi phí kỳ hiện tại, không đụng cọc
 */

interface RentCalculatorProps {
  className?: string;
}

const RentCalculator: React.FC<RentCalculatorProps> = ({ className = '' }) => {
  // Collapsible state
  const [isExpanded, setIsExpanded] = useState(false);

  // State management
  const [paymentMode, setPaymentMode] = useState<'advance' | 'deposit'>('advance');
  const [depositAmount, setDepositAmount] = useState<number | ''>(1_800_000);
  const [roomPrice, setRoomPrice] = useState<number | ''>(1_800_000);
  const [moveInDate, setMoveInDate] = useState('');
  const [moveOutDate, setMoveOutDate] = useState('');
  const [paidAmount, setPaidAmount] = useState<number | ''>(0);
  const [rounding, setRounding] = useState<'none' | '1000' | '5000' | '10000'>('none');
  
  // Utility readings
  const [electricStart, setElectricStart] = useState(0);
  const [electricEnd, setElectricEnd] = useState(0);
  const [waterStart, setWaterStart] = useState(0);
  const [waterEnd, setWaterEnd] = useState(0);

  // Calculation Logic
  const result = useMemo(() => {
    // Validate inputs
    const roomPriceNum = typeof roomPrice === 'number' ? roomPrice : 0;
    if (!moveInDate || !roomPrice || roomPriceNum <= 0) {
      return {
        totalFirstPeriod: 0,
        electricUsage: 0,
        waterUsage: 0,
        electricCost: 0,
        waterCost: 0,
        totalUtilityCost: 0,
        totalPeriodCost: 0,
        needToPay: 0,
        remainingBalance: 0,
        modeNote: '',
        daysInMonth: 0,
        daysUsed: 0,
        hasError: true,
        errorMessage: 'Vui lòng nhập đầy đủ thông tin: Giá phòng và Ngày vào'
      };
    }

    // Calculate days
    const start = new Date(moveInDate);
    const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const end = moveOutDate ? new Date(moveOutDate) : endOfMonth;
    
    const daysInMonth = endOfMonth.getDate();
    const daysUsed = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

    // Pro-rata calculation
    let totalFirstPeriod = Math.round((roomPriceNum / daysInMonth) * daysUsed);

    // Apply rounding
    if (rounding !== 'none') {
      const roundingValue = parseInt(rounding);
      totalFirstPeriod = Math.round(totalFirstPeriod / roundingValue) * roundingValue;
    }

    // Utility costs (Electric + Water)
    const electricPrice = 3500; // VND per kWh
    const waterPrice = 15000;   // VND per m³
    const electricUsage = Math.max(0, electricEnd - electricStart);
    const waterUsage = Math.max(0, waterEnd - waterStart);
    const electricCost = electricUsage * electricPrice;
    const waterCost = waterUsage * waterPrice;
    const totalUtilityCost = electricCost + waterCost;

    // Total period cost (room + utilities)
    const totalPeriodCost = totalFirstPeriod + totalUtilityCost;

    // Calculate remaining balance
    const paidAmountNum = typeof paidAmount === 'number' ? paidAmount : 0;
    const remainingBalance = paidAmountNum - totalPeriodCost;

    // Calculate needToPay based on payment mode
    let needToPay = 0;
    let modeNote = '';

    const depositAmountNum = typeof depositAmount === 'number' ? depositAmount : 0;
    if (paymentMode === 'advance') {
      // Đóng trước - Ở sau: Duy trì số dư = giá phòng tháng kế
      needToPay = Math.max(0, roomPriceNum - remainingBalance);
      modeNote = '📊 Đóng trước – Ở sau: Luôn duy trì số dư = đúng giá phòng tháng kế (tiền trả trước). Sau khi thu, khách sẽ có số dư đủ để chi trả tháng tiếp theo.';
    } else {
      // Cọc cố định: Thu đủ chi phí kỳ hiện tại
      needToPay = Math.max(0, totalPeriodCost - paidAmountNum);
      modeNote = `💰 Cọc cố định: Thu đủ chi phí kỳ hiện tại (${totalPeriodCost.toLocaleString('vi-VN')}đ); tiền cọc giữ nguyên ${depositAmountNum.toLocaleString('vi-VN')}đ, không tính vào doanh thu.`;
    }

    return {
      totalFirstPeriod,
      electricUsage,
      waterUsage,
      electricCost,
      waterCost,
      totalUtilityCost,
      totalPeriodCost,
      needToPay,
      remainingBalance,
      modeNote,
      daysInMonth,
      daysUsed,
      hasError: false,
      errorMessage: ''
    };
  }, [paymentMode, roomPrice, moveInDate, moveOutDate, paidAmount, rounding, depositAmount, electricStart, electricEnd, waterStart, waterEnd]);

  // Format currency
  const formatCurrency = (value: number) => {
    return value.toLocaleString('vi-VN') + 'đ';
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 ${className}`}>
      {/* Header - Clickable to toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full bg-gradient-to-r from-teal-500 to-teal-600 p-4 rounded-t-xl text-left hover:from-teal-600 hover:to-teal-700 transition-all"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-base">🧮 Công cụ Tính Tiền Thuê</h3>
            <p className="text-teal-50 text-xs mt-1">
              Tính toán chi phí theo 2 chế độ thanh toán
            </p>
          </div>
          <div className="text-white text-2xl">
            {isExpanded ? '−' : '+'}
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Payment Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              🎯 Kiểu thanh toán
            </label>
            <select
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.target.value as 'advance' | 'deposit')}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="advance">Đóng trước – Ở sau</option>
              <option value="deposit">Cọc cố định (ký quỹ)</option>
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              {paymentMode === 'advance' 
                ? '💡 Khách luôn giữ số dư = giá phòng tháng kế'
                : '💡 Thu đủ tiền kỳ hiện tại, tiền cọc không đụng'
              }
            </p>
          </div>

          {/* Deposit Amount - Label thay đổi theo Payment Mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {paymentMode === 'advance' ? '💰 Tiền ứng trước' : '💰 Tiền cọc cố định'}
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => {
                const val = e.target.value;
                setDepositAmount(val === '' ? '' : Number(val));
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="VD: 1,800,000"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              {paymentMode === 'advance' 
                ? '💡 Số tiền khách ứng trước, dùng trừ vào các kỳ tiếp theo'
                : '💡 Số tiền ký quỹ, giữ nguyên không tính doanh thu'
              }
            </p>
          </div>

          {/* Room Price */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              🏠 Giá phòng (tháng)
            </label>
            <input
              type="number"
              value={roomPrice}
              onChange={(e) => {
                const val = e.target.value;
                setRoomPrice(val === '' ? '' : Number(val));
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="VD: 1,800,000"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                📅 Ngày vào
              </label>
              <input
                type="date"
                value={moveInDate}
                onChange={(e) => setMoveInDate(e.target.value)}
                className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                📅 Ngày ra (tùy chọn)
              </label>
              <input
                type="date"
                value={moveOutDate}
                onChange={(e) => setMoveOutDate(e.target.value)}
                className="w-full px-2 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Utility Readings */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-amber-800 mb-2">
              ⚡💧 Chỉ số Điện/Nước
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ⚡ Điện đầu kỳ (kWh)
                </label>
                <input
                  type="number"
                  value={electricStart}
                  onChange={(e) => {
                    const val = e.target.value;
                    setElectricStart(val === '' ? 0 : Number(val));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  ⚡ Điện cuối kỳ (kWh)
                </label>
                <input
                  type="number"
                  value={electricEnd}
                  onChange={(e) => {
                    const val = e.target.value;
                    setElectricEnd(val === '' ? 0 : Number(val));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  💧 Nước đầu kỳ (m³)
                </label>
                <input
                  type="number"
                  value={waterStart}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWaterStart(val === '' ? 0 : Number(val));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  💧 Nước cuối kỳ (m³)
                </label>
                <input
                  type="number"
                  value={waterEnd}
                  onChange={(e) => {
                    const val = e.target.value;
                    setWaterEnd(val === '' ? 0 : Number(val));
                  }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="0"
                  step="0.1"
                />
              </div>
            </div>
          </div>

          {/* Paid Amount */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              💵 Đã đóng
            </label>
            <input
              type="number"
              value={paidAmount}
              onChange={(e) => {
                const val = e.target.value;
                setPaidAmount(val === '' ? '' : Number(val));
              }}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              placeholder="VD: 3,600,000"
            />
          </div>

          {/* Rounding */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              🔄 Làm tròn tiền phòng
            </label>
            <select
              value={rounding}
              onChange={(e) => setRounding(e.target.value as any)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
            >
              <option value="none">Không làm tròn</option>
              <option value="1000">Làm tròn 1,000đ</option>
              <option value="5000">Làm tròn 5,000đ</option>
              <option value="10000">Làm tròn 10,000đ</option>
            </select>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-200 my-4"></div>

          {/* Results */}
          {result.hasError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-xs text-red-600">⚠️ {result.errorMessage}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Calculation Details */}
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Tháng có:</span>
                  <span className="text-sm font-semibold text-slate-800">{result.daysInMonth} ngày</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Số ngày ở:</span>
                  <span className="text-sm font-semibold text-slate-800">{result.daysUsed} ngày</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Tiền phòng (pro-rata):</span>
                  <span className="text-sm font-semibold text-teal-600">
                    {formatCurrency(result.totalFirstPeriod)}
                  </span>
                </div>
                
                {/* Electric */}
                {result.electricUsage > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">
                      ⚡ Điện ({result.electricUsage} kWh × 3,500đ):
                    </span>
                    <span className="text-sm font-semibold text-amber-600">
                      {formatCurrency(result.electricCost)}
                    </span>
                  </div>
                )}
                
                {/* Water */}
                {result.waterUsage > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-slate-600">
                      💧 Nước ({result.waterUsage} m³ × 15,000đ):
                    </span>
                    <span className="text-sm font-semibold text-blue-600">
                      {formatCurrency(result.waterCost)}
                    </span>
                  </div>
                )}
                
                {/* Total Period Cost */}
                {result.totalUtilityCost > 0 && (
                  <div className="border-t border-slate-300 pt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-700">Tổng chi phí kỳ:</span>
                      <span className="text-sm font-bold text-teal-700">
                        {formatCurrency(result.totalPeriodCost)}
                      </span>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Đã đóng:</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {formatCurrency(paidAmount)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-600">Số dư còn lại:</span>
                  <span className={`text-sm font-semibold ${result.remainingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(result.remainingBalance)}
                  </span>
                </div>
              </div>

              {/* Need to Pay - Highlight */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg p-4 text-white shadow-lg">
                <p className="text-xs font-medium mb-1">💳 Cần thu tại ngày chốt:</p>
                <p className="text-3xl font-bold">{formatCurrency(result.needToPay)}</p>
              </div>

              {/* Mode Note */}
              <div className={`rounded-lg p-3 ${paymentMode === 'advance' ? 'bg-blue-50 border border-blue-200' : 'bg-purple-50 border border-purple-200'}`}>
                <p className={`text-xs ${paymentMode === 'advance' ? 'text-blue-700' : 'text-purple-700'}`}>
                  {result.modeNote}
                </p>
                <p className="text-xs mt-2 font-semibold" style={{ color: paymentMode === 'advance' ? '#1e40af' : '#7e22ce' }}>
                  💰 {paymentMode === 'advance' ? 'Tiền ứng trước' : 'Tiền cọc cố định'}: {formatCurrency(depositAmountNum)}
                </p>
              </div>

              {/* Additional Info for Advance Mode */}
              {paymentMode === 'advance' && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-xs text-teal-700">
                    <span className="font-semibold">Sau khi thu:</span> Số dư sẽ là {formatCurrency(roomPriceNum)} 
                    {' '}(đủ chi trả tháng kế)
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RentCalculator;
