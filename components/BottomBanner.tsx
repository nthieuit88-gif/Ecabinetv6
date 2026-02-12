import React from 'react';

export const BottomBanner: React.FC = () => {
  return (
    <div className="bg-slate-900 border-t-2 border-emerald-500 py-2 shrink-0 shadow-[0_-2px_8px_rgba(0,0,0,0.3)] z-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400 opacity-75"></div>
      
      <div className="max-w-full mx-auto px-2 text-center relative z-10">
        <h2 className="text-[10px] md:text-xs font-black text-white tracking-widest uppercase drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] animate-pulse">
          MỘT SẢN PHẨM CỦA N.TRUNG.HIẾU_CS SĐT 0916499916
        </h2>
      </div>
    </div>
  );
};