import React, { useState } from 'react';
import { User } from '../types';
import { Shield, User as UserIcon, LogIn, MonitorPlay, Lock, X, CheckCircle2, Loader2, AlertTriangle, RefreshCw, Mail } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  users: User[];
  onSelectUser: (user: User) => void; // Kept for type compatibility but deprecated in logic
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ users }) => {
  const admins = users.filter(u => u.role === 'admin');
  const regularUsers = users.filter(u => u.role !== 'admin');

  // Unified State for Login Modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Default password state
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState(''); // New state for non-error messages (e.g. email verification)
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    // Pre-fill password based on role for easier testing
    if (user.role === 'admin') {
         setPassword('Longphu25##');
    } else {
         setPassword('Longphu26##');
    }
    setError('');
    setInfoMessage('');
    setIsRegistering(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsLoading(true);
    setError('');
    setInfoMessage('');

    try {
      // 1. Try to Login first
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: selectedUser.email,
        password: password
      });

      if (authError) {
        // Handle "Email not confirmed" specifically
        if (authError.message.includes("Email not confirmed")) {
            setInfoMessage("Vui lòng kiểm tra email để xác thực tài khoản trước khi đăng nhập.");
            setIsLoading(false);
            return;
        }

        // If login fails because invalid credentials (likely user doesn't exist in Auth yet)
        if (authError.message === 'Invalid login credentials') {
           console.log("Login failed, attempting auto-registration...");
           setIsRegistering(true);
           
           // 2. Attempt Auto-Registration
           const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
             email: selectedUser.email,
             password: password,
             options: {
               data: {
                 name: selectedUser.name,
                 role: selectedUser.role
               }
             }
           });

           if (signUpError) {
             // If signup also fails (e.g. user exists but password IS wrong), throw original error
             if (signUpError.message.includes("already registered")) {
                throw new Error("Mật khẩu không đúng (Hoặc tài khoản đã tồn tại).");
             }
             throw signUpError;
           }

           if (signUpData.session) {
             // Registration successful and session created (Auto Login)
             // App.tsx will catch this via onAuthStateChange
             return; 
           } else if (signUpData.user && !signUpData.session) {
             // SUCCESS BUT NEEDS VERIFICATION
             // Do not throw error, just inform user
             setInfoMessage("Tài khoản đã được tạo thành công! Hệ thống yêu cầu xác thực email. Vui lòng kiểm tra hộp thư của bạn.");
             setIsLoading(false);
             setIsRegistering(false);
             return;
           }
        } else {
          throw authError;
        }
      }
      
      // Success is handled by App.tsx 'onAuthStateChange' listener
    } catch (err: any) {
      console.error("Login/Register Error:", err);
      setError(err.message || 'Lỗi đăng nhập không xác định.');
      setIsLoading(false);
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 font-sans overflow-hidden">
      
      {/* Background - Matches TopBanner Theme */}
      <div className="absolute inset-0 bg-slate-900 z-0">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-10"></div>
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-emerald-900/40 to-slate-900/90"></div>
          {/* Animated Background Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
             <div className="absolute -top-20 -left-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/5 rounded-full blur-[120px]"></div>
             <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[100px] animate-pulse"></div>
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
            Hệ thống quản lý eCabinet <span className="text-emerald-500 font-bold">v6.0</span> (Secured)
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
                              IT System
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
                            <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.department}</p>
                          </div>
                          <LogIn className="w-3 h-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity -ml-2" />
                        </button>
                      ))}
                   </div>
               </div>
            </div>
        </div>

        <div className="mt-12 text-center">
            <p className="text-xs text-slate-600 font-medium">
               © 2024 N.TRUNG.HIẾU_CS | Bảo mật & Tin cậy
            </p>
        </div>
      </div>

      {/* Unified Login Modal for Admin and Users */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className={`bg-slate-900 border ${selectedUser.role === 'admin' ? 'border-purple-500/30' : 'border-emerald-500/30'} rounded-2xl shadow-2xl w-full max-w-md p-8 relative animate-in zoom-in-95 duration-300`}>
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 text-slate-500 hover:text-white p-1 hover:bg-slate-800 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
                
                <div className="flex flex-col items-center mb-8">
                    <div className={`w-20 h-20 ${selectedUser.role === 'admin' ? 'bg-purple-500/10 border-purple-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} rounded-full flex items-center justify-center mb-4 border ring-4 ring-slate-800`}>
                        <Lock className={`w-10 h-10 ${selectedUser.role === 'admin' ? 'text-purple-400' : 'text-emerald-400'}`} />
                    </div>
                    <h3 className="text-2xl font-bold text-white">
                        {selectedUser.role === 'admin' ? 'Xác thực Admin' : 'Đăng nhập người dùng'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                        <span className={`w-2 h-2 ${selectedUser.role === 'admin' ? 'bg-purple-500' : 'bg-emerald-500'} rounded-full animate-pulse`}></span>
                        <p className="text-sm text-slate-300">{selectedUser.name}</p>
                    </div>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="relative">
                        <input 
                            type="password" 
                            autoFocus
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                                setInfoMessage('');
                            }}
                            className={`w-full px-4 py-4 rounded-xl bg-slate-800 border ${error ? 'border-red-500/50 focus:ring-red-500/20' : infoMessage ? 'border-blue-500/50 focus:ring-blue-500/20' : `border-slate-700 focus:ring-${selectedUser.role === 'admin' ? 'purple' : 'emerald'}-500/30`} focus:border-${selectedUser.role === 'admin' ? 'purple' : 'emerald'}-500 focus:ring-4 outline-none transition-all text-center tracking-[0.5em] text-xl text-white placeholder:text-slate-600 placeholder:tracking-normal`}
                            placeholder="NHẬP MẬT KHẨU"
                        />
                    </div>
                    
                    {error && (
                         <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center justify-center gap-2 text-red-400 text-sm animate-in slide-in-from-top-2">
                             <AlertTriangle className="w-4 h-4 shrink-0" /> <span className="text-left">{error}</span>
                         </div>
                    )}

                    {infoMessage && (
                         <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center justify-center gap-2 text-blue-400 text-sm animate-in slide-in-from-top-2">
                             <Mail className="w-4 h-4 shrink-0" /> <span className="text-left">{infoMessage}</span>
                         </div>
                    )}

                    <button 
                        type="submit"
                        disabled={isLoading}
                        className={`w-full bg-gradient-to-r ${selectedUser.role === 'admin' ? 'from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500' : 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500'} text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                {isRegistering ? 'ĐANG TẠO TÀI KHOẢN...' : 'ĐANG XỬ LÝ...'}
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                ĐĂNG NHẬP
                            </>
                        )}
                    </button>
                    
                    {/* Dev Hint */}
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500">
                        {isRegistering ? "Hệ thống đang tự động đăng ký tài khoản này..." : "Hệ thống tự động đồng bộ tài khoản nếu chưa tồn tại."}
                      </p>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};