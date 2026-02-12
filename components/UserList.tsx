import React, { useState, useEffect } from 'react';
import { Search, UserPlus, MoreHorizontal, Mail, Shield, CheckCircle, XCircle, Trash2, X, Edit } from 'lucide-react';
import { User } from '../types';

interface UserListProps {
  pendingAction?: string | null;
  onActionComplete?: () => void;
  users: User[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
}

export const UserList: React.FC<UserListProps> = ({ pendingAction, onActionComplete, users, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    department: '',
    role: 'user' as 'admin' | 'user' | 'guest'
  });

  useEffect(() => {
    if (pendingAction === 'add') {
      openModal();
      if (onActionComplete) onActionComplete();
    }
  }, [pendingAction, onActionComplete]);

  const openModal = (user?: User) => {
    if (user) {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            department: user.department,
            role: user.role
        });
    } else {
        setEditingUser(null);
        setFormData({
            name: '',
            email: '',
            department: '',
            role: 'user'
        });
    }
    setIsModalOpen(true);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingUser) {
        // Edit Mode
        const updatedUser: User = {
            ...editingUser,
            name: formData.name,
            email: formData.email,
            department: formData.department,
            role: formData.role
        };
        onUpdateUser(updatedUser);
    } else {
        // Add Mode
        const newUser: User = {
            id: `u${Date.now()}`,
            name: formData.name,
            email: formData.email,
            department: formData.department,
            role: formData.role,
            status: 'active'
        };
        onAddUser(newUser);
    }

    setIsModalOpen(false);
    
    // Reset form handled by openModal(undefined) next time or logic above
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
      onDeleteUser(id);
      setActiveMenuId(null);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Quản Lý Người Dùng</h2>
          <p className="text-sm text-gray-500 mt-1">Danh sách cán bộ nhân viên trong hệ thống</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-purple-200"
        >
          <UserPlus className="w-4 h-4" />
          Thêm Mới
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col min-h-[500px]">
        <div className="p-4 border-b border-gray-100">
           <div className="relative w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm theo tên hoặc email..." 
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-sm"
              />
            </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
             <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4">Họ và Tên</th>
                <th className="px-6 py-4">Phòng Ban</th>
                <th className="px-6 py-4">Vai Trò</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-50">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{user.name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                          <Mail className="w-3 h-3" /> {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                    {user.department}
                  </td>
                  <td className="px-6 py-4">
                     <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        <Shield className="w-3 h-3" />
                        {user.role === 'admin' ? 'Quản Trị' : 'Nhân Viên'}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                    {user.status === 'active' ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-100">
                        <CheckCircle className="w-3 h-3" /> Hoạt động
                      </span>
                    ) : (
                       <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 px-2 py-1 rounded border border-gray-100">
                        <XCircle className="w-3 h-3" /> Ngưng
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === user.id ? null : user.id);
                      }}
                      className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                    
                    {/* Dropdown */}
                    {activeMenuId === user.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setActiveMenuId(null)}></div>
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-20 py-1 animate-in fade-in zoom-in-95 duration-100">
                          <button 
                             onClick={() => {
                                 openModal(user);
                                 setActiveMenuId(null);
                             }}
                             className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 border-b border-gray-50"
                          >
                             <Edit className="w-4 h-4 text-blue-500" /> Chỉnh sửa thông tin
                          </button>
                          <button 
                            onClick={() => handleDelete(user.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                             <Trash2 className="w-4 h-4" /> Xóa người dùng
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination placeholder */}
        <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 mt-auto">
           <span>Hiển thị {users.length} trên tổng số {users.length} người dùng</span>
           <div className="flex gap-1">
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50">Trước</button>
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 bg-white text-gray-800 font-medium shadow-sm">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50">Sau</button>
           </div>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-800">
                 {editingUser ? 'Cập Nhật Thông Tin' : 'Thêm Người Dùng Mới'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Họ và Tên</label>
                <input 
                  type="text" 
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="nguyenvana@ecabinet.vn"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phòng Ban</label>
                <input 
                  type="text" 
                  name="department"
                  required
                  value={formData.department}
                  onChange={handleInputChange}
                  placeholder="Ví dụ: Kinh Doanh"
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vai Trò</label>
                <select 
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
                >
                  <option value="user">Nhân Viên</option>
                  <option value="admin">Quản Trị Viên</option>
                  <option value="guest">Khách</option>
                </select>
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
                  className="flex-1 py-2.5 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium transition-colors shadow-lg shadow-purple-200"
                >
                  {editingUser ? 'Lưu Thay Đổi' : 'Thêm Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};