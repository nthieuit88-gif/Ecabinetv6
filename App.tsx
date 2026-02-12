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
  const [authLoading, setAuthLoading] = useState(true);

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

  // --- SUPABASE AUTH LISTENER ---
  useEffect(() => {
    const checkUser = async () => {
      // 1. Get current session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
         // 2. Fetch user profile details from 'users' table
         const { data: userProfile, error } = await supabase
           .from('users')
           .select('*')
           .eq('email', session.user.email)
           .single();
         
         if (userProfile) {
           setCurrentUser(userProfile);
         } else if (session.user.email) {
           // Fallback: Create a temp user object if profile doesn't exist in 'users' table yet
           // This handles the case where Auth User exists but Profile doesn't
           setCurrentUser({
             id: session.user.id,
             name: session.user.user_metadata?.name || session.user.email.split('@')[0],
             email: session.user.email,
             role: 'user', // Default
             status: 'active',
             department: 'Chưa cập nhật'
           });
         }
      } else {
        setCurrentUser(null);
      }
      setAuthLoading(false);
    };

    checkUser();

    // 3. Listen for changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
         const { data: userProfile } = await supabase
           .from('users')
           .select('*')
           .eq('email', session.user.email)
           .single();
           
         if (userProfile) {
           setCurrentUser(userProfile);
         } else {
           // Fallback
           setCurrentUser({
             id: session.user.id,
             name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
             email: session.user.email || '',
             role: 'user',
             status: 'active',
             department: 'Chưa cập nhật'
           });
         }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setActiveTab('dashboard');
        localStorage.setItem('ecabinet_activeTab', 'dashboard');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // --- FETCH DATA FROM SUPABASE ---
  useEffect(() => {
    // Only fetch data if we have a user (RLS might require it) OR if public access is allowed
    // But generally we fetch all the time, RLS handles the rest (returns empty array if not allowed)
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

      } catch (error) {
        console.error('Unexpected error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    // --- REALTIME SUBSCRIPTIONS ---
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
  }, [currentUser]); // Re-fetch if user changes (permissions might change)

  const handleNavigate = (tab: string, action: string | null = null) => {
    setActiveTab(tab);
    localStorage.setItem('ecabinet_activeTab', tab);
    
    if (action) {
      setPendingAction(action);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // State update handled by onAuthStateChange listener
  };

  // --- DATA HANDLERS (CRUD with Supabase) ---
  // ... (Keep existing handlers, Supabase client handles RLS automatically based on session)

  // MEETINGS
  const handleAddMeeting = async (newMeeting: Meeting) => {
    const { error } = await supabase.from('meetings').insert([newMeeting]);
    if (error) {
      console.error('Error adding meeting:', error);
      alert("Lỗi server: " + error.message);
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
    const ongoingMeeting = meetings.find(m => m.roomId === roomId && m.status === 'ongoing');
    if (ongoingMeeting) {
       setActiveMeetingId(ongoingMeeting.id);
       setTempMeeting(null);
    } else {
       const room = rooms.find(r => r.id === roomId);
       if (!room) return;
       const adHocMeeting: Meeting = {
          id: `adhoc-${Date.now()}`,
          title: `Họp nhanh tại ${room.name}`,
          roomId: room.id,
          hostId: currentUser?.id || 'u1',
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

  if (authLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-gray-900 text-emerald-500 font-bold">Đang xác thực hệ thống...</div>;
  }

  // --- RENDER LOGIN SCREEN IF NO AUTHENTICATED USER ---
  if (!currentUser) {
    // Note: We don't need onSelectUser prop anymore as LoginScreen handles Auth directly
    return <LoginScreen users={users} onSelectUser={() => {}} />;
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
      {activeTab !== 'live-meeting' && (
        <Sidebar activeTab={activeTab} setActiveTab={(tab) => handleNavigate(tab)} onLogout={handleLogout} />
      )}
      <main className={`flex-1 h-screen flex flex-col overflow-hidden ${activeTab !== 'live-meeting' ? 'ml-64' : 'ml-0'}`}>
        {activeTab !== 'live-meeting' && <TopBanner />}
        <div className="flex-1 overflow-y-auto bg-gray-50">
           {renderContent()}
        </div>
        {activeTab !== 'live-meeting' && <BottomBanner />}
      </main>
    </div>
  );
};

export default App;