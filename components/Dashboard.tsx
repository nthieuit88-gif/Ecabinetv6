import React from 'react';
import { FileText, CalendarClock, Video, Search, Bell } from 'lucide-react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { StatsCard } from './StatsCard';
import { QuickActions } from './QuickActions';
import { ChartData, Meeting, Room, Document, User } from '../types';

interface DashboardProps {
  currentUser: User;
  onNavigate: (tab: string, action?: string) => void;
  meetings: Meeting[];
  rooms: Room[];
  documents: Document[];
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate, meetings, rooms, documents }) => {
  // Calculate real stats from Props
  const totalDocs = documents.length;
  const upcomingMeetings = meetings.filter(m => m.status === 'upcoming');
  const ongoingMeetings = meetings.filter(m => m.status === 'ongoing');
  const roomsInUse = rooms.filter(r => r.status === 'occupied');
  
  // Calculate Mock Chart Data based on current meetings count for dynamic feel
  const data: ChartData[] = [
    { name: 'T1', meetings: 5 },
    { name: 'T2', meetings: meetings.length + 2 }, // Dynamic
    { name: 'T3', meetings: 6 },
    { name: 'T4', meetings: 4 },
    { name: 'T5', meetings: 9 },
    { name: 'T6', meetings: 7 },
  ];

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tổng Quan</h2>
          <p className="text-sm text-gray-500 mt-1">Chào mừng, {currentUser.name}</p>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Search & Notifs */}
           <button className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm border border-gray-100">
             <Search className="w-5 h-5" />
           </button>
           <button className="p-2 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow-sm border border-gray-100 relative">
             <Bell className="w-5 h-5" />
             <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
           </button>

           {/* User Profile Box */}
           <div className="bg-emerald-50 border border-emerald-100 rounded-lg px-4 py-2 flex items-center gap-3 shadow-sm">
             <div className="w-8 h-8 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-sm">
                {currentUser.name.charAt(0)}
             </div>
             <div className="hidden md:block">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">{currentUser.role === 'admin' ? 'Quản Trị' : 'Nhân Viên'}</p>
                <p className="text-sm font-semibold text-gray-800">{currentUser.name}</p>
             </div>
           </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div onClick={() => onNavigate('documents')} className="cursor-pointer">
          <StatsCard 
            label="Tổng Tài Liệu" 
            value={totalDocs} 
            icon={FileText} 
            iconColor="text-orange-500" 
            iconBg="bg-orange-50"
          />
        </div>
        <div onClick={() => onNavigate('meetings')} className="cursor-pointer">
          <StatsCard 
            label="Cuộc Họp Sắp Tới" 
            value={upcomingMeetings.length} 
            icon={CalendarClock} 
            iconColor="text-emerald-500" 
            iconBg="bg-emerald-50"
          />
        </div>
        <div onClick={() => onNavigate('meetings')} className="cursor-pointer">
          <StatsCard 
            label="Đang Diễn Ra" 
            value={ongoingMeetings.length} 
            icon={Video} 
            iconColor="text-red-500" 
            iconBg="bg-red-50"
          />
        </div>
      </div>

      {/* Main Content Grid: Chart & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Section - Takes 2 cols */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-base font-bold text-gray-800 mb-6">Biểu Đồ Cuộc Họp Theo Tháng</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} barSize={40}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12 }} 
                  dy={10}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="meetings" radius={[4, 4, 4, 4]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#10b981" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Actions - Takes 1 col */}
        <div className="lg:col-span-1">
          <QuickActions currentUser={currentUser} onNavigate={onNavigate} />
        </div>
      </div>

      {/* Bottom Grid: Upcoming & Rooms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings Dynamic State */}
        <div 
          onClick={() => onNavigate('meetings')}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[180px] flex flex-col cursor-pointer hover:border-emerald-200 transition-colors group"
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">Cuộc Họp Sắp Tới</h3>
            <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2 py-1 rounded-md">{upcomingMeetings.length}</span>
          </div>
          {upcomingMeetings.length > 0 ? (
            <div className="space-y-3">
                {upcomingMeetings.slice(0, 2).map(meeting => (
                    <div key={meeting.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="w-10 h-10 bg-white rounded-lg flex flex-col items-center justify-center border border-gray-100 shadow-sm text-xs">
                             <span className="font-bold text-gray-800">{meeting.date.split('/')[0]}</span>
                             <span className="text-gray-400 text-[10px]">T{meeting.date.split('/')[1]}</span>
                        </div>
                        <div className="overflow-hidden">
                             <p className="font-medium text-gray-800 truncate text-sm">{meeting.title}</p>
                             <p className="text-xs text-gray-500 truncate">{meeting.startTime} - {meeting.endTime}</p>
                        </div>
                    </div>
                ))}
                {upcomingMeetings.length > 2 && (
                    <p className="text-xs text-center text-gray-400 mt-2">Xem thêm {upcomingMeetings.length - 2} cuộc họp khác...</p>
                )}
            </div>
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <CalendarClock className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Không có cuộc họp sắp tới</p>
             </div>
          )}
        </div>

        {/* Rooms In Use Dynamic State */}
        <div 
           onClick={() => onNavigate('rooms')}
           className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[180px] flex flex-col cursor-pointer hover:border-emerald-200 transition-colors group"
        >
           <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">Phòng Đang Sử Dụng</h3>
            <span className="bg-emerald-50 text-emerald-600 text-xs font-semibold px-2 py-1 rounded-md">{roomsInUse.length}</span>
          </div>
           {roomsInUse.length > 0 ? (
            <div className="space-y-3">
                 {roomsInUse.map(room => (
                    <div key={room.id} className="flex items-center justify-between p-3 rounded-lg bg-emerald-50/50 border border-emerald-100">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="font-medium text-gray-800 text-sm">{room.name}</span>
                        </div>
                        <span className="text-xs text-emerald-600 font-medium bg-white px-2 py-1 rounded shadow-sm">Đang họp</span>
                    </div>
                ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <Video className="w-10 h-10 mb-2 opacity-20" />
                <p className="text-sm">Không có phòng đang sử dụng</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};