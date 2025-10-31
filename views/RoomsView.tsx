import React, { useState, useMemo } from 'react';
import { useAppData } from '../hooks/useAppData';
import Header from '../components/Header';
import { type Room, type Tenant, type Lease, type View } from '../types';
import { PRIMARY_COLOR } from '../constants';
import AddRoomModal from '../components/modals/AddRoomModal';
import EditRoomModal from '../components/modals/EditRoomModal';
import RoomDetailModal from '../components/modals/RoomDetailModal';

type FilterType = 'all' | 'occupied' | 'vacant' | 'locked';
type SortType = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';

interface RoomCardProps {
    room: Room;
    tenant?: Tenant;
    lease?: Lease;
    onViewDetail: () => void;
}

const RoomCard: React.FC<RoomCardProps> = ({ room, tenant, lease, onViewDetail }) => {
    const isOccupied = !!lease;
    const formatCurrency = (value: number) => new Intl.NumberFormat('vi-VN').format(value) + 'đ';

    return (
        <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
                <h3 className="text-lg font-bold">{room.name}</h3>
                <div className="flex flex-col items-end space-y-1">
                    {!room.isActive ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200 text-slate-700">
                            🔒 Đã khóa
                        </span>
                    ) : isOccupied ? (
                        <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-emerald-100 text-emerald-800">
                            Đang thuê
                        </span>
                    ) : (
                        <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-800">
                            Còn trống
                        </span>
                    )}
                </div>
            </div>
            <div className="mt-2 text-xs text-slate-600 space-y-1.5">
                <p>Giá thuê: <span className="font-semibold text-slate-800">{formatCurrency(room.baseRent)}</span></p>
                {isOccupied && tenant ? (
                    <div>
                        <p>Người thuê: <span className="font-semibold text-slate-800">{tenant.fullName}</span></p>
                        <p>Ngày vào: <span className="font-semibold text-slate-800">{new Date(lease.startDate).toLocaleDateString('vi-VN')}</span></p>
                    </div>
                ) : (
                    <p className="text-slate-400">Chưa có người thuê.</p>
                )}
            </div>
            <div className="mt-3">
                <button 
                    onClick={onViewDetail}
                    className="w-full text-center py-1.5 text-xs font-semibold rounded-lg border" 
                    style={{borderColor: PRIMARY_COLOR, color: PRIMARY_COLOR}}
                >
                    Xem chi tiết
                </button>
            </div>
        </div>
    );
};

interface RoomsViewProps {
    setActiveView: (view: View) => void;
    currentView: View;
}

