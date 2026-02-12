import React, { useState } from 'react';
import { User } from '../types';
import { Shield, User as UserIcon, LogIn, MonitorPlay, Lock, X } from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onSelectUser: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onSelectUser }) => {
  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');

  // State for Admin Login Modal
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleUserClick = (user: User) => {
    if (user.role === 'admin') {
      setSelectedAdmin(user);
      setPassword('');
      setError('');
    } else {
      onSelectUser(user);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'Longphu25##') {
      if (selectedAdmin) {
        onSelectUser(selectedAdmin);
        setSelectedAdmin(null);
      }
    } else {
      setError('Mật khẩu không chính xác. Vui lòng thử lại.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans relative">
      <div className="max-w-5xl w-full">
        
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-tr from-emerald-400 to-cyan-600 rounded-[2rem] shadow-2xl shadow-emerald-400/40 mb-8 animate-[pulse_4s_ease-in-out_infinite] ring-4 ring-white/50">
             <MonitorPlay className="text-white w-12 h-12 drop-shadow-md" />
          </div>
          <h1 className="text-4xl font-bold text-slate-800 mb-2">eCabinet - Phòng Họp Không Giấy</h1>
          <p className="text-slate-500 text-lg">Vui lòng chọn tài khoản để đăng nhập hệ thống</p>
        </div>

        {/* Admin Section */}
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="flex items-center gap-3 mb-4 px-2">
              <Shield className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Quản Trị Viên</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {admins.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="bg-white p-4 rounded-xl border border-purple-100 shadow-sm hover:shadow-md hover:border-purple-300 transition-all text-left flex items-center gap-4 group"
                >
                  <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 group-hover:text-purple-700">{user.name}</h3>
                    <p className="text-xs text-slate-500">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100">
                      {user.department}
                    </span>
                  </div>
                  <LogIn className="w-5 h-5 text-gray-300 ml-auto group-hover:text-purple-500" />
                </button>
              ))}
           </div>
        </div>

        {/* User Section */}
        <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
           <div className="flex items-center gap-3 mb-4 px-2">
              <UserIcon className="w-5 h-5 text-emerald-600" />
              <h2 className="text-lg font-bold text-slate-700 uppercase tracking-wider">Cán Bộ / Nhân Viên</h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {regularUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all text-left flex items-center gap-3 group"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-lg group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    {user.name.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-800 text-sm truncate group-hover:text-emerald-700">{user.name}</h3>
                    <p className="text-[10px] text-slate-400 truncate">{user.department}</p>
                  </div>
                </button>
              ))}
           </div>
        </div>
      </div>

      {/* Admin Login Modal */}
      {selectedAdmin && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-200">
                <button 
                  onClick={() => setSelectedAdmin(null)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="flex flex-col items-center mb-6">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 border-4 border-purple-50">
                        <Lock className="w-8 h-8 text-purple-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800">Xác thực Admin</h3>
                    <p className="text-sm text-gray-500 mt-1">Xin chào <b>{selectedAdmin.name}</b></p>
                    <p className="text-xs text-gray-400">Vui lòng nhập mật khẩu để tiếp tục</p>
                </div>

                <form onSubmit={handleAdminLogin} className="space-y-4">
                    <div>
                        <input 
                            type="password" 
                            autoFocus
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            className={`w-full px-4 py-3 rounded-xl border ${error ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-purple-200'} focus:border-purple-500 focus:ring-4 outline-none transition-all text-center tracking-widest text-lg`}
                            placeholder="Nhập mật khẩu..."
                        />
                        {error && (
                            <p className="text-red-500 text-sm mt-2 text-center flex items-center justify-center gap-1 animate-in slide-in-from-top-1">
                                <Shield className="w-3 h-3" /> {error}
                            </p>
                        )}
                    </div>
                    <button 
                        type="submit"
                        className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-purple-200 active:scale-[0.98]"
                    >
                        Đăng Nhập Hệ Thống
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};