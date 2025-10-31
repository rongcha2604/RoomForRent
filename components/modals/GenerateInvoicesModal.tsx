
import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { PRIMARY_COLOR } from '../../constants';
import { type Room, type Lease, type Reading, type Invoice } from '../../types';
import { buildInvoice } from '../../services/billing';
import { 
    createInvoiceDraft, 
    convertToAppInvoice, 
    createPeriodForNewLease,
    formatPeriod,
    isFullMonth
} from '../../services/billingAdapter';
import { calculateProRataRent } from '../../services/proRataCalculator';

interface GenerateInvoicesModalProps {
  onClose: () => void;
}

interface Warning {
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
    details?: string;
}

interface InvoiceDraft {
    lease: Lease;
    room: Room;
    tenantName: string;
    lastElectricReading: number;
    lastWaterReading: number;
    newElectricReading: string;
    newWaterReading: string;
    calculatedInvoice: Omit<Invoice, 'id' | 'status'> | null;
    electricWarning?: Warning;
    waterWarning?: Warning;
    confirmed: boolean;
    rentBreakdown?: Array<{ tenantId: number; tenantName: string; days: number; rentShare: number }>;
}

const getPeriodString = (date: Date) => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
}

const getPreviousPeriod = (period: string) => {
    const [year, month] = period.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return getPeriodString(date);
}

const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);


