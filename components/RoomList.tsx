import React, { useState, useEffect } from 'react';
import { Users, Wifi, Monitor, Coffee, Plus, MoreHorizontal, X, Tv, PenTool, Check, FileText, Paperclip, Video } from 'lucide-react';
import { Room, Document } from '../types';

interface RoomListProps {
  pendingAction?: string | null;
  onActionComplete?: () => void;
  onJoinRoom?: (roomId: string) => void;
  rooms: Room[];
  onAddRoom: (room: Room) => void;
  onUpdateRoomStatus: (id: string, status: Room['status']) => void;
  allDocuments: Document[];
}

const getStatusColor = (status: Room['status']) => {
  switch (status) {
    case 'available': return 'bg-emerald-100 text-emerald-700 ring-emerald-600/20';
    case 'occupied': return 'bg-red-100 text-red-700 ring-red-600/20';
    case 'maintenance': return 'bg-gray-100 text-gray-700 ring-gray-600/20';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const getStatusLabel = (status: Room['status']) => {
  switch (status) {
    case 'available': return 'Sẵn sàng';
    case 'occupied': return 'Đang sử dụng';
    case 'maintenance': return 'Bảo trì';
    default: return status;
  }
};

const FACILITY_OPTIONS = [
  { id: 'Wifi', label: 'Wifi', icon: Wifi },
  { id: 'Projector', label: 'Máy chiếu', icon: Monitor },
  { id: 'Coffee', label: 'Coffee', icon: Coffee },
  { id: 'TV', label: 'TV', icon: Tv },
  { id: 'Whiteboard', label: 'Bảng trắng', icon: PenTool },
];

export const RoomList: React.FC<RoomListProps> = ({ 
  pendingAction, 
  onActionComplete, 
  onJoinRoom, 
  rooms, 
  onAddRoom, 
  onUpdateRoomStatus,
  allDocuments 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuRoomId, setActiveMenuRoomId] = useState<string | null>(null);
  
  // Form States
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('');
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  // Handle pending action from Dashboard
  useEffect(() => {
    if (pendingAction === 'add') {
      setIsModalOpen(true);
      if (onActionComplete) onActionComplete();
    }
  }, [pendingAction, onActionComplete]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName || !newRoomCapacity) return;

    const newRoom: Room = {
      id: `r${Date.now()}`,
      name: newRoomName,
      capacity: parseInt(newRoomCapacity),
      status: 'available',
      facilities: selectedFacilities,
      documentIds: selectedDocIds,
    };

    onAddRoom(newRoom);
    resetForm();
    setIsModalOpen(false);
  };

  const resetForm = () => {
    setNewRoomName('');
    setNewRoomCapacity('');
    setSelectedFacilities([]);
    setSelectedDocIds([]);
  };

  const toggleFacility = (facilityId: string) => {
    setSelectedFacilities(prev => 
      prev.includes(facilityId) 
        ? prev.filter(f => f !== facilityId)
        : [...prev, facilityId]
    );
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocIds(prev => 
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto relative min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Danh Sách Phòng Họp</h2>
          <p className="text-sm text-gray-500 mt-1">Quản lý trạng thái và thiết bị phòng họp</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-emerald-200"
        >
          <Plus className="w-4 h-4" />
          Thêm Phòng Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <div key={room.id} className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow group relative flex flex-col">
            {/* Header with gradient - Added rounded-t-xl since overflow-hidden is removed from parent */}
            <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-500 relative flex items-center justify-center rounded-t-xl overflow-hidden shrink-0">
               <div className="absolute inset-0 bg-black/10"></div>
               <span className="text-white font-bold text-3xl opacity-20 relative z-10">{room.name.charAt(0)}</span>
               <div className={`absolute top-4 right-4 px-2 py-1 rounded-md text-xs font-medium ring-1 ring-inset ${getStatusColor(room.status)} bg-white/90 shadow-sm z-10`}>
                 {getStatusLabel(room.status)}
               </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex justify-between items-start mb-4 relative">
                <h3 className="font-bold text-gray-800 text-lg truncate pr-8" title={room.name}>{room.name}</h3>
                
                {/* Menu Action Button */}
                <div className="relative">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuRoomId(activeMenuRoomId === room.id ? null : room.id);
                    }}
                    className={`text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-all ${activeMenuRoomId === room.id ? 'opacity-100 bg-gray-100 text-gray-600' : 'opacity-0 group-hover:opacity-100'}`}
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </button>

                  {/* Dropdown Menu */}
                  {activeMenuRoomId === room.id && (
                    <>
                      <div className="fixed inset-0 z-20 cursor-default" onClick={() => setActiveMenuRoomId(null)}></div>
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-30 py-1 animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-4 py-2 border-b border-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                          Đổi Trạng Thái
                        </div>
                        <button 
                          onClick={() => {
                              onUpdateRoomStatus(room.id, 'available');
                              setActiveMenuRoomId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center justify-between group/item"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Sẵn sàng
                          </span>
                          {room.status === 'available' && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => {
                              onUpdateRoomStatus(room.id, 'occupied');
                              setActiveMenuRoomId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 flex items-center justify-between group/item"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            Đang sử dụng
                          </span>
                          {room.status === 'occupied' && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button 
                          onClick={() => {
                              onUpdateRoomStatus(room.id, 'maintenance');
                              setActiveMenuRoomId(null);
                          }}
                          className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-gray-700 flex items-center justify-between group/item"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-gray-500"></span>
                            Bảo trì
                          </span>
                          {room.status === 'maintenance' && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                <Users className="w-4 h-4" />
                <span>Sức chứa: <span className="font-semibold text-gray-700">{room.capacity}</span> người</span>
              </div>

              <div className="flex flex-wrap gap-2 mb-4 min-h-[2rem]">
                {room.facilities.map(facility => {
                   const iconData = FACILITY_OPTIONS.find(f => f.id === facility);
                   const Icon = iconData?.icon || Wifi;
                   return (
                    <span key={facility} className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded border border-gray-100 flex items-center gap-1">
                      <Icon className="w-3 h-3" /> {iconData?.label || facility}
                    </span>
                   );
                })}
              </div>

              {/* Document Link Display */}
              {room.documentIds && room.documentIds.length > 0 && (
                <div className="mb-4 bg-blue-50/50 p-2 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 text-xs font-medium text-blue-700 mb-1">
                    <Paperclip className="w-3 h-3" /> Tài liệu đính kèm ({room.documentIds.length})
                  </div>
                  <div className="text-[10px] text-gray-500 truncate">
                     {room.documentIds.map(id => allDocuments.find(d => d.id === id)?.name).join(', ')}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto flex gap-3">
                 <button 
                    onClick={() => onJoinRoom?.(room.id)}
                    className="flex-1 py-2.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 font-medium text-sm transition-colors shadow-sm shadow-emerald-200 flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4" /> Vào Phòng
                  </button>
                  <button className="px-4 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors">
                    Chi Tiết
                  </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-gray-800">Thêm Phòng Họp Mới</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="p-6 space-y-5 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên phòng họp</label>
                <input 
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Ví dụ: Phòng họp VIP 2"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sức chứa (người)</label>
                <input 
                  type="number"
                  required
                  min="1"
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(e.target.value)}
                  placeholder="Ví dụ: 20"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Tiện ích đi kèm</label>
                <div className="grid grid-cols-2 gap-3">
                  {FACILITY_OPTIONS.map((facility) => (
                    <div 
                      key={facility.id}
                      onClick={() => toggleFacility(facility.id)}
                      className={`cursor-pointer px-4 py-2.5 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all select-none
                        ${selectedFacilities.includes(facility.id) 
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700' 
                          : 'border-gray-200 text-gray-600 hover:border-emerald-200 hover:bg-emerald-50/50'
                        }`}
                    >
                      <facility.icon className={`w-4 h-4 ${selectedFacilities.includes(facility.id) ? 'text-emerald-600' : 'text-gray-400'}`} />
                      {facility.label}
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quy định / Hướng dẫn (Từ kho tài liệu)</label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-gray-50 p-2 space-y-2">
                  {allDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded hover:border-emerald-200">
                      <input 
                        type="checkbox" 
                        id={`room-doc-${doc.id}`}
                        checked={selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor={`room-doc-${doc.id}`} className="flex-1 text-sm text-gray-700 cursor-pointer flex items-center gap-2 truncate">
                         <FileText className="w-4 h-4 text-gray-400" />
                         {doc.name}
                      </label>
                    </div>
                  ))}
                  {allDocuments.length === 0 && <p className="text-xs text-gray-400 text-center">Chưa có tài liệu nào</p>}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium transition-colors shadow-lg shadow-emerald-200"
                >
                  Thêm Phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};