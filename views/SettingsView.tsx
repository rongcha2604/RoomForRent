
import React, { useState, useRef } from 'react';
import { useAppData } from '../hooks/useAppData';
import Header from '../components/Header';
import RentCalculator from '../components/RentCalculator';
import { type Settings, type View } from '../types';
import { PRIMARY_COLOR } from '../constants';
import { localDb } from '../services/localStorageDb';

// InputField component - MUST be outside SettingsView to prevent re-creation on re-render
interface InputFieldProps {
    label: string;
    name: keyof Settings;
    value: number | '';
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const InputField: React.FC<InputFieldProps> = ({ label, name, value, onChange }) => {
    const formatCurrency = (val: number | ''): string => {
        if (val === '' || val === 0) return '';
        return Number(val).toLocaleString('vi-VN');
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, ''); // Loại bỏ tất cả ký tự không phải số
        // Tạo synthetic event với giá trị đã parse
        const syntheticEvent = {
            ...e,
            target: {
                ...e.target,
                name: e.target.name,
                value: rawValue
            }
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
    };

    return (
        <div>
            <label htmlFor={name} className="block text-xs font-medium text-slate-700">{label}</label>
            <div className="mt-1 relative rounded-md shadow-sm">
                <input
                    type="text"
                    name={name}
                    id={name}
                    value={formatCurrency(value)}
                    onChange={handleChange}
                    className="focus:ring-teal-500 focus:border-teal-500 block w-full pr-12 text-xs border-slate-300 rounded-md py-1.5 px-2.5"
                    placeholder="0"
                />
                <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                    <span className="text-slate-500 text-xs">VND</span>
                </div>
            </div>
        </div>
    );
};

interface SettingsViewProps {
    setActiveView: (view: View) => void;
    currentView: View;
    requestPasswordVerification?: (callback: () => void) => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ setActiveView, currentView, requestPasswordVerification }) => {
    const { settings, updateSettings, exportToDownloads, shareDatabase, importDatabase, showBackupReminder, handleAutoBackup, handleRestoreFromBackup } = useAppData();
    const [formState, setFormState] = useState<Record<keyof Settings, number | ''>>({
        electricPrice: settings.electricPrice || '',
        waterPrice: settings.waterPrice || '',
        wifiPrice: settings.wifiPrice || '',
        trashPrice: settings.trashPrice || '',
        defaultPaymentMode: settings.defaultPaymentMode
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const fieldName = name as keyof Settings;
        setFormState(prev => ({ 
            ...prev, 
            [fieldName]: value === '' ? '' : Number(value) 
        }));
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormState(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = () => {
        // Convert empty string to 0 khi save
        const settingsToSave: Settings = {
            electricPrice: typeof formState.electricPrice === 'number' ? formState.electricPrice : 0,
            waterPrice: typeof formState.waterPrice === 'number' ? formState.waterPrice : 0,
            wifiPrice: typeof formState.wifiPrice === 'number' ? formState.wifiPrice : 0,
            trashPrice: typeof formState.trashPrice === 'number' ? formState.trashPrice : 0,
            defaultPaymentMode: formState.defaultPaymentMode
        };
        updateSettings(settingsToSave);
        alert('Cài đặt đã được lưu!');
    };

    const handleExportToDownloads = async () => {
        await exportToDownloads();
    };

    const handleShareBackup = async () => {
        await shareDatabase();
    };

    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            await importDatabase(file);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const proceedClearData = () => {
        const confirmed2 = window.confirm(
            '⚠️ XÁC NHẬN LẦN CUỐI!\n\n' +
            'Dữ liệu sẽ bị XÓA VĨNH VIỄN!\n\n' +
            'Bấm OK để xác nhận xóa.'
        );
        
        if (!confirmed2) return;
        
        // Clear all data
        localStorage.removeItem('nhatro_data');
        
        // Remove skip flag to allow initial data seeding
        localStorage.removeItem('nhatro_skip_seed');
        
        alert('✅ Đã xóa tất cả dữ liệu!\n\nDatabase sẽ trống hoàn toàn.\nTrang sẽ tải lại...');
        
        // Reload page
        window.location.reload();
    };

    const handleClearData = async () => {
        const confirmed1 = window.confirm(
            '⚠️ XÓA TOÀN BỘ DỮ LIỆU?\n\n' +
            'Hành động này sẽ XÓA:\n' +
            '• Tất cả phòng trọ\n' +
            '• Tất cả khách thuê\n' +
            '• Tất cả hợp đồng\n' +
            '• Tất cả hóa đơn\n' +
            '• Tất cả lịch sử điện/nước\n' +
            '• Tất cả bảo trì\n\n' +
            '❌ KHÔNG THỂ HOÀN TÁC!\n\n' +
            'Database sẽ trống hoàn toàn (không có dữ liệu mẫu).\n\n' +
            'Bạn có chắc chắn muốn tiếp tục?'
        );
        
        if (!confirmed1) return;

        // Check if password is set up
        const security = await localDb.getSecuritySettings();
        
        if (security?.isSetup && requestPasswordVerification) {
            // Request password verification
            requestPasswordVerification(proceedClearData);
        } else {
            // No password set, proceed directly
            proceedClearData();
        }
    };

    return (
        <div>
            <Header title="Cài đặt" />
            <div className="p-3 space-y-4">
                {/* Backup Reminder Banner */}
                {showBackupReminder && (
                    <div className="bg-amber-50 border-2 border-amber-400 p-4 rounded-xl">
                        <div className="flex items-start gap-3">
                            <span className="text-2xl">⚠️</span>
                            <div className="flex-1">
                                <h3 className="font-bold text-sm text-amber-800 mb-1">
                                    Cảnh báo: Bạn chưa backup trong 7 ngày qua!
                                </h3>
                                <p className="text-xs text-amber-700 mb-3">
                                    Hãy backup ngay để đảm bảo an toàn dữ liệu. App sẽ tự động nhớ vị trí bạn chọn.
                                </p>
                                <button
                                    onClick={handleAutoBackup}
                                    className="w-full py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-all active:scale-95 shadow-md text-sm"
                                >
                                    💾 Tự động backup ngay
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 space-y-3">
                    <h3 className="font-bold text-base">Bảng giá dịch vụ</h3>
                    <InputField label="Giá điện (mỗi kWh)" name="electricPrice" value={formState.electricPrice} onChange={handleChange} />
                    <InputField label="Giá nước (mỗi m³)" name="waterPrice" value={formState.waterPrice} onChange={handleChange} />
                    <InputField label="Phí Wifi (hàng tháng)" name="wifiPrice" value={formState.wifiPrice} onChange={handleChange} />
                    <InputField label="Phí rác (hàng tháng)" name="trashPrice" value={formState.trashPrice} onChange={handleChange} />
                    
                    {/* Payment Mode Default */}
                    <div>
                        <label htmlFor="defaultPaymentMode" className="block text-xs font-medium text-slate-700">
                            💳 Phương thức thanh toán mặc định
                        </label>
                        <div className="mt-1">
                            <select
                                name="defaultPaymentMode"
                                id="defaultPaymentMode"
                                value={formState.defaultPaymentMode || 'advance'}
                                onChange={handleSelectChange}
                                className="focus:ring-teal-500 focus:border-teal-500 block w-full text-xs border-slate-300 rounded-md py-2 px-2.5"
                            >
                                <option value="advance">Đóng trước – Ở sau</option>
                                <option value="deposit">Cọc cố định (ký quỹ)</option>
                            </select>
                            <p className="text-[10px] text-slate-500 mt-1">
                                {formState.defaultPaymentMode === 'deposit' 
                                    ? '💡 Mặc định: Thu đủ tiền kỳ hiện tại, tiền cọc không đụng'
                                    : '💡 Mặc định: Khách luôn giữ số dư = giá phòng tháng kế'
                                }
                            </p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="w-full text-white font-semibold py-2 px-4 rounded-xl shadow-md transition duration-300 text-sm"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                >
                    Lưu thay đổi
                </button>

                 {/* Reports Link */}
                 <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                    <h3 className="font-semibold text-sm text-blue-700 mb-2">📊 Báo cáo & Phân tích</h3>
                    <p className="text-xs text-blue-600 mb-3">
                        Xem chi tiết doanh thu, chi phí và quản lý tài chính
                    </p>
                    <button
                        onClick={() => setActiveView('reports')}
                        className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-md"
                    >
                        📊 Xem báo cáo chi tiết
                    </button>
                 </div>

                {/* Rent Calculator Tool */}
                <RentCalculator className="mt-4" />

                 {/* Backup & Restore */}
                 <div className="bg-teal-50 p-4 rounded-xl border border-teal-200">
                    <h3 className="font-semibold text-sm text-teal-700 mb-2">💾 Sao lưu & Khôi phục</h3>
                    <p className="text-xs text-teal-600 mb-3">
                        Backup tự động với nhớ vị trí lưu. App sẽ tự động dùng file backup đã lưu khi restore.
                    </p>
                    
                    {/* Auto Backup Button (Primary) */}
                    <button
                        onClick={handleAutoBackup}
                        className="w-full mb-2 py-2.5 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition-all active:scale-95 shadow-md text-sm"
                    >
                        💾 Tự động backup (App sẽ nhớ vị trí)
                    </button>
                    
                    {/* Restore from Saved Backup */}
                    <button
                        onClick={handleRestoreFromBackup}
                        className="w-full mb-3 py-2.5 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-all active:scale-95 shadow-md text-sm"
                    >
                        🔄 Khôi phục từ file đã lưu
                    </button>
                    
                    {/* Divider */}
                    <div className="border-t border-teal-300 my-3"></div>
                    
                    <p className="text-xs text-teal-600 mb-3 font-medium">
                        Hoặc sử dụng các tùy chọn khác:
                    </p>
                    
                    {/* Save to Device */}
                    <button
                        onClick={handleExportToDownloads}
                        className="w-full mb-2 py-2.5 bg-teal-500 text-white font-semibold rounded-lg hover:bg-teal-600 transition-all active:scale-95 shadow-md text-sm"
                    >
                        📥 Sao lưu vào máy (Documents)
                    </button>
                    
                    {/* Share Backup */}
                    <button
                        onClick={handleShareBackup}
                        className="w-full mb-3 py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-all active:scale-95 shadow-md text-sm"
                    >
                        📤 Chia sẻ backup (Drive/Email...)
                    </button>
                    
                    {/* Divider */}
                    <div className="border-t border-teal-300 my-3"></div>
                    
                    {/* Import File Input (Hidden) */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".json"
                        onChange={handleImportData}
                        style={{ display: 'none' }}
                    />
                    
                    {/* Import Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-2.5 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-all active:scale-95 shadow-md text-sm"
                    >
                        📂 Khôi phục từ file khác (Chọn file JSON)
                    </button>
                    
                    {/* Warning */}
                    <p className="text-[10px] text-red-600 mt-3">
                        ⚠️ Khôi phục sẽ ghi đè toàn bộ dữ liệu hiện tại!
                    </p>
                 </div>

                 {/* Danger Zone */}
                 <div className="bg-red-50 p-4 rounded-xl border-2 border-red-300 space-y-3">
                    <h3 className="font-bold text-base text-red-700">⚠️ Vùng Nguy Hiểm</h3>
                    <p className="text-xs text-red-600">
                        Các hành động dưới đây không thể hoàn tác!
                    </p>
                    <button 
                        onClick={handleClearData}
                        className="w-full text-white font-bold py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 transition text-sm shadow-md"
                    >
                        🗑️ Xóa tất cả dữ liệu
                    </button>
                    <p className="text-xs text-red-600">
                        Xóa toàn bộ phòng, khách, hóa đơn, lịch sử... Database sẽ trống hoàn toàn để bạn nhập lại từ đầu.
                    </p>
                 </div>
            </div>
        </div>
    );
};

export default SettingsView;
