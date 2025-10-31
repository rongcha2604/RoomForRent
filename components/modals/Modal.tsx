
import React, { ReactNode } from 'react';
import { XIcon } from '../Icons';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-end">
      <div className="bg-white w-full max-w-lg rounded-t-2xl shadow-lg max-h-[90vh] flex flex-col">
        <header className="p-4 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800">
            <XIcon />
          </button>
        </header>
        <div className="overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
