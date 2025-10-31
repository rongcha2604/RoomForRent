
import React, { useState } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { PRIMARY_COLOR } from '../../constants';

interface AddReadingModalProps {
  onClose: () => void;
}

interface Warning {
    type: 'error' | 'warning' | 'info' | 'success';
    message: string;
    details?: string;
}

const AddReadingModal: React.FC<AddReadingModalProps> = ({ onClose }) => {
    const { rooms, meters, addReading, readings, leases } = useAppData();
    const [selectedRoom, setSelectedRoom] = useState(rooms[0]?.id.toString() || '');
    const [electricReading, setElectricReading] = useState('');
    const [waterReading, setWaterReading] = useState('');
    const [errors, setErrors] = useState<{electric?: string; water?: string}>({});
    const [warnings, setWarnings] = useState<{electric?: Warning; water?: Warning}>({});
    const [confirmed, setConfirmed] = useState(false);

    // Smart validation function
    const validateReading = (newValue: number, meterId: number, type: 'electric' | 'water'): Warning | undefined => {
        // Get previous reading
        const previousReading = readings
            .filter(r => r.meterId === meterId)
            .sort((a, b) => b.id - a.id)[0];
        
        const previousValue = previousReading?.value || 0;
        
        // Check if room is empty
        const roomId = parseInt(selectedRoom);
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

    // Update warnings when values change
    React.useEffect(() => {
        const roomId = parseInt(selectedRoom);
        const electricMeter = meters.find(m => m.roomId === roomId && m.type === 'electric');
        const waterMeter = meters.find(m => m.roomId === roomId && m.type === 'water');
        
        const newWarnings: {electric?: Warning; water?: Warning} = {};
        
        if (electricReading && electricMeter) {
            newWarnings.electric = validateReading(parseFloat(electricReading), electricMeter.id, 'electric');
        }
        
        if (waterReading && waterMeter) {
            newWarnings.water = validateReading(parseFloat(waterReading), waterMeter.id, 'water');
        }
        
        setWarnings(newWarnings);
        
        // Reset confirmation when warnings change
        const hasErrorOrWarning = Object.values(newWarnings).some(w => w?.type === 'error' || w?.type === 'warning');
        if (!hasErrorOrWarning) {
            setConfirmed(false);
        }
    }, [electricReading, waterReading, selectedRoom, meters, readings, leases]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Validation
        const newErrors: {electric?: string; water?: string} = {};
        
        if (!electricReading || parseFloat(electricReading) < 0) {
            newErrors.electric = 'Vui lòng nhập chỉ số điện hợp lệ';
        }
        
        if (!waterReading || parseFloat(waterReading) < 0) {
            newErrors.water = 'Vui lòng nhập chỉ số nước hợp lệ';
        }
        
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }
        
        // Check for warnings requiring confirmation
        const hasErrorOrWarning = Object.values(warnings).some(w => w?.type === 'error' || w?.type === 'warning');
        if (hasErrorOrWarning && !confirmed) {
            alert('⚠️ Vui lòng xác nhận bạn đã kiểm tra và chỉ số này đúng!');
            return;
        }
        
        try {
            const roomId = parseInt(selectedRoom);
            const currentPeriod = new Date().toISOString().slice(0, 7); // YYYY-MM
            
            // Find electric and water meters for this room
            const electricMeter = meters.find(m => m.roomId === roomId && m.type === 'electric');
            const waterMeter = meters.find(m => m.roomId === roomId && m.type === 'water');
            
            // Save electric reading
            if (electricMeter) {
                await addReading({
                    meterId: electricMeter.id,
                    period: currentPeriod,
                    value: parseFloat(electricReading)
                });
            }
            
            // Save water reading
            if (waterMeter) {
                await addReading({
                    meterId: waterMeter.id,
                    period: currentPeriod,
                    value: parseFloat(waterReading)
                });
            }
            
            alert('✅ Đã ghi nhận chỉ số thành công!');
            
            // Wait for state to propagate before closing
            setTimeout(() => {
                console.log('🔄 Closing modal after state propagation');
                onClose();
            }, 500);
        } catch (error) {
            console.error('Error adding readings:', error);
            alert('❌ Có lỗi xảy ra khi lưu chỉ số!');
        }
    };

    // Helper to get warning color classes
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

    // Get previous readings for display
    const roomId = parseInt(selectedRoom);
    const electricMeter = meters.find(m => m.roomId === roomId && m.type === 'electric');
    const waterMeter = meters.find(m => m.roomId === roomId && m.type === 'water');
    
    const prevElectric = readings
        .filter(r => r.meterId === electricMeter?.id)
        .sort((a, b) => b.id - a.id)[0]?.value || 0;
    
    const prevWater = readings
        .filter(r => r.meterId === waterMeter?.id)
        .sort((a, b) => b.id - a.id)[0]?.value || 0;

    const hasErrorOrWarning = Object.values(warnings).some(w => w?.type === 'error' || w?.type === 'warning');

    return (
        <Modal title="Thêm chỉ số mới" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="room" className="block text-sm font-medium text-slate-700">Chọn phòng</label>
                    <select id="room" value={selectedRoom} onChange={(e) => {setSelectedRoom(e.target.value); setElectricReading(''); setWaterReading(''); setWarnings({});}} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md">
                        {rooms.map(room => (
                            <option key={room.id} value={room.id}>{room.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="electric" className="block text-sm font-medium text-slate-700">Chỉ số điện (kWh)</label>
                    {prevElectric > 0 && <p className="text-xs text-slate-500 mt-0.5">Lần trước: {prevElectric} kWh</p>}
                    <input 
                        type="number" 
                        id="electric" 
                        value={electricReading} 
                        onChange={(e) => {
                            setElectricReading(e.target.value);
                            setErrors(prev => ({...prev, electric: undefined}));
                        }} 
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${errors.electric ? 'border-red-500' : 'border-slate-300'}`}
                        placeholder="VD: 1234"
                        step="0.1"
                    />
                    {errors.electric && <p className="mt-1 text-xs text-red-600">{errors.electric}</p>}
                    {warnings.electric && (
                        <div className={`mt-2 p-2 rounded-md ${getWarningColorClass(warnings.electric.type)}`}>
                            <p className="text-sm font-semibold">{warnings.electric.message}</p>
                            {warnings.electric.details && <p className="text-xs mt-1">{warnings.electric.details}</p>}
                        </div>
                    )}
                </div>
                 <div>
                    <label htmlFor="water" className="block text-sm font-medium text-slate-700">Chỉ số nước (m³)</label>
                    {prevWater > 0 && <p className="text-xs text-slate-500 mt-0.5">Lần trước: {prevWater} m³</p>}
                    <input 
                        type="number" 
                        id="water" 
                        value={waterReading} 
                        onChange={(e) => {
                            setWaterReading(e.target.value);
                            setErrors(prev => ({...prev, water: undefined}));
                        }} 
                        className={`mt-1 block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm ${errors.water ? 'border-red-500' : 'border-slate-300'}`}
                        placeholder="VD: 123"
                        step="0.1"
                    />
                    {errors.water && <p className="mt-1 text-xs text-red-600">{errors.water}</p>}
                    {warnings.water && (
                        <div className={`mt-2 p-2 rounded-md ${getWarningColorClass(warnings.water.type)}`}>
                            <p className="text-sm font-semibold">{warnings.water.message}</p>
                            {warnings.water.details && <p className="text-xs mt-1">{warnings.water.details}</p>}
                        </div>
                    )}
                </div>
                {hasErrorOrWarning && (
                    <div className="pt-2 pb-2">
                        <label className="flex items-start">
                            <input 
                                type="checkbox" 
                                checked={confirmed}
                                onChange={(e) => setConfirmed(e.target.checked)}
                                className="mt-1 h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 rounded"
                            />
                            <span className="ml-2 text-sm text-slate-700">
                                <strong>Tôi đã kiểm tra và xác nhận chỉ số này là chính xác</strong>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    (Bắt buộc khi có cảnh báo hoặc lỗi)
                                </p>
                            </span>
                        </label>
                    </div>
                )}
                <div className="pt-2">
                    <button type="submit" className="w-full text-white font-bold py-3 px-4 rounded-xl transition duration-300" style={{ backgroundColor: PRIMARY_COLOR }}>Lưu lại</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddReadingModal;