const GenerateInvoicesModal: React.FC<GenerateInvoicesModalProps> = ({ onClose }) => {
    const { rooms, tenants, leases, meters, readings, invoices, settings, expenses, addInvoice, addReading, addExpense } = useAppData();
    const [period, setPeriod] = useState(getPeriodString(new Date()));
    const [drafts, setDrafts] = useState<InvoiceDraft[]>([]);
    const [useProRate, setUseProRate] = useState(true); // Pro-rate enabled by default
    const [recurringExpensesGenerated, setRecurringExpensesGenerated] = useState(false);
    
    // Smart validation function
    const validateReading = (newValue: number, meterId: number, type: 'electric' | 'water', roomId: number): Warning | undefined => {
        // Get previous reading
        const previousReading = readings
            .filter(r => r.meterId === meterId)
            .sort((a, b) => b.id - a.id)[0];
        
        const previousValue = previousReading?.value || 0;
        
        // Check if room is empty
        const isRoomEmpty = !leases.some(l => l.roomId === roomId && l.status === 'active');
        
        // Calculate usage and percentage
        const usage = newValue - previousValue;
        const avgUsage = type === 'electric' ? 100 : 10; // Average monthly usage
        const percentIncrease = previousValue > 0 ? (usage / avgUsage) * 100 : 0;
        
        // First reading
        if (!previousReading || previousValue === 0) {
            return {
                type: 'info',
                message: '📊 Lần đầu ghi chỉ số',
                details: 'Chỉ số này sẽ là baseline cho lần sau'
            };
        }
        
        // Decreased reading (ERROR)
        if (newValue < previousValue) {
            return {
                type: 'error',
                message: '⛔ Chỉ số giảm!',
                details: `Lần trước: ${previousValue}, Lần này: ${newValue}. Kiểm tra lại!`
            };
        }
        
        // Empty room consuming (WARNING)
        if (isRoomEmpty && usage > (type === 'electric' ? 10 : 1)) {
            return {
                type: 'warning',
                message: '🏚️ Phòng trống vẫn tiêu thụ!',
                details: `Dùng ${usage.toFixed(1)} ${type === 'electric' ? 'kWh' : 'm³'}. Kiểm tra rò rỉ/thiết bị quên tắt?`
            };
        }
        
        // Abnormal increase (WARNING)
        if (percentIncrease > 200) {
            return {
                type: 'warning',
                message: '🔥 Tăng đột ngột!',
                details: `Dùng ${usage.toFixed(1)} ${type === 'electric' ? 'kWh' : 'm³'} (+${percentIncrease.toFixed(0)}%). Máy lạnh hỏng? Khách để 24/7?`
            };
        }
        
        // High increase (INFO)
        if (percentIncrease > 50) {
            return {
                type: 'info',
                message: 'ℹ️ Cao hơn bình thường',
                details: `Dùng ${usage.toFixed(1)} ${type === 'electric' ? 'kWh' : 'm³'} (+${percentIncrease.toFixed(0)}% so với TB)`
            };
        }
        
        // Normal (SUCCESS)
        return {
            type: 'success',
            message: '✅ Bình thường',
            details: `Dùng ${usage.toFixed(1)} ${type === 'electric' ? 'kWh' : 'm³'}`
        };
    };

    // Auto-generate recurring expenses for new period
    useEffect(() => {
        if (recurringExpensesGenerated) return;
        
        // Get all recurring expense templates
        const recurringTemplates = expenses.filter(e => e.isRecurring);
        
        // Check if we already have these expenses for current period
        const existingExpensesThisPeriod = expenses.filter(e => e.period === period);
        
        const expensesToCreate = recurringTemplates.filter(template => {
            // Check if this template already exists for this period
            return !existingExpensesThisPeriod.some(existing => 
                existing.category === template.category && 
                existing.description === template.description
            );
        });
        
        if (expensesToCreate.length > 0) {
            // Auto-create recurring expenses
            expensesToCreate.forEach(async (template) => {
                const firstDayOfMonth = `${period}-01`;
                await addExpense({
                    category: template.category,
                    amount: template.amount,
                    date: firstDayOfMonth,
                    period: period,
                    description: template.description,
                    isRecurring: true,
                    roomId: template.roomId,
                    note: `Tự động tạo từ chi phí cố định`
                });
            });
            console.log(`✅ Auto-generated ${expensesToCreate.length} recurring expenses for period ${period}`);
        }
        
        setRecurringExpensesGenerated(true);
    }, [period, expenses, addExpense, recurringExpensesGenerated]);

    useEffect(() => {
        const activeLeases = leases.filter(l => l.status === 'active');
        
        const leasesWithoutInvoice = activeLeases.filter(lease => 
            !invoices.some(invoice => invoice.leaseId === lease.id && invoice.period === period)
        );

        const prevPeriod = getPreviousPeriod(period);

        const newDrafts = leasesWithoutInvoice.map(lease => {
            const room = rooms.find(r => r.id === lease.roomId);
            const tenant = tenants.find(t => t.id === lease.tenantId);
            const electricMeter = meters.find(m => m.roomId === lease.roomId && m.type === 'electric');
            const waterMeter = meters.find(m => m.roomId === lease.roomId && m.type === 'water');

            const lastElectricReading = readings
                .filter(r => r.meterId === electricMeter?.id && r.period === prevPeriod)
                .sort((a, b) => b.id - a.id)[0]?.value || 0;
            
            const lastWaterReading = readings
                .filter(r => r.meterId === waterMeter?.id && r.period === prevPeriod)
                .sort((a, b) => b.id - a.id)[0]?.value || 0;

            // Calculate rent breakdown if multiple participants
            let rentBreakdown = undefined;
            if (lease.participants && lease.participants.length > 1) {
                const [year, month] = period.split('-').map(Number);
                const lastDay = new Date(year, month, 0).getDate();
                const billingPeriod = {
                    start: `${period}-01`,
                    end: `${period}-${lastDay.toString().padStart(2, '0')}`
                };
                
                try {
                    const breakdown = calculateProRataRent({
                        monthlyRent: lease.monthlyRent,
                        participants: lease.participants,
                        billingPeriod
                    });
                    
                    rentBreakdown = breakdown.map(b => ({
                        ...b,
                        tenantName: tenants.find(t => t.id === b.tenantId)?.fullName || 'Unknown'
                    }));
                } catch (error) {
                    console.error('Error calculating rent breakdown:', error);
                }
            }

            return {
                lease,
                room,
                tenantName: tenant?.fullName || 'N/A',
                lastElectricReading,
                lastWaterReading,
                newElectricReading: '',
                newWaterReading: '',
                calculatedInvoice: null,
                confirmed: false,
                rentBreakdown
            };
        }).filter(d => d.room); // Ensure room exists

        setDrafts(newDrafts as InvoiceDraft[]);

    }, [period, rooms, tenants, leases, meters, readings, invoices]);
    
    // Recalculate all invoices when pro-rate option changes
    useEffect(() => {
        // Skip recalculation if drafts haven't been populated yet
        if (drafts.length === 0) return;
        
        const updatedDrafts = drafts.map(draft => {
            if (draft.newElectricReading && draft.newWaterReading) {
                // Trigger recalculation
                const newElec = parseFloat(draft.newElectricReading);
                const newWat = parseFloat(draft.newWaterReading);
                
                if (!isNaN(newElec) && !isNaN(newWat) && newElec >= draft.lastElectricReading && newWat >= draft.lastWaterReading) {
                    try {
                        const electricMeter = meters.find(m => m.roomId === draft.room.id && m.type === 'electric');
                        const waterMeter = meters.find(m => m.roomId === draft.room.id && m.type === 'water');
                        
                        const billingPeriod = useProRate 
                            ? createPeriodForNewLease(draft.lease, period)
                            : { 
                                start: `${period}-01`, 
                                end: (() => {
                                    const [y, m] = period.split('-').map(Number);
                                    const nextMonth = new Date(Date.UTC(y, m, 1));
                                    return nextMonth.toISOString().slice(0, 10);
                                })()
                            };
                        
                        const invoiceDraft = createInvoiceDraft({
                            lease: draft.lease,
                            room: draft.room,
                            period: billingPeriod,
                            electricMeter,
                            waterMeter,
                            prevElectricReading: { id: 0, meterId: electricMeter?.id || 0, period: '', value: draft.lastElectricReading },
                            currElectricReading: { id: 0, meterId: electricMeter?.id || 0, period: '', value: newElec },
                            prevWaterReading: { id: 0, meterId: waterMeter?.id || 0, period: '', value: draft.lastWaterReading },
                            currWaterReading: { id: 0, meterId: waterMeter?.id || 0, period: '', value: newWat }
                        });
                        
                        const result = buildInvoice(invoiceDraft);
                        draft.calculatedInvoice = convertToAppInvoice(result, draft.lease.id, period);
                    } catch (error) {
                        console.error('Error recalculating invoice:', error);
                    }
                }
            }
            return draft;
        });
        setDrafts(updatedDrafts);
    }, [useProRate]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleReadingChange = (index: number, type: 'electric' | 'water', value: string) => {
        const newDrafts = [...drafts];
        const draft = newDrafts[index];
        if (type === 'electric') draft.newElectricReading = value;
        if (type === 'water') draft.newWaterReading = value;
        
        // Run validation
        const roomId = draft.lease.roomId;
        const meter = meters.find(m => m.roomId === roomId && m.type === type);
        if (meter && value) {
            const warning = validateReading(
                parseFloat(value),
                meter.id,
                type,
                roomId
            );
            if (type === 'electric') draft.electricWarning = warning;
            if (type === 'water') draft.waterWarning = warning;
        }
        
        // Reset confirmation if warnings change
        const hasErrorOrWarning = 
            draft.electricWarning?.type === 'error' || 
            draft.electricWarning?.type === 'warning' ||
            draft.waterWarning?.type === 'error' ||
            draft.waterWarning?.type === 'warning';
        
        if (!hasErrorOrWarning) {
            draft.confirmed = false;
        }
        
        // Recalculate invoice using billing library
        const newElec = parseFloat(draft.newElectricReading);
        const newWat = parseFloat(draft.newWaterReading);

        if (!isNaN(newElec) && !isNaN(newWat) && newElec >= draft.lastElectricReading && newWat >= draft.lastWaterReading) {
            try {
                const electricMeter = meters.find(m => m.roomId === draft.room.id && m.type === 'electric');
                const waterMeter = meters.find(m => m.roomId === draft.room.id && m.type === 'water');
                
                // Create period for billing
                const billingPeriod = useProRate 
                    ? createPeriodForNewLease(draft.lease, period)
                    : { 
                        start: `${period}-01`, 
                        end: (() => {
                            const [y, m] = period.split('-').map(Number);
                            const nextMonth = new Date(Date.UTC(y, m, 1));
                            return nextMonth.toISOString().slice(0, 10);
                        })()
                    };
                
                // Create invoice draft for billing library
                const invoiceDraft = createInvoiceDraft({
                    lease: draft.lease,
                    room: draft.room,
                    period: billingPeriod,
                    electricMeter,
                    waterMeter,
                    prevElectricReading: { id: 0, meterId: electricMeter?.id || 0, period: '', value: draft.lastElectricReading },
                    currElectricReading: { id: 0, meterId: electricMeter?.id || 0, period: '', value: newElec },
                    prevWaterReading: { id: 0, meterId: waterMeter?.id || 0, period: '', value: draft.lastWaterReading },
                    currWaterReading: { id: 0, meterId: waterMeter?.id || 0, period: '', value: newWat }
                });
                
                // Build invoice using billing library
                const result = buildInvoice(invoiceDraft);
                
                // Convert to app invoice format
                draft.calculatedInvoice = convertToAppInvoice(result, draft.lease.id, period);
                
            } catch (error) {
                console.error('Error calculating invoice:', error);
                draft.calculatedInvoice = null;
            }
        } else {
            draft.calculatedInvoice = null;
        }

        setDrafts(newDrafts);
    }
    
    const getWarningColorClass = (type: Warning['type']) => {
        switch (type) {
            case 'error':
                return 'bg-red-50 text-red-700 border border-red-200';
            case 'warning':
                return 'bg-orange-50 text-orange-700 border border-orange-200';
            case 'info':
                return 'bg-blue-50 text-blue-700 border border-blue-200';
            case 'success':
                return 'bg-green-50 text-green-700 border border-green-200';
        }
    };

    const handleConfirmationChange = (index: number, checked: boolean) => {
        const newDrafts = [...drafts];
        newDrafts[index].confirmed = checked;
        setDrafts(newDrafts);
    };
    
    const handleGenerateAll = async () => {
        const validDrafts = drafts.filter(d => d.calculatedInvoice);
        if (validDrafts.length !== drafts.length) {
            alert('Vui lòng nhập đầy đủ và hợp lệ các chỉ số điện nước.');
            return;
        }
        
        // Check for unconfirmed errors/warnings
        const unconfirmed = drafts.filter(d => {
            const hasErrorOrWarning = 
                d.electricWarning?.type === 'error' || 
                d.electricWarning?.type === 'warning' ||
                d.waterWarning?.type === 'error' ||
                d.waterWarning?.type === 'warning';
            return hasErrorOrWarning && !d.confirmed;
        });
        
        if (unconfirmed.length > 0) {
            const roomNames = unconfirmed.map(d => d.room.name).join(', ');
            alert(`⚠️ Các phòng sau có cảnh báo chưa xác nhận:\n${roomNames}\n\nVui lòng tick xác nhận đã kiểm tra!`);
            return;
        }

        try {
            // Process each draft: save readings + create invoice
            for (const draft of validDrafts) {
                const { calculatedInvoice } = draft;
                
                const electricMeter = meters.find(m => m.roomId === draft.room.id && m.type === 'electric');
                const waterMeter = meters.find(m => m.roomId === draft.room.id && m.type === 'water');
                
                // Save electric reading
                if (electricMeter) {
                    await addReading({
                        meterId: electricMeter.id,
                        period: period,
                        value: parseFloat(draft.newElectricReading)
                    });
                }
                
                // Save water reading
                if (waterMeter) {
                    await addReading({
                        meterId: waterMeter.id,
                        period: period,
                        value: parseFloat(draft.newWaterReading)
                    });
                }
                
                // Create invoice
                await addInvoice({ ...calculatedInvoice!, status: 'unpaid' });
            }

            alert(`✅ Đã lưu chỉ số và tạo thành công ${validDrafts.length} hóa đơn!`);
            
            // Wait for state to propagate before closing
            setTimeout(() => {
                console.log('🔄 Closing modal after state propagation');
                onClose();
            }, 500);
        } catch (error) {
            console.error('Error generating invoices:', error);
            alert('❌ Có lỗi xảy ra khi tạo hóa đơn! Vui lòng thử lại.');
        }
    }
    
    const allValid = useMemo(() => drafts.every(d => d.calculatedInvoice), [drafts]);

    return (
        <Modal title={`Tạo hóa đơn tháng ${period}`} onClose={onClose}>
            {drafts.length === 0 ? (
                <p className="text-center text-slate-500 py-8">Tất cả các phòng đã có hóa đơn cho tháng này.</p>
            ) : (
                <div className="space-y-4">
                    {/* Pro-rate Option */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <label className="flex items-start text-sm cursor-pointer">
                            <input 
                                type="checkbox"
                                checked={useProRate}
                                onChange={(e) => setUseProRate(e.target.checked)}
                                className="mt-0.5 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                            />
                            <div className="ml-2">
                                <span className="font-semibold text-blue-900">
                                    Tính pro-rate (khách vào giữa tháng)
                                </span>
                                <p className="text-xs text-blue-700 mt-0.5">
                                    Tự động tính tiền phòng theo số ngày thực tế. 
                                    {useProRate ? ' Đang BẬT ✓' : ' Đang TẮT (tính full tháng)'}
                                </p>
                            </div>
                        </label>
                    </div>
                    {drafts.map((draft, index) => (
                        <div key={draft.lease.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                           <h3 className="font-bold text-lg">{draft.room.name} <span className="font-normal text-sm">({draft.tenantName})</span></h3>
                           <div className="grid grid-cols-2 gap-4 mt-2">
                               <div>
                                   <label className="text-sm font-medium text-slate-600">Điện (kWh)</label>
                                   <p className="text-xs text-slate-500">Lần trước: {draft.lastElectricReading} kWh</p>
                                   <input type="number"
                                          placeholder="Nhập chỉ số mới"
                                          value={draft.newElectricReading}
                                          onChange={e => handleReadingChange(index, 'electric', e.target.value)}
                                          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                   />
                                   {draft.electricWarning && (
                                       <div className={`mt-1.5 p-2 rounded-md text-xs ${getWarningColorClass(draft.electricWarning.type)}`}>
                                           <p className="font-semibold">{draft.electricWarning.message}</p>
                                           {draft.electricWarning.details && (
                                               <p className="mt-0.5">{draft.electricWarning.details}</p>
                                           )}
                                       </div>
                                   )}
                               </div>
                               <div>
                                   <label className="text-sm font-medium text-slate-600">Nước (m³)</label>
                                   <p className="text-xs text-slate-500">Lần trước: {draft.lastWaterReading} m³</p>
                                   <input type="number"
                                          placeholder="Nhập chỉ số mới"
                                          value={draft.newWaterReading}
                                          onChange={e => handleReadingChange(index, 'water', e.target.value)}
                                          className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm"
                                   />
                                   {draft.waterWarning && (
                                       <div className={`mt-1.5 p-2 rounded-md text-xs ${getWarningColorClass(draft.waterWarning.type)}`}>
                                           <p className="font-semibold">{draft.waterWarning.message}</p>
                                           {draft.waterWarning.details && (
                                               <p className="mt-0.5">{draft.waterWarning.details}</p>
                                           )}
                                       </div>
                                   )}
                               </div>
                           </div>
                           {(draft.electricWarning?.type === 'error' || 
                             draft.electricWarning?.type === 'warning' ||
                             draft.waterWarning?.type === 'error' ||
                             draft.waterWarning?.type === 'warning') && (
                               <div className="mt-2 pt-2 border-t border-slate-300">
                                   <label className="flex items-start text-xs">
                                       <input 
                                           type="checkbox"
                                           checked={draft.confirmed}
                                           onChange={(e) => handleConfirmationChange(index, e.target.checked)}
                                           className="mt-0.5 h-3.5 w-3.5 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                                       />
                                       <span className="ml-2 text-slate-700">
                                           <strong>Đã kiểm tra, xác nhận chỉ số đúng</strong>
                                       </span>
                                   </label>
                               </div>
                           )}
                           {draft.calculatedInvoice && (() => {
                               // Calculate period info for display
                               const billingPeriod = useProRate 
                                   ? createPeriodForNewLease(draft.lease, period)
                                   : { 
                                       start: `${period}-01`, 
                                       end: (() => {
                                           const [y, m] = period.split('-').map(Number);
                                           const nextMonth = new Date(Date.UTC(y, m, 1));
                                           return nextMonth.toISOString().slice(0, 10);
                                       })()
                                   };
                               const periodDisplay = formatPeriod(billingPeriod);
                               const isProRated = !isFullMonth(billingPeriod);
                               
                               return (
                                   <div className="mt-3 pt-3 border-t text-sm">
                                       {isProRated && (
                                           <div className="mb-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                               <span className="font-semibold">📅 Pro-rate:</span> {periodDisplay}
                                           </div>
                                       )}
                                       <p className="font-bold text-lg text-right mb-2" style={{color: PRIMARY_COLOR}}>{formatCurrency(draft.calculatedInvoice.total)}</p>
                                       <div className="flex justify-between text-slate-600"><span>Tiền phòng{isProRated ? ' (theo ngày)' : ''}:</span><span>{formatCurrency(draft.calculatedInvoice.rent)}</span></div>
                                       
                                       {/* Rent Breakdown for Multiple Participants */}
                                       {draft.rentBreakdown && draft.rentBreakdown.length > 0 && (
                                           <div className="ml-4 mt-1 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                                               <p className="font-semibold text-yellow-800 mb-1">👥 Phân bổ tiền phòng:</p>
                                               {draft.rentBreakdown.map(b => (
                                                   <div key={b.tenantId} className="flex justify-between text-yellow-700 mb-0.5">
                                                       <span>{b.tenantName} ({b.days} ngày):</span>
                                                       <span className="font-semibold">{formatCurrency(b.rentShare)}</span>
                                                   </div>
                                               ))}
                                           </div>
                                       )}
                                       
                                       <div className="flex justify-between text-slate-600"><span>Điện ({draft.calculatedInvoice.electricUsage} kWh):</span><span>{formatCurrency(draft.calculatedInvoice.electricCost || 0)}</span></div>
                                       <div className="flex justify-between text-slate-600"><span>Nước ({draft.calculatedInvoice.waterUsage} m³):</span><span>{formatCurrency(draft.calculatedInvoice.waterCost || 0)}</span></div>
                                       <div className="flex justify-between text-slate-600"><span>Phí khác:</span><span>{formatCurrency(draft.calculatedInvoice.otherFees)}</span></div>
                                   </div>
                               );
                           })()}
                        </div>
                    ))}
                    <div className="pt-2">
                        <button
                            onClick={handleGenerateAll}
                            disabled={!allValid}
                            className="w-full text-white font-bold py-3 px-4 rounded-xl transition duration-300 disabled:bg-slate-400"
                            style={{ backgroundColor: allValid ? PRIMARY_COLOR : undefined }}
                        >
                            Tạo {drafts.length} hoá đơn
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};

export default GenerateInvoicesModal;
