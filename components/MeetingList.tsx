import React, { useState, useEffect } from 'react';
import { Clock, MapPin, Plus, User, MoreVertical, Users, X, Calendar, Trash2, CheckCircle2, Video, Paperclip, FileText, Edit } from 'lucide-react';
import { Meeting, Room, Document, User as UserType } from '../types';

interface MeetingListProps {
  currentUser: UserType;
  pendingAction?: string | null;
  onActionComplete?: () => void;
  onJoinMeeting?: (id: string) => void;
  meetings: Meeting[];
  onAddMeeting: (meeting: Meeting) => void;
  onUpdateMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
  allDocuments: Document[];
  allRooms: Room[];
  allUsers: UserType[];
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'upcoming': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">Sắp diễn ra</span>;
    case 'ongoing': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100 animate-pulse">Đang diễn ra</span>;
    case 'finished': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100">Đã kết thúc</span>;
    case 'cancelled': return <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">Đã hủy</span>;
    default: return null;
  }
};

export const MeetingList: React.FC<MeetingListProps> = ({ 
  currentUser,
  pendingAction, 
  onActionComplete, 
  onJoinMeeting,
  meetings,
  onAddMeeting,
  onUpdateMeeting,
  onDeleteMeeting,
  allDocuments,
  allRooms,
  allUsers
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingMeetingId, setEditingMeetingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    roomId: '',
    date: '',
    startTime: '',
    endTime: '',
    selectedDocIds: [] as string[]
  });

  // Participant Selection State
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  // Filter users that are NOT yet selected
  const availableUsers = allUsers.filter(user => !selectedParticipantIds.includes(user.id));

  // Handle pending action from Dashboard
  useEffect(() => {
    if (pendingAction === 'create') {
      openModal();
      if (onActionComplete) onActionComplete();
    }
  }, [pendingAction, onActionComplete]);

  const openModal = (meetingToEdit?: Meeting) => {
    if (meetingToEdit) {
       setEditingMeetingId(meetingToEdit.id);
       // Convert DD/MM/YYYY back to YYYY-MM-DD for input[type="date"]
       const [day, month, year] = meetingToEdit.date.split('/');
       setFormData({
         title: meetingToEdit.title,
         roomId: meetingToEdit.roomId,
         date: `${year}-${month}-${day}`,
         startTime: meetingToEdit.startTime,
         endTime: meetingToEdit.endTime,
         selectedDocIds: meetingToEdit.documentIds || []
       });
       setSelectedParticipantIds(meetingToEdit.participantIds || []);
    } else {
       setEditingMeetingId(null);
       setFormData({
         title: '',
         roomId: '',
         date: '',
         startTime: '',
         endTime: '',
         selectedDocIds: []
       });
       setSelectedParticipantIds([]);
    }
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn hủy cuộc họp này?')) {
      onDeleteMeeting(id);
      setActiveMenuId(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleDocumentSelection = (docId: string) => {
    setFormData(prev => {
      const current = prev.selectedDocIds;
      if (current.includes(docId)) {
        return { ...prev, selectedDocIds: current.filter(id => id !== docId) };
      } else {
        return { ...prev, selectedDocIds: [...current, docId] };
      }
    });
  };

  const handleAddParticipant = (userId: string) => {
    if (userId && !selectedParticipantIds.includes(userId)) {
      setSelectedParticipantIds(prev => [...prev, userId]);
    }
  };

  const handleRemoveParticipant = (userId: string) => {
    setSelectedParticipantIds(prev => prev.filter(id => id !== userId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simple date formatting YYYY-MM-DD -> DD/MM/YYYY
    const [year, month, day] = formData.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    if (editingMeetingId) {
      // UPDATE EXISTING
      const originalMeeting = meetings.find(m => m.id === editingMeetingId);
      if (originalMeeting) {
         const updatedMeeting: Meeting = {
            ...originalMeeting,
            title: formData.title,
            roomId: formData.roomId,
            date: formattedDate,
            startTime: formData.startTime,
            endTime: formData.endTime,
            participants: selectedParticipantIds.length,
            participantIds: selectedParticipantIds,
            documentIds: formData.selectedDocIds
         };
         onUpdateMeeting(updatedMeeting);
      }
    } else {
      // CREATE NEW
      const newMeeting: Meeting = {
        id: `m${Date.now()}`,
        title: formData.title,
        roomId: formData.roomId,
        hostId: currentUser.id, // Use current logged-in user
        date: formattedDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        participants: selectedParticipantIds.length, // Calculated from selection
        participantIds: selectedParticipantIds,
        status: 'upcoming', // Default status
        documentIds: formData.selectedDocIds
      };
      onAddMeeting(newMeeting);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto min-h-screen relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lịch Cuộc Họp</h2>
          <p className="text-sm text-gray-500 mt-1">Danh sách các cuộc họp sắp tới và lịch sử</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50">
            Hôm nay
          </button>
          <button 
            onClick={() => openModal()}
            className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-emerald-200"
          >
            <Plus className="w-4 h-4" />
            Đặt Lịch Họp
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4 flex items-center gap-4 text-sm font-medium text-gray-500 rounded-t-xl">
           <span className="text-emerald-600 border-b-2 border-emerald-600 pb-4 -mb-4 px-1 cursor-pointer">Tất cả</span>
           <span className="hover:text-gray-800 cursor-pointer pb-4 -mb-4 px-1">Của tôi</span>
           <span className="hover:text-gray-800 cursor-pointer pb-4 -mb-4 px-1">Chờ duyệt</span>
        </div>
        
        <div className="divide-y divide-gray-100">
          {meetings.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Chưa có cuộc họp nào được lên lịch.</p>
            </div>
          ) : (
            meetings.map((meeting) => {
              const room = allRooms.find(r => r.id === meeting.roomId);
              const host = allUsers.find(u => u.id === meeting.hostId);
              const canJoin = meeting.status === 'ongoing' || meeting.status === 'upcoming';
              const attachedDocs = meeting.documentIds?.length || 0;

              return (
                <div key={meeting.id} className="p-6 hover:bg-gray-50 transition-colors flex flex-col md:flex-row md:items-center gap-6 relative group">
                  {/* Time Box */}
                  <div className="flex flex-col items-center justify-center bg-gray-50 border border-gray-100 rounded-lg w-20 h-20 shrink-0">
                    <span className="text-xs text-gray-500 font-medium uppercase">{meeting.date.split('/')[1] === '02' ? 'Tháng 2' : 'Tháng ' + meeting.date.split('/')[1]}</span>
                    <span className="text-2xl font-bold text-gray-800">{meeting.date.split('/')[0]}</span>
                    <span className="text-xs text-gray-400 mt-1">{meeting.startTime}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusBadge(meeting.status)}
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {meeting.endTime} - {meeting.startTime}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1 truncate">{meeting.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                      <div className="flex items-center gap-1.5" title={room?.name}>
                        <MapPin className="w-4 h-4 text-gray-400" />
                        {room ? room.name : 'Chưa xếp phòng'}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <User className="w-4 h-4 text-gray-400" />
                        Chủ trì: <span className="text-gray-700 font-medium">{host ? host.name : 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-gray-400" />
                        {meeting.participants} tham gia
                      </div>
                      {attachedDocs > 0 && (
                        <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                          <Paperclip className="w-3.5 h-3.5" />
                          {attachedDocs} tài liệu
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action */}
                  <div className="flex items-center justify-end gap-3 md:w-auto w-full border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 relative">
                    
                    {/* Join Button */}
                    {canJoin && (
                      <button 
                        onClick={() => onJoinMeeting && onJoinMeeting(meeting.id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm
                          ${meeting.status === 'ongoing' 
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 animate-pulse' 
                            : 'bg-white border border-emerald-500 text-emerald-600 hover:bg-emerald-50'
                          }`}
                      >
                         <Video className="w-4 h-4" />
                         Tham Gia
                      </button>
                    )}

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === meeting.id ? null : meeting.id);
                      }}
                      className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-full transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu */}
                    {activeMenuId === meeting.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                          <button 
                            onClick={() => {
                                openModal(meeting);
                                setActiveMenuId(null);
                            }}
                            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                             <Edit className="w-4 h-4 text-blue-500" /> Chỉnh sửa
                          </button>
                          <button className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                             <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Điểm danh
                          </button>
                          <button 
                            onClick={() => handleDelete(meeting.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                             <Trash2 className="w-4 h-4" /> Hủy cuộc họp
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Đặt Lịch / Chỉnh Sửa */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-bold text-gray-800">
                {editingMeetingId ? 'Chỉnh Sửa Cuộc Họp' : 'Đặt Lịch Họp Mới'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
              
              {/* Tiêu đề */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chủ đề cuộc họp</label>
                <input 
                  type="text"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Họp triển khai dự án X"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
              </div>

              {/* Grid 2 cột: Phòng & Ngày */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chọn phòng họp</label>
                  <select 
                    name="roomId"
                    required
                    value={formData.roomId}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white"
                  >
                    <option value="">-- Chọn phòng --</option>
                    {allRooms.map(room => (
                      <option key={room.id} value={room.id}>{room.name} (Sức chứa: {room.capacity})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày diễn ra</label>
                  <input 
                    type="date"
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Grid 2 cột: Giờ BĐ, Giờ KT */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ bắt đầu</label>
                  <input 
                    type="time"
                    name="startTime"
                    required
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Giờ kết thúc</label>
                  <input 
                    type="time"
                    name="endTime"
                    required
                    value={formData.endTime}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Participant Selection */}
              <div>
                <div className="flex justify-between items-center mb-1">
                   <label className="block text-sm font-medium text-gray-700">Người tham gia</label>
                   <span className="text-xs text-gray-500 font-medium">Đã chọn: {selectedParticipantIds.length} người</span>
                </div>
                
                {/* User Dropdown Selector */}
                <select 
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all bg-white mb-3"
                  onChange={(e) => {
                    handleAddParticipant(e.target.value);
                    e.target.value = ""; // Reset value to allow selecting others
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Bổ sung thêm người tham gia --</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} - {user.department}
                    </option>
                  ))}
                  {availableUsers.length === 0 && <option disabled>Đã chọn tất cả nhân sự</option>}
                </select>

                {/* Selected User Tags */}
                <div className="flex flex-wrap gap-2 min-h-[40px] p-2 bg-gray-50 border border-gray-200 rounded-lg">
                  {selectedParticipantIds.length === 0 && <span className="text-xs text-gray-400 italic">Chưa chọn người tham gia...</span>}
                  
                  {selectedParticipantIds.map(id => {
                    const user = allUsers.find(u => u.id === id);
                    if (!user) return null;
                    return (
                      <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-200 rounded-full text-sm text-emerald-700 shadow-sm animate-in zoom-in duration-200">
                        <User className="w-3 h-3" />
                        {user.name}
                        <button 
                          type="button" 
                          onClick={() => handleRemoveParticipant(id)}
                          className="hover:bg-red-100 rounded-full p-0.5 text-emerald-400 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )
                  })}
                </div>
              </div>

              {/* Document Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Đính kèm tài liệu từ kho</label>
                <div className="border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-gray-50 p-2 space-y-2">
                  {allDocuments.map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 bg-white border border-gray-100 rounded hover:border-emerald-200">
                      <input 
                        type="checkbox" 
                        id={`doc-${doc.id}`}
                        checked={formData.selectedDocIds.includes(doc.id)}
                        onChange={() => toggleDocumentSelection(doc.id)}
                        className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor={`doc-${doc.id}`} className="flex-1 text-sm text-gray-700 cursor-pointer flex items-center gap-2 truncate">
                         <FileText className="w-4 h-4 text-gray-400" />
                         {doc.name}
                      </label>
                    </div>
                  ))}
                  {allDocuments.length === 0 && <p className="text-xs text-gray-400 text-center">Chưa có tài liệu nào trong kho</p>}
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
                  {editingMeetingId ? 'Lưu Thay Đổi' : 'Xác Nhận Đặt Lịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};