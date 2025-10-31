
import React from 'react';
import { type ModalType, type View } from '../types';

interface BottomNavBarProps {
  setActiveModal: (modal: ModalType | null) => void;
  setActiveView: (view: View) => void;
  currentView: View;
}

const NavButton: React.FC<{
  emoji: string;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}> = ({ emoji, label, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-200 active:scale-95 ${
        isActive ? 'text-teal-600' : 'text-slate-600'
      }`}
    >
      <span className={`text-2xl mb-0.5 ${isActive ? 'scale-110' : ''}`}>{emoji}</span>
      <span className="text-[9px] font-medium">{label}</span>
    </button>
  );
};

const BottomNavBar: React.FC<BottomNavBarProps> = ({ setActiveModal, setActiveView, currentView }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-200 flex items-center px-1 max-w-lg mx-auto shadow-top">
      <NavButton
        emoji="🏠"
        label="Trang chủ"
        isActive={currentView === 'dashboard'}
        onClick={() => setActiveView('dashboard')}
      />
      <NavButton
        emoji="⚡"
        label="Ghi số"
        onClick={() => setActiveModal('addReading')}
      />
      <NavButton
        emoji="🙋"
        label="Thêm khách"
        onClick={() => setActiveModal('addTenant')}
      />
      <NavButton
        emoji="📝"
        label="Tạo HĐT"
        onClick={() => setActiveModal('addLease')}
      />
      <NavButton
        emoji="⚙️"
        label="Cài đặt"
        isActive={currentView === 'settings'}
        onClick={() => setActiveView('settings')}
      />
    </nav>
  );
};

export default BottomNavBar;
