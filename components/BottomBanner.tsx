import React from 'react';

export const BottomBanner: React.FC = () => {
  return (
    <div className="bg-slate-900 border-t border-emerald-900/50 h-8 shrink-0 relative overflow-hidden flex items-center shadow-[0_-5px_15px_rgba(0,0,0,0.3)] z-20">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900"></div>
      
      {/* Scrolling Text Container */}
      <div className="w-full overflow-hidden flex items-center relative z-10">
        <div className="animate-[scroll_15s_linear_infinite] whitespace-nowrap flex gap-10 min-w-full">
            {/* Content repeated to ensure smooth loop */}
            {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 text-[10px] md:text-xs font-bold tracking-widest text-emerald-300 uppercase">
                    <span className="text-emerald-500">✦</span>
                    <span>BẢN QUYỀN THUỘC VỀ N.TRUNG.HIẾU_CS</span>
                    <span className="text-slate-600">|</span>
                    <span>HOTLINE HỖ TRỢ KỸ THUẬT: <span className="text-yellow-400 text-shadow">0916.499.916</span></span>
                    <span className="text-slate-600">|</span>
                    <span>PHIÊN BẢN HOÀN THIỆN V6.0</span>
                    <span className="text-emerald-500">✦</span>
                </div>
            ))}
        </div>
        
        {/* CSS for Scroll Animation */}
        <style>{`
          @keyframes scroll {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {/* Side Vignettes to fade text out */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-20"></div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-20"></div>
    </div>
  );
};