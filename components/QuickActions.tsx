import React from 'react';
import { Plus, Presentation, Upload, UserPlus } from 'lucide-react';
import { User } from '../types';

interface QuickActionsProps {
  currentUser: User;
  onNavigate: (tab: string, action?: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ currentUser, onNavigate }) => {
  // If not admin, do not show administrative actions
  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex items-center justify-center text-center">
         <div>
            <h3 className="text-base font-bold text-gray-800 mb-2">Thao Tác Nhanh</h3>
            <p className="text-sm text-gray-500">Bạn đang đăng nhập với quyền Nhân viên.</p>
            <p className="text-sm text-gray-500">Vui lòng liên hệ Admin để thực hiện các thay đổi hệ thống.</p>
         </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full">
      <h3 className="text-base font-bold text-gray-800 mb-5">Thao Tác Nhanh</h3>
      <div className="space-y-3">
        <button 
          onClick={() => onNavigate('meetings', 'create')}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm shadow-emerald-200"
        >
          <Plus className="w-5 h-5" />
          Tạo Cuộc Họp
        </button>
        <button 
          onClick={() => onNavigate('rooms', 'add')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm shadow-blue-200"
        >
          <Presentation className="w-5 h-5" />
          Thêm Phòng Họp
        </button>
        <button 
          onClick={() => onNavigate('documents', 'upload')}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm shadow-orange-200"
        >
          <Upload className="w-5 h-5" />
          Upload Tài Liệu
        </button>
        <button 
          onClick={() => onNavigate('users', 'add')}
          className="w-full bg-purple-500 hover:bg-purple-600 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors shadow-sm shadow-purple-200"
        >
          <UserPlus className="w-5 h-5" />
          Thêm Người Dùng
        </button>
      </div>
    </div>
  );
};