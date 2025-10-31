
import React, { useState } from 'react';
import Modal from './Modal';
import { useAppData } from '../../hooks/useAppData';
import { PRIMARY_COLOR } from '../../constants';
import { type Maintenance } from '../../types';

interface AddMaintenanceModalProps {
  onClose: () => void;
}

const AddMaintenanceModal: React.FC<AddMaintenanceModalProps> = ({ onClose }) => {
    const { rooms, addMaintenance } = useAppData();
    const [roomId, setRoomId] = useState(rooms[0]?.id.toString() || '');
    const [title, setTitle] = useState('');
    const [cost, setCost] = useState('');
    const [payer, setPayer] = useState<Maintenance['payer']>('owner');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !cost) {
            alert('Vui lòng điền đầy đủ thông tin.');
            return;
        }
        addMaintenance({
            roomId: parseInt(roomId),
            title,
            cost: parseInt(cost),
            payer,
            status: 'open',
            date: new Date().toISOString()
        });
        alert('Đã thêm yêu cầu bảo trì!');
        onClose();
    };

    return (
        <Modal title="Thêm yêu cầu bảo trì" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="room" className="block text-sm font-medium text-slate-700">Chọn phòng</label>
                    <select id="room" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm rounded-md">
                        {rooms.map(room => (
                            <option key={room.id} value={room.id}>{room.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700">Nội dung</label>
                    <input type="text" id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="cost" className="block text-sm font-medium text-slate-700">Chi phí (VND)</label>
                    <input type="number" id="cost" value={cost} onChange={(e) => setCost(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500 sm:text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700">Bên thanh toán</label>
                    <div className="mt-2 flex space-x-4">
                        <label className="flex items-center">
                            <input type="radio" name="payer" value="owner" checked={payer === 'owner'} onChange={() => setPayer('owner')} className="focus:ring-teal-500 h-4 w-4 text-teal-600 border-slate-300" />
                            <span className="ml-2 text-sm text-slate-700">Chủ nhà</span>
                        </label>
                        <label className="flex items-center">
                            <input type="radio" name="payer" value="tenant" checked={payer === 'tenant'} onChange={() => setPayer('tenant')} className="focus:ring-teal-500 h-4 w-4 text-teal-600 border-slate-300" />
                            <span className="ml-2 text-sm text-slate-700">Người thuê</span>
                        </label>
                    </div>
                </div>
                <div className="pt-2">
                    <button type="submit" className="w-full text-white font-bold py-3 px-4 rounded-xl transition duration-300" style={{ backgroundColor: PRIMARY_COLOR }}>Thêm yêu cầu</button>
                </div>
            </form>
        </Modal>
    );
};

export default AddMaintenanceModal;
