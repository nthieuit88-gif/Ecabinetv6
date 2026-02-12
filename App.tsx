import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { RoomList } from './components/RoomList';
import { MeetingList } from './components/MeetingList';
import { DocumentList } from './components/DocumentList';
import { UserList } from './components/UserList';
import { LiveMeeting } from './components/LiveMeeting';
import { LoginScreen } from './components/LoginScreen'; 
import { TopBanner } from './components/TopBanner';
import { BottomBanner } from './components/BottomBanner';
import { Meeting, Room, Document, User } from './types';
import { supabase } from './supabaseClient';
import { USERS as DEFAULT_USERS } from './data'; // Keep as fallback/initial seed if needed

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Initialize activeTab from localStorage to persist state after reload
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('ecabinet_activeTab') || 'dashboard');
  
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [activeMeetingId, setActiveMeetingId] = useState<string | null>(null);
  const [tempMeeting, setTempMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  // --- GLOBAL STATE (Synced with Supabase) ---
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  // --- RESTORE SCROLL POSITION ---
  useEffect(() => {
    // Check if we need to restore scroll position (set by DocumentList before reload)
    const savedScrollY = localStorage.getItem('ecabinet_scrollY');
    if (savedScrollY) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollY, 10));
        localStorage.removeItem('ecabinet_scrollY'); // Clear after restoring
      }, 100); // Small delay to ensure content renders
    }
  }, []);

  // --- FETCH DATA FROM SUPABASE ---
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        // Fetch Users
        const { data: usersData, error: usersError } = await supabase.from('users').select('*');
        if (usersError) console.error('Error fetching users:', usersError);
        else setUsers(usersData || []);

        // Fetch Rooms
        const { data: roomsData, error: roomsError } = await supabase.from('rooms').select('*');
        if (roomsError) console.error('Error fetching rooms:', roomsError);
        else setRooms(roomsData || []);

        // Fetch Meetings
        const { data: meetingsData, error: meetingsError } = await supabase.from('meetings').select('*');
        if (meetingsError) console.error('Error fetching meetings:', meetingsError);
        else setMeetings(meetingsData || []);

        // Fetch Documents
        const { data: docsData, error: docsError } = await supabase.from('documents').select('*');
        if (docsError) console.error('Error fetching documents:', docsError);
        else setDocuments(docsData || []);

        // If no users in DB (first run), use default users but don't save back automatically to avoid conflicts
        if (!usersData || usersData.length === 0) {
           setUsers(DEFAULT_USERS); 
        }

      } catch (error) {
        console.error('Unexpected error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    // --- REALTIME SUBSCRIPTIONS ---
    // This ensures Users see what Admin uploads immediately
    const documentsSubscription = supabase
      .channel('public:documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setDocuments((prev) => [payload.new as Document, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setDocuments((prev) => prev.filter((doc) => doc.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
           setDocuments((prev) => prev.map((doc) => doc.id === payload.new.id ? payload.new as Document : doc));
        }
      })
      .subscribe();

    const meetingsSubscription = supabase
      .channel('public:meetings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMeetings((prev) => [payload.new as Meeting, ...prev]);
        } else if (payload.eventType === 'DELETE') {
          setMeetings((prev) => prev.filter((m) => m.id !== payload.old.id));
        } else if (payload.eventType === 'UPDATE') {
           setMeetings((prev) => prev.map((m) => m.id === payload.new.id ? payload.new as Meeting : m));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(documentsSubscription);
      supabase.removeChannel(meetingsSubscription);
    };
  }, []);

  const handleNavigate = (tab: string, action: string | null = null) => {
    setActiveTab(tab);
    // Save to localStorage so we can stay on this tab after reload
    localStorage.setItem('ecabinet_activeTab', tab);
    
    if (action) {
      setPendingAction(action);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard'); // Reset tab
    localStorage.setItem('ecabinet_activeTab', 'dashboard');
  };

  // --- DATA HANDLERS (CRUD with Supabase) ---

  // MEETINGS
  const handleAddMeeting = async (newMeeting: Meeting) => {
    // Optimistic Update is handled by Realtime, but we keep local set for instant feedback on own device
    const { error } = await supabase.from('meetings').insert([newMeeting]);
    if (error) {
      console.error('Error adding meeting:', error);
      alert("Lỗi khi lưu cuộc họp vào server: " + error.message);
    }
  };
  const handleUpdateMeeting = async (updatedMeeting: Meeting) => {
    const { error } = await supabase.from('meetings').update(updatedMeeting).eq('id', updatedMeeting.id);
    if (error) console.error('Error updating meeting:', error);
  };
  const handleDeleteMeeting = async (id: string) => {
    const { error } = await supabase.from('meetings').delete().eq('id', id);
    if (error) console.error('Error deleting meeting:', error);
  };

  // ROOMS
  const handleAddRoom = async (newRoom: Room) => {
    setRooms(prev => [newRoom, ...prev]);
    const { error } = await supabase.from('rooms').insert([newRoom]);
    if (error) console.error('Error adding room:', error);
  };
  const handleUpdateRoomStatus = async (id: string, status: Room['status']) => {
    setRooms(prev => prev.map(r => r.id === id ? { ...r, status } : r));
    const { error } = await supabase.from('rooms').update({ status }).eq('id', id);
    if (error) console.error('Error updating room status:', error);
  };

  // DOCUMENTS
  const handleAddDocument = async (newDoc: Document) => {
    const { error } = await supabase.from('documents').insert([newDoc]);
    if (error) console.error('Error adding document:', error);
  };
  const handleDeleteDocument = async (id: string) => {
    const { error } = await supabase.from('documents').delete().eq('id', id);
    if (error) console.error('Error deleting document:', error);
  };

  // USERS
  const handleAddUser = async (newUser: User) => {
    setUsers(prev => [newUser, ...prev]);
    const { error } = await supabase.from('users').insert([newUser]);
    if (error) console.error('Error adding user:', error);
  };
  const handleUpdateUser = async (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
    const { error } = await supabase.from('users').update(updatedUser).eq('id', updatedUser.id);
    if (error) console.error('Error updating user:', error);
  };
  const handleDeleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) console.error('Error deleting user:', error);
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
    localStorage.setItem('ecabinet_activeTab', returnTab);
  };

  const handleActionComplete = () => {
    setPendingAction(null);
  };

  if (loading && !currentUser) {
     return <div className="h-screen w-screen flex items-center justify-center bg-gray-50 text-emerald-600">Đang kết nối dữ liệu hệ thống...</div>
  }

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
            onAddDocument={handleAddDocument}
            onUpdateMeeting={handleUpdateMeeting}
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