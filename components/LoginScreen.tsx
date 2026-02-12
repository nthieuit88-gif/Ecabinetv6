import React, { useState } from 'react';
import { User } from '../types';
import { Shield, User as UserIcon, LogIn, MonitorPlay, Lock, Loader2, AlertTriangle, Mail, X } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  users: User[];
  onSelectUser: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users, onSelectUser }) => {
  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');

  // State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Function to perform login automatically
  const performAutoLogin = async (user: User, pass: string) => {
    setIsLoading(true);
    setError('');
    setInfoMessage('');
    setIsRegistering(false);

    try {
      // 1. Try to Login
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: pass
      });

      if (authError) {
        // Handle "Email not confirmed"
        if (authError.message.includes("Email not confirmed")) {
            setInfoMessage("Tài khoản này cần xác thực email trước khi vào.");
            setIsLoading(false);
            return;
        }

        // CRITICAL: Handle "Email logins are disabled"
        // This allows access even if Supabase config is restrictive (Offline/Demo Mode)
        if (authError.message.includes("Email logins are disabled") || authError.message.includes("disabled")) {
             console.warn("Supabase Auth disabled/restricted. Switching to Local Bypass Mode.");
             onSelectUser(user); // Force login locally via App.tsx prop
             return;
        }

        // 2. If login fails (invalid credentials), try Auto-Register
        if (authError.message === 'Invalid login credentials') {
           console.log("Login failed, attempting auto-registration...");
           setIsRegistering(true);
           
           const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
             email: user.email,
             password: pass,
             options: {
               data: {
                 name: user.name,
                 role: user.role
               }
             }
           });

           if (signUpError) {
             // If disabled during signup too
             if (signUpError.message.includes("disabled")) {
                 onSelectUser(user);
                 return;
             }

             if (signUpError.message.includes("already registered")) {
                // This means password was wrong for an existing user
                throw new Error("Mật khẩu hệ thống đã bị thay đổi, không thể tự đăng nhập.");
             }
             throw signUpError;
           }

           if (signUpData.session) {
             return; // Success (handled by App.tsx)
           } else if (signUpData.user && !signUpData.session) {
             // If signup success but no session (maybe confirm required), just let them in locally for now
             // since we are in "Auto Login" mode
             onSelectUser(user);
             return;
           }
        } else {
          throw authError;
        }
      }
      // Success (App.tsx handles session change)
    } catch (err: any) {
      console.error("Auto Login Error:", err);
      // Fallback for any other weird auth errors to ensure access
      if (err.message && (err.message.includes("disabled") || err.message.includes("Auth"))) {
         onSelectUser(user);
         return;
      }
      setError(err.message || 'Lỗi đăng nhập.');
      setIsLoading(false);
      setIsRegistering(false);
    }
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    
    // Determine password based on role (Hardcoded for convenience as requested)
    const autoPass = user.role === 'admin' ? 'Longphu25##' : 'Longphu26##';
    
    // Trigger Auto Login immediately
    performAutoLogin(user, autoPass);
  };

  const handleCancel = () => {
    if (isLoading) return; // Prevent cancelling while processing
    setSelectedUser(null);
    setError('');
    setInfoMessage('');
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      
      {/* Background */}
      <div className="absolute inset-0 bg-slate-900 z-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-emerald-900/40 to-slate-900/90"></div>
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
             <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px]"></div>
          </div>
      </div>

      <div className="max-w-6xl w-full z-10 relative">
        
        {/* Header */}
        <div className="text-center mb-10 flex flex-col items-center animate-in fade-in slide-in-from-top-10 duration-700">
          <div className="relative group cursor-default">
             <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-[2.5rem] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
             <div className="relative inline-flex items-center justify-center w-28 h-28 bg-slate-900 rounded-[2rem] border border-emerald-500/30 shadow-2xl">
                 <MonitorPlay className="text-emerald-400 w-14 h-14 drop-shadow-[0_0_15px_rgba(52,211,153,0.5)]" />
             </div>
          </div>
          
          <h1 className="mt-8 text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-emerald-300 to-cyan-300 drop-shadow-sm uppercase tracking-tight">
            Phòng Họp Không Giấy
          </h1>
          <p className="mt-4 text-slate-400 text-lg font-light tracking-wider uppercase border-t border-slate-700 pt-4 px-8">
            Hệ thống quản lý eCabinet <span className="text-emerald-500 font-bold">v6.0</span> (Auto Login)
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Admin Column */}
            <div className="lg:col-span-4 animate-in fade-in slide-in-from-left-8 duration-700 delay-100">
               <div className="bg-slate-800/50 backdrop-blur-xl border border-purple-500/20 rounded-2xl p-6 shadow-2xl shadow-purple-900/20">
                   <div className="flex items-center gap-3 mb-6 pb-4 border-b border-purple-500/20">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Shield className="w-6 h-6 text-purple-400" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider">Quản Trị Viên</h2>
                   </div>
                   
                   <div className="space-y-3">
                      {admins.map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleUserClick(user)}
                          className="w-full bg-slate-900/50 hover:bg-purple-900/20 p-4 rounded-xl border border-slate-700 hover:border-purple-500/50 transition-all text-left flex items-center gap-4 group"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                            {user.name.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-200 group-hover:text-purple-300 transition-colors">{user.name}</h3>
                            <span className="inline-block mt-1 text-[10px] font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                              Bấm để vào ngay
                            </span>
                          </div>
                          <Lock className="w-4 h-4 text-slate-500 ml-auto group-hover:text-purple-400" />
                        </button>
                      ))}
                   </div>
               </div>
            </div>

            {/* User Column */}
            <div className="lg:col-span-8 animate-in fade-in slide-in-from-right-8 duration-700 delay-200">
               <div className="bg-slate-800/50 backdrop-blur-xl border border-emerald-500/20 rounded-2xl p-6 shadow-2xl shadow-emerald-900/20 h-full">
                   <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-500/20">
                      <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <UserIcon className="w-6 h-6 text-emerald-400" />
                      </div>
                      <h2 className="text-lg font-bold text-slate-100 uppercase tracking-wider">Cán Bộ / Nhân Viên</h2>
                   </div>
                   
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      <style>{`
                        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
                        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16,185,129,0.3); border-radius: 2px; }
                      `}</style>
                      {regularUsers.map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleUserClick(user)}
                          className="bg-slate-900/50 hover:bg-emerald-900/20 p-3 rounded-xl border border-slate-700 hover:border-emerald-500/50 transition-all text-left flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors border border-slate-600">
                            {user.name.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-300 text-sm truncate group-hover:text-emerald-300 transition-colors">{user.name}</h3>
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">Bấm để đăng nhập</p>
                          </div>
                          <LogIn className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity -ml-2" />
                        </button>
                      ))}
                   </div>
               </div>
            </div>
        </div>
      </div>

      {/* Auto Login Loading Overlay */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={`bg-slate-900 border ${selectedUser.role === 'admin' ? 'border-purple-500/30' : 'border-emerald-500/30'} rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center relative animate-in zoom-in-95 duration-300`}>
                
                {/* Close button only shows if error occurs or stuck */}
                {(error || infoMessage) && (
                    <button onClick={handleCancel} className="absolute top-2 right-2 p-2 text-slate-500 hover:text-white"><X/></button>
                )}

                <div className="relative mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center border-4 ${selectedUser.role === 'admin' ? 'border-purple-500/30 bg-purple-500/10' : 'border-emerald-500/10 bg-emerald-500/10'}`}>
                        {selectedUser.role === 'admin' ? <Shield className="w-10 h-10 text-purple-500" /> : <UserIcon className="w-10 h-10 text-emerald-500" />}
                    </div>
                    {isLoading && (
                        <div className="absolute inset-0 rounded-full border-t-4 border-white animate-spin"></div>
                    )}
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{selectedUser.name}</h3>
                
                {!error && !infoMessage && (
                    <p className="text-slate-400 animate-pulse text-sm">Đang truy cập hệ thống...</p>
                )}

                {isRegistering && (
                    <p className="text-[10px] text-blue-400 mt-2">Đang khởi tạo tài khoản lần đầu...</p>
                )}

                {error && (
                    <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 text-red-400 text-sm w-full">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> 
                        <span>{error}</span>
                    </div>
                )}

                {infoMessage && (
                    <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2 text-blue-400 text-sm w-full">
                        <Mail className="w-4 h-4 shrink-0 mt-0.5" /> 
                        <span>{infoMessage}</span>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};