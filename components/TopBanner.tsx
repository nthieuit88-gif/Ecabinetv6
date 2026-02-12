import React from 'react';
import { MonitorPlay, Layers, Activity } from 'lucide-react';

export const TopBanner: React.FC = () => {
  return (
    <div className="relative w-full h-32 md:h-40 overflow-hidden bg-slate-900 shrink-0 shadow-lg z-20 group">
      {/* 1. Dynamic Animated Background Layer */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center opacity-20 group-hover:scale-105 transition-transform duration-[20s]"></div>
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-emerald-900/80 to-slate-900 mix-blend-multiply"></div>
      
      {/* Animated Abstract Blobs */}
      <div className="absolute top-[-50%] left-[-10%] w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl animate-[pulse_8s_infinite]"></div>
      <div className="absolute bottom-[-50%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-[pulse_10s_infinite_reverse]"></div>

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px]"></div>

      {/* 2. Content Layer */}
      <div className="absolute inset-0 flex items-center justify-between px-6 md:px-12 z-10">
         
         {/* Left Decor: Logo Area */}
         <div className="hidden md:flex items-center gap-4 animate-in slide-in-from-left duration-700">
            <div className="relative w-16 h-16 flex items-center justify-center">
               <div className="absolute inset-0 bg-emerald-500/20 rounded-2xl animate-spin-slow blur-sm"></div>
               <div className="relative bg-gradient-to-br from-emerald-400 to-cyan-600 w-14 h-14 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/40 border border-emerald-200/30">
                  <MonitorPlay className="text-white w-8 h-8" />
               </div>
            </div>
            <div>
               <div className="h-1 w-12 bg-emerald-500 rounded-full mb-1"></div>
               <div className="h-1 w-8 bg-emerald-500/50 rounded-full"></div>
            </div>
         </div>

         {/* Center Text */}
         <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2">
            <div className="relative">
              <h1 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-200 via-emerald-300 to-cyan-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] tracking-tight uppercase">
                Hệ Thống Phòng Họp Không Giấy
              </h1>
              <span className="absolute -top-4 -right-6 text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-white font-bold hidden md:block shadow-lg shadow-emerald-500/50 animate-bounce">
                v6.0 Live
              </span>
            </div>
            
            <div className="flex items-center gap-3 text-emerald-300 text-xs md:text-sm font-medium tracking-widest uppercase">
               <span className="flex items-center gap-1"><Layers className="w-3 h-3" /> eCabinet</span>
               <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
               <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> Real-time</span>
               <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
               <span>Secure</span>
            </div>
         </div>

         {/* Right Decor: VN Flag stylized or Emblem */}
         <div className="hidden md:block animate-in slide-in-from-right duration-700">
            <div className="text-right">
               <p className="text-[10px] text-emerald-400 font-mono mb-0.5">SYSTEM STATUS</p>
               <div className="flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-lg border border-emerald-500/30">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-xs font-bold text-emerald-100">ONLINE</span>
               </div>
            </div>
         </div>
      </div>
      
      {/* Bottom Glowing Line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_-2px_10px_rgba(16,185,129,0.5)]"></div>
    </div>
  );
};