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
import { saveFileToLocal, getFileFromLocal } from './utils/indexedDB';
import { 
  USERS as DEFAULT_USERS, 
  ROOMS as DEFAULT_ROOMS, 
  MEETINGS as DEFAULT_MEETINGS, 
  DOCUMENTS as DEFAULT_DOCUMENTS 
} from './data';

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

  // --- GLOBAL STATE (Initialized with DEFAULTS for Offline First) ---
  const [meetings, setMeetings] = useState<Meeting[]>(DEFAULT_MEETINGS);
  const [rooms, setRooms] = useState<Room[]>(DEFAULT_ROOMS);
  const [documents, setDocuments] = useState<Document[]>(DEFAULT_DOCUMENTS);
  const [users, setUsers] = useState<User[]>(DEFAULT_USERS);

  // --- RESTORE SCROLL POSITION ---
  useEffect(() => {
    const savedScrollY = localStorage.getItem('ecabinet_scrollY');
    if (savedScrollY) {
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollY, 10));
        localStorage.removeItem('ecabinet_scrollY'); 
      }, 100);
    }
  }, []);

  // --- SUPABASE AUTH LISTENER ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
         const { data: userProfile } = await supabase
           .from('users')
           .select('*')
           .eq('email', session.user.email)
           .single();
         
         if (userProfile) {
           setCurrentUser(userProfile);
         } else if (session.user.email) {
           setCurrentUser({
             id: session.user.id,
             name: session.user.user_metadata?.name || session.user.email.split('@')[0],
             email: session.user.email,
             role: 'user',
             status: 'active',
             department: 'Chưa cập nhật'
           });
         }
      }
      setAuthLoading(false);
    };

    checkUser();

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

  // --- FETCH DATA FROM SUPABASE (With Fallback) ---
  useEffect(() => {
    const fetchAllData = async () => {
      setLoading(true);
      try {
        const { data: usersData } = await supabase.from('users').select('*');
        if (usersData && usersData.length > 0) setUsers(usersData);

        const { data: roomsData } = await supabase.from('rooms').select('*');
        if (roomsData && roomsData.length > 0) setRooms(roomsData);

        const { data: meetingsData } = await supabase.from('meetings').select('*');
        if (meetingsData && meetingsData.length > 0) setMeetings(meetingsData);

        const { data: docsData } = await supabase.from('documents').select('*');
        if (docsData && docsData.length > 0) setDocuments(docsData);

      } catch (error) {
        console.error('Fetching data failed, keeping defaults:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

    // --- REALTIME SUBSCRIPTIONS ---
    const documentsSubscription = supabase
      .channel('public:documents')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const newDoc = payload.new as Document;
          setDocuments((prev) => [newDoc, ...prev]);

          // NEW: If a new doc comes in, try to download and cache it immediately
          // This allows users who are online to have the "original file" for preview
          if (newDoc.url && !newDoc.url.startsWith('blob:')) {
             try {
                // Check if we already have it (e.g. we are the uploader)
                const existing = await getFileFromLocal(newDoc.id);
                if (!existing) {
                    console.log(`[Auto-Cache] Downloading new document: ${newDoc.name}`);
                    const response = await fetch(newDoc.url);
                    if (response.ok) {
                        const blob = await response.blob();
                        await saveFileToLocal(newDoc.id, blob);
                    }
                }
             } catch (e) {
                 console.warn("Auto-cache failed for doc:", newDoc.id, e);
             }
          }

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
  }, [currentUser]);

  const handleNavigate = (tab: string, action: string | null = null) => {
    setActiveTab(tab);
    localStorage.setItem('ecabinet_activeTab', tab);
    
    if (action) {
      setPendingAction(action);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // MEETINGS
  const handleAddMeeting = async (newMeeting: Meeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
    const { error } = await supabase.from('meetings').insert([newMeeting]);
    if (error) console.error('Error adding meeting:', error);
  };
  const handleUpdateMeeting = async (updatedMeeting: Meeting) => {
    setMeetings(prev => prev.map(m => m.id === updatedMeeting.id ? updatedMeeting : m));
    const { error } = await supabase.from('meetings').update(updatedMeeting).eq('id', updatedMeeting.id);
    if (error) console.error('Error updating meeting:', error);
  };
  const handleDeleteMeeting = async (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
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
    setDocuments(prev => [newDoc, ...prev]);
    const { error } = await supabase.from('documents').insert([newDoc]);
    if (error) console.error('Error adding document:', error);
  };
  
  // NEW: Update document handler
  const handleUpdateDocument = async (updatedDoc: Document) => {
    setDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    const { error } = await supabase.from('documents').update(updatedDoc).eq('id', updatedDoc.id);
    if (error) console.error('Error updating document:', error);
  };

  const handleDeleteDocument = async (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
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

  if (!currentUser) {
    // Falls back to local login handling if Supabase fails
    return <LoginScreen users={users} onSelectUser={(user) => setCurrentUser(user)} />;
  }

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
            onUpdateDocument={handleUpdateDocument}
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