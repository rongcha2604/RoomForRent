
import React, { useState } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { PRIMARY_COLOR } from '../../constants';

interface AddTenantModalProps {
  onClose: () => void;
}

const AddTenantModal: React.FC<AddTenantModalProps> = ({ onClose }) => {
    const { addTenant, tenants } = useAppData();
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [idNumber, setIdNumber] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [justSubmitted, setJustSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        console.log('🟢 [MODAL] handleSubmit() called');
        console.log('🟢 [MODAL] Form data:', { fullName, phone, idNumber });
        console.log('🟢 [MODAL] State:', { isSubmitting, justSubmitted });
        
        // LAYER 3: Double guard - prevent rapid double clicks
        if (isSubmitting || justSubmitted) {
            console.log('⚠️ [MODAL] BLOCKED: Already submitting or just submitted');
            return;
        }
        
        // Basic validation
        if (!fullName.trim()) {
            alert('❌ Vui lòng nhập họ tên!');
            return;
        }
        
        // LAYER 2: Frontend duplicate check BEFORE database call
        const trimmedPhone = phone.trim();
        const trimmedCCCD = idNumber.trim();
        
        if (trimmedPhone) {
            const existingByPhone = tenants.find(t => t.phone && t.phone.trim() === trimmedPhone);
            if (existingByPhone) {
                alert(`❌ Số điện thoại đã tồn tại!\n\n"${trimmedPhone}" đã được sử dụng bởi:\n${existingByPhone.fullName}\n\nVui lòng kiểm tra lại.`);
                return;
            }
        }
        
        if (trimmedCCCD) {
            const existingByCCCD = tenants.find(t => t.idNumber && t.idNumber.trim() === trimmedCCCD);
            if (existingByCCCD) {
                alert(`❌ Số CCCD đã tồn tại!\n\n"${trimmedCCCD}" đã được sử dụng bởi:\n${existingByCCCD.fullName}\n\nVui lòng kiểm tra lại.`);
                return;
            }
        }
        
        try {
            console.log('🟢 [MODAL] Setting flags: isSubmitting=true, justSubmitted=true');
            setIsSubmitting(true);
            setJustSubmitted(true);
            
            console.log('🟢 [MODAL] Calling addTenant()...');
            const result = await addTenant({ 
                fullName: fullName.trim(), 
                phone: trimmedPhone || undefined, 
                idNumber: trimmedCCCD || undefined 
            });
            console.log('🟢 [MODAL] addTenant() returned ID:', result);
            
            alert('✅ Đã thêm người thuê mới!');
            console.log('🟢 [MODAL] Closing modal...');
            onClose();
        } catch (error: any) {
            console.error('Error adding tenant:', error);
            
            // Enhanced error handling - show specific error messages
            if (error?.message?.includes('DUPLICATE_PHONE')) {
                alert('❌ Lỗi: Số điện thoại đã tồn tại!\n\n' + error.message.replace('DUPLICATE_PHONE: ', ''));
            } else if (error?.message?.includes('DUPLICATE_CCCD')) {
                alert('❌ Lỗi: Số CCCD đã tồn tại!\n\n' + error.message.replace('DUPLICATE_CCCD: ', ''));
            } else {
                alert('❌ Có lỗi xảy ra khi thêm người thuê!\n\n' + (error?.message || 'Unknown error'));
            }
        } finally {
            setIsSubmitting(false);
            // Reset justSubmitted after 1 second to allow retry if needed
            setTimeout(() => setJustSubmitted(false), 1000);
        }
    };

    return (
        <Modal title="Thêm người thuê mới" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="fullName" className="block text-sm font-medium text-slate-700">Họ và tên</label>
                    <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-700">Số điện thoại</label>
                    <input type="tel" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="idNumber" className="block text-sm font-medium text-slate-700">CCCD/CMND</label>
                    <input type="text" id="idNumber" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                </div>
                <div className="pt-2">
                    <button 
                        type="submit" 
                        className="w-full text-white font-bold py-3 px-4 rounded-xl transition duration-300" 
                        style={{ backgroundColor: PRIMARY_COLOR }}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Đang thêm...' : 'Thêm người thuê'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default AddTenantModal;
