
import React, { useState, useRef, useEffect } from 'react';
import { PlusIcon, ClipboardPlusIcon, UserPlusIcon, WrenchIcon, FilePlus2Icon, BarChart3Icon, FileTextIcon } from './Icons';
import { PRIMARY_COLOR } from '../constants';

interface FloatingActionButtonProps {
  onAddReading: () => void;
  onAddTenant: () => void;
  onAddMaintenance: () => void;
  onGenerateInvoices: () => void;
  onGoToReports: () => void;
  onAddLease: () => void;
}

const SpeedDialAction: React.FC<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    translateY: string;
}> = ({ label, icon, onClick, translateY }) => (
    <div className="flex items-center justify-end absolute right-0" style={{ transform: `translateY(${translateY})`, transition: 'transform 0.3s ease' }}>
        <span className="bg-white text-slate-700 text-xs font-semibold mr-3 px-2.5 py-1 rounded-lg shadow-sm whitespace-nowrap">
            {label}
        </span>
        <button
            onClick={onClick}
            className="h-10 w-10 rounded-full bg-white flex items-center justify-center text-slate-600 shadow-md"
        >
            {React.cloneElement(icon as React.ReactElement, { size: 18 })}
        </button>
    </div>
);


const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onAddReading, onAddTenant, onAddMaintenance, onGenerateInvoices, onGoToReports, onAddLease }) => {
    const [isOpen, setIsOpen] = useState(false);
    const node = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (node.current && !node.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);
    
    const handleActionClick = (action: () => void) => {
        action();
        setIsOpen(false);
    }

    const actions = [
        { label: "Báo cáo", icon: <BarChart3Icon size={18} />, onClick: onGoToReports, translateY: '-390px' },
        { label: "Thêm bảo trì", icon: <WrenchIcon size={18} />, onClick: onAddMaintenance, translateY: '-330px' },
        { label: "Thêm người thuê", icon: <UserPlusIcon size={18} />, onClick: onAddTenant, translateY: '-270px' },
        { label: "Tạo hợp đồng", icon: <FileTextIcon size={18} />, onClick: onAddLease, translateY: '-210px' },
        { label: "Ghi điện nước", icon: <ClipboardPlusIcon size={18} />, onClick: onAddReading, translateY: '-150px' },
        { label: "Tạo hóa đơn", icon: <FilePlus2Icon size={18} />, onClick: onGenerateInvoices, translateY: '-90px' },
    ];

    return (
        <div ref={node} className="fixed z-20" style={{ bottom: '64px', right: 'calc(max(1rem, 50% - 256px + 0.75rem))' }}>
            <div className={`absolute bottom-0 right-0 transition-all duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                 <div>
                    {actions.map((action, index) => (
                         <SpeedDialAction 
                            key={index}
                            label={action.label} 
                            icon={action.icon} 
                            onClick={() => handleActionClick(action.onClick)} 
                            translateY={isOpen ? action.translateY : '0px'}
                        />
                    ))}
                 </div>
            </div>
             {isOpen && <div className="fixed inset-0 bg-black bg-opacity-30 z-[-1]" onClick={() => setIsOpen(false)}></div>}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-10 w-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform duration-300"
                style={{ backgroundColor: PRIMARY_COLOR, transform: isOpen ? 'rotate(45deg)' : 'rotate(0)' }}
                aria-haspopup="true"
                aria-expanded={isOpen}
            >
                <PlusIcon size={20} />
            </button>
        </div>
    );
};

export default FloatingActionButton;
