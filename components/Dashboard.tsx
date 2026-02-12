import React from 'react';
import { 
  FileText, CalendarClock, Video, Search, Bell, Clock, 
  MoreHorizontal, ArrowUpRight, Calendar, Users, Briefcase, 
  ChevronRight, Plus, Activity
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Meeting, Room, Document, User } from '../types';

interface DashboardProps {
  currentUser: User;
  onNavigate: (tab: string, action?: string) => void;
  meetings: Meeting[];
  rooms: Room[];
  documents: Document[];
}

export const Dashboard: React.FC<DashboardProps> = ({ currentUser, onNavigate, meetings, rooms, documents }) => {
  // Stats Calculation
  const totalDocs = documents.length;
  const upcomingMeetings = meetings.filter(m => m.status === 'upcoming').sort((a, b) => a.startTime.localeCompare(b.startTime));
  const ongoingMeetings = meetings.filter(m => m.status === 'ongoing');
  const roomsInUse = rooms.filter(r => r.status === 'occupied');
  
  // Mock Chart Data
  const data = [
    { name: 'T2', meetings: 4, docs: 2 },
    { name: 'T3', meetings: 3, docs: 5 },
    { name: 'T4', meetings: 7, docs: 3 },
    { name: 'T5', meetings: 5, docs: 8 },
    { name: 'T6', meetings: 6, docs: 4 },
    { name: 'T7', meetings: 2, docs: 1 },
    { name: 'CN', meetings: 1, docs: 0 },
  ];

  return (
    <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Tổng Quan</h2>
          <p className="text-slate-500 font-medium mt-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Hệ thống eCabinet đang hoạt động ổn định
          </p>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
           <div className="relative group">
             <input 
               type="text" 
               placeholder="Tìm kiếm nhanh..." 
               className="pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all w-48 focus:w-64"
             />
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
           </div>
           <button className="p-2.5 hover:bg-slate-50 rounded-xl relative text-slate-500 hover:text-emerald-600 transition-colors">
             <Bell className="w-5 h-5" />
             <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
           </button>
           <div className="h-8 w-px bg-slate-200 mx-1"></div>
           <div className="flex items-center gap-3 pr-2">
              <div className="text-right hidden md:block">
                 <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                 <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{currentUser.role === 'admin' ? 'Administrator' : 'User'}</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-200">
                {currentUser.name.charAt(0)}
              </div>
           </div>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Cuộc họp sắp tới', val: upcomingMeetings.length, icon: CalendarClock, color: 'text-blue-600', bg: 'bg-blue-50', trend: '+12%' },
          { label: 'Phòng đang họp', val: roomsInUse.length, icon: Video, color: 'text-red-500', bg: 'bg-red-50', trend: 'Cao điểm' },
          { label: 'Tài liệu mới', val: totalDocs, icon: FileText, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+5 file' },
          { label: 'Nhân sự online', val: '14', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50', trend: 'Ổn định' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 hover:border-emerald-200 transition-all hover:shadow-md group cursor-default">
             <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${stat.bg} ${stat.color} group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full flex items-center gap-1">
                  <Activity className="w-3 h-3" /> {stat.trend}
                </span>
             </div>
             <div>
               <h3 className="text-3xl font-black text-slate-800 tracking-tight">{stat.val}</h3>
               <p className="text-slate-500 font-medium text-sm mt-1">{stat.label}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Chart & Timeline (Span 2) */}
        <div className="lg:col-span-2 space-y-8">
           
           {/* Chart Section */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                 <div>
                    <h3 className="text-lg font-bold text-slate-800">Thống Kê Hoạt Động</h3>
                    <p className="text-sm text-slate-500">Tần suất cuộc họp trong tuần qua</p>
                 </div>
                 <select className="bg-slate-50 border-none text-sm font-medium text-slate-600 rounded-lg px-3 py-1.5 focus:ring-0">
                    <option>7 ngày qua</option>
                    <option>Tháng này</option>
                 </select>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorDocs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', border: 'none' }}
                      itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="meetings" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMeetings)" name="Cuộc họp" />
                    <Area type="monotone" dataKey="docs" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorDocs)" name="Tài liệu" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>

           {/* Timeline Section */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-500" />
                    Lịch Trình Hôm Nay
                 </h3>
                 <button 
                   onClick={() => onNavigate('meetings')}
                   className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                 >
                    Xem tất cả <ChevronRight className="w-4 h-4" />
                 </button>
              </div>
              
              <div className="space-y-0">
                 {upcomingMeetings.length === 0 && ongoingMeetings.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                       <CalendarClock className="w-12 h-12 mx-auto mb-3 opacity-20" />
                       <p>Không có lịch họp nào hôm nay</p>
                    </div>
                 ) : (
                    <>
                       {/* Ongoing Section */}
                       {ongoingMeetings.map((meeting) => (
                          <div key={meeting.id} className="relative pl-8 pb-8 border-l-2 border-emerald-500 last:border-l-0 last:pb-0 group">
                             <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-sm group-hover:scale-125 transition-transform"></div>
                             <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                   <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Đang diễn ra
                                   </span>
                                   <span className="text-sm font-bold text-slate-700">{meeting.startTime} - {meeting.endTime}</span>
                                </div>
                                <h4 className="text-base font-bold text-slate-800 mb-1">{meeting.title}</h4>
                                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                                   <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {meeting.participants} tham gia</span>
                                   <span className="flex items-center gap-1"><Video className="w-3 h-3" /> Phòng họp số 1</span>
                                </div>
                                <button onClick={() => onNavigate('live-meeting')} className="mt-3 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold shadow-sm shadow-emerald-200 transition-colors">
                                   Tham gia ngay
                                </button>
                             </div>
                          </div>
                       ))}

                       {/* Upcoming Section */}
                       {upcomingMeetings.slice(0, 3).map((meeting, idx) => (
                          <div key={meeting.id} className="relative pl-8 pb-8 border-l-2 border-slate-200 last:border-transparent last:pb-0 group">
                             <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-slate-300 group-hover:border-emerald-500 transition-colors"></div>
                             <div className="bg-white p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group-hover:translate-x-1">
                                <div className="flex justify-between items-start mb-1">
                                   <h4 className="text-sm font-bold text-slate-800">{meeting.title}</h4>
                                   <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded">{meeting.startTime}</span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">Chủ trì: Admin • Phòng họp lớn</p>
                             </div>
                          </div>
                       ))}
                    </>
                 )}
              </div>
           </div>
        </div>

        {/* Right Column: Quick Actions & Status (Span 1) */}
        <div className="space-y-8">
           
           {/* Quick Actions Grid */}
           <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
              
              <h3 className="text-lg font-bold mb-6 relative z-10 flex items-center gap-2">
                 <Briefcase className="w-5 h-5 text-emerald-400" /> Thao Tác Nhanh
              </h3>
              
              <div className="grid grid-cols-2 gap-3 relative z-10">
                 <button onClick={() => onNavigate('meetings', 'create')} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all border border-white/5 hover:border-emerald-500/50 group">
                    <div className="p-2 bg-emerald-500 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-emerald-900/50">
                       <Plus className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-300">Tạo Cuộc Họp</span>
                 </button>
                 <button onClick={() => onNavigate('documents', 'upload')} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all border border-white/5 hover:border-blue-500/50 group">
                    <div className="p-2 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-blue-900/50">
                       <FileText className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-300">Tải Tài Liệu</span>
                 </button>
                 <button onClick={() => onNavigate('rooms', 'add')} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all border border-white/5 hover:border-purple-500/50 group">
                    <div className="p-2 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-purple-900/50">
                       <Video className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-300">Thêm Phòng</span>
                 </button>
                 <button onClick={() => onNavigate('users')} className="bg-white/10 hover:bg-white/20 p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all border border-white/5 hover:border-orange-500/50 group">
                    <div className="p-2 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform shadow-lg shadow-orange-900/50">
                       <Users className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-slate-300">Nhân Sự</span>
                 </button>
              </div>
           </div>

           {/* Room Status List */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Trạng Thái Phòng</h3>
              <div className="space-y-3">
                 {rooms.slice(0, 4).map(room => (
                    <div key={room.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-10 rounded-full ${
                             room.status === 'available' ? 'bg-emerald-500' : 
                             room.status === 'occupied' ? 'bg-red-500' : 'bg-gray-400'
                          }`}></div>
                          <div>
                             <h4 className="text-sm font-bold text-slate-700">{room.name}</h4>
                             <p className="text-[10px] text-slate-500">Sức chứa: {room.capacity}</p>
                          </div>
                       </div>
                       <span className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase ${
                          room.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 
                          room.status === 'occupied' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                       }`}>
                          {room.status === 'available' ? 'Sẵn sàng' : 
                           room.status === 'occupied' ? 'Đang họp' : 'Bảo trì'}
                       </span>
                    </div>
                 ))}
                 <button onClick={() => onNavigate('rooms')} className="w-full text-center text-xs font-bold text-slate-500 hover:text-emerald-600 mt-2 py-2">
                    Xem tất cả phòng
                 </button>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
};