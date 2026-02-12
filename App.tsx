import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RoomList } from './components/RoomList';
import { MeetingList } from './components/MeetingList';
import { DocumentList } from './components/DocumentList';
import { UserList } from './components/UserList';
import { LiveMeeting } from './components/LiveMeeting';
import { LoginScreen } from './components/LoginScreen'; 
import { TopBanner } from './components/TopBanner';
import { BottomBanner } from './components/BottomBanner'; // Import BottomBanner
import { MEETINGS, ROOMS, DOCUMENTS, USERS } from './data';
import { Meeting, Room, Document, User } from './types';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [tempMeeting, setTempMeeting] = useState<Meeting | null>(null);

  // --- GLOBAL STATE (Single Source of Truth) ---
  const [meetings, setMeetings] = useState<Meeting[]>(MEETINGS);
  const [rooms, setRooms] = useState<Room[]>(ROOMS);
  const [documents, setDocuments] = useState<Document[]>(DOCUMENTS);
  const [users, setUsers] = useState<User[]>(USERS);

  const handleNavigate = (tab: string, action: string | null = null) => {
    setActiveTab(tab);
    if (action) {
      setPendingAction(action);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard'); // Reset tab
  };

  // --- DATA HANDLERS ---
  const handleAddMeeting = (newMeeting: Meeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
  };
  const handleUpdateMeeting = (updatedMeeting: Meeting) => {
    setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
  };
  const handleDeleteMeeting = (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
  };

  const handleAddRoom = (newRoom: Room) => {
    setRooms(prev => [newRoom, ...prev]);
  };
  const handleUpdateRoomStatus = (id: string, status: Room['status']) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleAddDocument = (newDoc: Document) => {
    setDocuments(prev => [newDoc, ...prev]);
  };
  const handleDeleteDocument = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
  };
  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };
  const handleDeleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
  };
  
  // ---------------------

  const handleJoinMeeting = (meetingId: string) => {
    setActiveMeetingId(meetingId);
    setTempMeeting(null);
    setActiveTab('live-meeting');
  };

  const handleJoinRoom = (roomId: string) => {
    // 1. Check if there is an ongoing meeting in this room from State
    const ongoingMeeting = meetings.find(m => m.roomId === roomId && m.status === 'ongoing');
    
    if (ongoingMeeting) {
       setActiveMeetingId(ongoingMeeting.id);
       setTempMeeting(null);
    } else {
       // 2. If not, create a temporary ad-hoc meeting
       const room = rooms.find(r => r.id === roomId);
       if (!room) return;
       
       const adHocMeeting: Meeting = {
          id: `adhoc-${Date.now()}`,
          title: `Họp nhanh tại ${room.name}`,
          roomId: room.id,
          hostId: currentUser?.id || 'u1', // Use current user as host
          startTime: new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'}),
          endTime: 'Unknown',
          date: new Date().toLocaleDateString('vi-VN'),
          status: 'ongoing',
          participants: 1,
          documentIds: room.documentIds || []
       };
       setTempMeeting(adHocMeeting);
       setActiveMeetingId(adHocMeeting.id);
    }
    setActiveTab('live-meeting');
  };

  const handleLeaveMeeting = () => {
    const returnTab = tempMeeting ? 'rooms' : 'meetings';
    setActiveMeetingId(null);
    setTempMeeting(null);
    setActiveTab(returnTab);
  };

  const handleActionComplete = () => {
    setPendingAction(null);
  };

  // --- RENDER LOGIN SCREEN IF NO USER ---
  if (!currentUser) {
    return <LoginScreen users={users} onSelectUser={setCurrentUser} />;
  }

  // --- MAIN APP CONTENT ---
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            currentUser={currentUser}
            onNavigate={handleNavigate} 
            meetings={meetings}
            rooms={rooms}
            documents={documents}
          />
        );
      case 'rooms':
        return (
          <RoomList 
            rooms={rooms}
            onAddRoom={handleAddRoom}
            onUpdateRoomStatus={handleUpdateRoomStatus}
            pendingAction={pendingAction} 
            onActionComplete={handleActionComplete} 
            onJoinRoom={handleJoinRoom} 
            allDocuments={documents}
          />
        );
      case 'meetings':
        return (
          <MeetingList 
            currentUser={currentUser}
            meetings={meetings}
            onAddMeeting={handleAddMeeting}
            onUpdateMeeting={handleUpdateMeeting}
            onDeleteMeeting={handleDeleteMeeting}
            pendingAction={pendingAction} 
            onActionComplete={handleActionComplete} 
            onJoinMeeting={handleJoinMeeting}
            allDocuments={documents}
            allRooms={rooms}
            allUsers={users}
          />
        );
      case 'documents':
        return (
          <DocumentList 
            currentUser={currentUser}
            documents={documents}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            pendingAction={pendingAction} 
            onActionComplete={handleActionComplete} 
          />
        );
      case 'users':
        return (
          <UserList 
            users={users}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onDeleteUser={handleDeleteUser}
            pendingAction={pendingAction} 
            onActionComplete={handleActionComplete} 
          />
        );
      case 'live-meeting':
        let meeting = meetings.find(m => m.id === activeMeetingId);
        if (!meeting && tempMeeting && tempMeeting.id === activeMeetingId) {
             meeting = tempMeeting;
        }
        if (!meeting) return <MeetingList currentUser={currentUser} meetings={meetings} onAddMeeting={handleAddMeeting} onUpdateMeeting={handleUpdateMeeting} onDeleteMeeting={handleDeleteMeeting} allDocuments={documents} allRooms={rooms} allUsers={users} />; 
        
        return (
          <LiveMeeting 
            currentUser={currentUser}
            meeting={meeting} 
            onLeave={handleLeaveMeeting} 
            allDocuments={documents}
          />
        );
      default:
        return <Dashboard currentUser={currentUser} onNavigate={handleNavigate} meetings={meetings} rooms={rooms} documents={documents} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar - Hide in live meeting */}
      {activeTab !== 'live-meeting' && (
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => handleNavigate(tab)} onLogout={handleLogout} />
      )}

      {/* Main Content */}
      <main className={`flex-1 h-screen flex flex-col overflow-hidden ${activeTab !== 'live-meeting' ? 'ml-64' : 'ml-0'}`}>
        {/* Render TopBanner ONLY if NOT in live-meeting */}
        {activeTab !== 'live-meeting' && <TopBanner />}
        
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
           {renderContent()}
        </div>

        {/* Render BottomBanner ONLY if NOT in live-meeting */}
        {activeTab !== 'live-meeting' && <BottomBanner />}
      </main>
    </div>
  );
};

export default App;