const RoomsView: React.FC<RoomsViewProps> = ({ setActiveView, currentView }) => {
    const { rooms, tenants, leases } = useAppData();
    
    // Modal states
    const [activeModal, setActiveModal] = useState<'add' | 'edit' | 'detail' | null>(null);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
    
    // Filter, search, sort states
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<SortType>('name-asc');

    // Calculate statistics
    const stats = useMemo(() => {
        const total = rooms.length;
        const active = rooms.filter(r => r.isActive).length;
        const locked = rooms.filter(r => !r.isActive).length;
        const occupied = rooms.filter(r => 
            r.isActive && leases.some(l => l.roomId === r.id && l.status === 'active')
        ).length;
        const vacant = active - occupied;
        
        return { total, active, locked, occupied, vacant };
    }, [rooms, leases]);

    // Filter, search, and sort rooms
    const filteredRooms = useMemo(() => {
        let result = [...rooms];

        // Apply filter
        if (filter === 'occupied') {
            result = result.filter(r => 
                r.isActive && leases.some(l => l.roomId === r.id && l.status === 'active')
            );
        } else if (filter === 'vacant') {
            result = result.filter(r => 
                r.isActive && !leases.some(l => l.roomId === r.id && l.status === 'active')
            );
        } else if (filter === 'locked') {
            result = result.filter(r => !r.isActive);
        }

        // Apply search
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(r => r.name.toLowerCase().includes(query));
        }

        // Apply sort
        result.sort((a, b) => {
            if (sortBy === 'name-asc') return a.name.localeCompare(b.name, 'vi');
            if (sortBy === 'name-desc') return b.name.localeCompare(a.name, 'vi');
            if (sortBy === 'price-asc') return a.baseRent - b.baseRent;
            if (sortBy === 'price-desc') return b.baseRent - a.baseRent;
            return 0;
        });

        return result;
    }, [rooms, leases, filter, searchQuery, sortBy]);

    // Modal handlers
    const handleViewDetail = (room: Room) => {
        setSelectedRoom(room);
        setActiveModal('detail');
    };

    const handleEdit = () => {
        setActiveModal('edit');
    };

    const handleCloseModal = () => {
        setActiveModal(null);
        setSelectedRoom(null);
    };

    const getSortLabel = () => {
        switch (sortBy) {
            case 'name-asc': return 'Tên A-Z';
            case 'name-desc': return 'Tên Z-A';
            case 'price-asc': return 'Giá thấp-cao';
            case 'price-desc': return 'Giá cao-thấp';
            default: return 'Tên A-Z';
        }
    };

    return (
        <div>
            <Header title="Quản lý phòng" />
            
            {/* Add Room Button */}
            <div className="px-3 mt-3">
                <button
                    onClick={() => setActiveModal('add')}
                    className="w-full py-2.5 text-sm font-semibold text-white rounded-lg flex items-center justify-center space-x-2 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: PRIMARY_COLOR }}
                >
                    <span className="text-xl">+</span>
                    <span>Thêm phòng mới</span>
                </button>
            </div>
            
            {/* Statistics Bar */}
            <div className="bg-white mx-3 mt-3 p-3 rounded-xl shadow-sm border border-slate-200">
                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center">
                        <p className="text-slate-600">Tổng phòng</p>
                        <p className="text-lg font-bold" style={{ color: PRIMARY_COLOR }}>{stats.total}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-600">Đang thuê</p>
                        <p className="text-lg font-bold text-emerald-600">{stats.occupied}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-600">Còn trống</p>
                        <p className="text-lg font-bold text-amber-600">{stats.vacant}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-slate-600">Đã khóa</p>
                        <p className="text-lg font-bold text-slate-600">{stats.locked}</p>
                    </div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="px-3 mt-3">
                <div className="flex space-x-2 overflow-x-auto">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                            filter === 'all'
                                ? 'text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                        style={filter === 'all' ? { backgroundColor: PRIMARY_COLOR } : {}}
                    >
                        Tất cả ({stats.total})
                    </button>
                    <button
                        onClick={() => setFilter('occupied')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                            filter === 'occupied'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Đang thuê ({stats.occupied})
                    </button>
                    <button
                        onClick={() => setFilter('vacant')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                            filter === 'vacant'
                                ? 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Còn trống ({stats.vacant})
                    </button>
                    <button
                        onClick={() => setFilter('locked')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                            filter === 'locked'
                                ? 'bg-slate-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                    >
                        Đã khóa ({stats.locked})
                    </button>
                </div>
            </div>

            {/* Search & Sort */}
            <div className="px-3 mt-3 flex space-x-2">
                {/* Search */}
                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="🔍 Tìm tên phòng..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1]"
                    />
                </div>
                
                {/* Sort */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortType)}
                    className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#40BFC1] bg-white"
                >
                    <option value="name-asc">Tên A-Z</option>
                    <option value="name-desc">Tên Z-A</option>
                    <option value="price-asc">Giá thấp-cao</option>
                    <option value="price-desc">Giá cao-thấp</option>
                </select>
            </div>

            {/* Rooms List */}
            <div className="p-3 space-y-3">
                {filteredRooms.length === 0 ? (
                    <div className="text-center py-10">
                        <p className="text-slate-400 text-sm">
                            {searchQuery ? 'Không tìm thấy phòng nào' : 'Chưa có phòng nào'}
                        </p>
                    </div>
                ) : (
                    filteredRooms.map(room => {
                        const lease = leases.find(l => l.roomId === room.id && l.status === 'active');
                        const tenant = tenants.find(t => t.id === lease?.tenantId);
                        return (
                            <RoomCard 
                                key={room.id} 
                                room={room} 
                                lease={lease} 
                                tenant={tenant}
                                onViewDetail={() => handleViewDetail(room)}
                            />
                        );
                    })
                )}
            </div>

            {/* Modals */}
            {activeModal === 'add' && (
                <AddRoomModal onClose={handleCloseModal} />
            )}
            
            {activeModal === 'edit' && selectedRoom && (
                <EditRoomModal room={selectedRoom} onClose={handleCloseModal} />
            )}
            
            {activeModal === 'detail' && selectedRoom && (
                <RoomDetailModal 
                    room={selectedRoom} 
                    onClose={handleCloseModal}
                    onEdit={handleEdit}
                />
            )}
        </div>
    );
};

export default RoomsView;
