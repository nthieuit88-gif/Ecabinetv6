import React from 'react';
import { LayoutDashboard, Presentation, CalendarDays, FileText, Users, LogOut, MonitorPlay } from 'lucide-react';
import { NavItem } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Tổng Quan', icon: LayoutDashboard, path: '/' },
  { id: 'rooms', label: 'Phòng Họp', icon: Presentation, path: '/rooms' },
  { id: 'meetings', label: 'Cuộc Họp', icon: CalendarDays, path: '/meetings' },
  { id: 'documents', label: 'Tài Liệu', icon: FileText, path: '/documents' },
  { id: 'users', label: 'Người Dùng', icon: Users, path: '/users' },
];

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  return (
    <div className="w-64 bg-white h-full border-r border-gray-200 flex flex-col fixed left-0 top-0 z-10 shadow-sm">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-[pulse_3s_ease-in-out_infinite]">
           <MonitorPlay className="text-white w-7 h-7 drop-shadow-sm" />
        </div>
        <div>
          <h1 className="font-bold text-gray-800 text-lg leading-tight">Phòng Họp</h1>
          <p className="text-xs text-gray-400 font-medium tracking-wide">Không Giấy</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive 
                  ? 'bg-emerald-50 text-emerald-600 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-emerald-500'
                }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-gray-400 group-hover:text-emerald-500'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Đăng Xuất
        </button>
      </div>
    </div>
  );
};