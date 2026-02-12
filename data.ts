import { User, Room, Meeting, Document } from './types';

// 1. Users Data (Single Source of Truth)
export const USERS: User[] = [
  { id: 'u1', name: 'Admin Test', email: 'admin@ecabinet.vn', role: 'admin', status: 'active', department: 'IT System' },
  { id: 'u2', name: 'Nguyễn Văn A', email: 'nguyenvana@ecabinet.vn', role: 'user', status: 'active', department: 'Kinh Doanh' },
  { id: 'u3', name: 'Trần Thị B', email: 'tranthib@ecabinet.vn', role: 'user', status: 'inactive', department: 'Nhân Sự' },
  { id: 'u4', name: 'Lê Văn C', email: 'levanc@ecabinet.vn', role: 'user', status: 'active', department: 'Kế Toán' },
  // Added 10 new users below
  { id: 'u5', name: 'Phạm Văn Dũng', email: 'phamdung@ecabinet.vn', role: 'user', status: 'active', department: 'Kỹ Thuật' },
  { id: 'u6', name: 'Hoàng Thị E', email: 'hoangthie@ecabinet.vn', role: 'user', status: 'active', department: 'Marketing' },
  { id: 'u7', name: 'Vũ Văn F', email: 'vuvanf@ecabinet.vn', role: 'user', status: 'active', department: 'Pháp Chế' },
  { id: 'u8', name: 'Đặng Thị Gấm', email: 'danggam@ecabinet.vn', role: 'user', status: 'active', department: 'Tài Chính' },
  { id: 'u9', name: 'Bùi Văn Hùng', email: 'buihung@ecabinet.vn', role: 'user', status: 'active', department: 'Hành Chính' },
  { id: 'u10', name: 'Đỗ Thị I', email: 'dothii@ecabinet.vn', role: 'user', status: 'active', department: 'CSKH' },
  { id: 'u11', name: 'Ngô Văn Kiên', email: 'ngokien@ecabinet.vn', role: 'user', status: 'active', department: 'R&D' },
  { id: 'u12', name: 'Dương Thị Lan', email: 'duonglan@ecabinet.vn', role: 'user', status: 'active', department: 'Mua Hàng' },
  { id: 'u13', name: 'Lý Văn Minh', email: 'lyminh@ecabinet.vn', role: 'user', status: 'active', department: 'Kho Vận' },
  { id: 'u14', name: 'Trương Thị Ngọc', email: 'truongngoc@ecabinet.vn', role: 'user', status: 'active', department: 'Kế Hoạch' },
];

// 2. Rooms Data
export const ROOMS: Room[] = [
  {
    id: 'r1',
    name: 'Phòng Họp Chính (Main Hall)',
    capacity: 50,
    status: 'available',
    facilities: ['Wifi', 'Projector', 'Coffee'],
    documentIds: ['d3'], // Attached project document/manual
  },
  {
    id: 'r2',
    name: 'Phòng Sáng Tạo (Creative Lab)',
    capacity: 12,
    status: 'occupied',
    facilities: ['Wifi', 'TV', 'Whiteboard'],
  },
  {
    id: 'r3',
    name: 'Phòng VIP 1',
    capacity: 8,
    status: 'maintenance',
    facilities: ['Wifi', 'TV', 'Private'],
  },
  {
    id: 'r4',
    name: 'Phòng Họp Nhỏ A',
    capacity: 6,
    status: 'available',
    facilities: ['Wifi', 'TV'],
  },
];

// 3. Meetings Data (Linked to Rooms and Users)
export const MEETINGS: Meeting[] = [
  {
    id: 'm1',
    title: 'Họp giao ban đầu tuần',
    roomId: 'r1', // Linked to Main Hall
    hostId: 'u2', // Linked to Nguyen Van A
    startTime: '08:00',
    endTime: '09:30',
    date: '26/02/2024',
    status: 'finished',
    participants: 12,
    participantIds: ['u2', 'u3', 'u4', 'u5', 'u6'], // Example data
    documentIds: ['d1', 'd2'], // Linked documents
  },
  {
    id: 'm2',
    title: 'Review thiết kế UI/UX App',
    roomId: 'r2', // Linked to Creative Lab
    hostId: 'u1', // Linked to Admin Test
    startTime: '14:00',
    endTime: '15:30',
    date: '26/02/2024',
    status: 'ongoing',
    participants: 5,
    participantIds: ['u1', 'u5', 'u11'],
    documentIds: ['d3'],
  },
  {
    id: 'm3',
    title: 'Gặp gỡ đối tác ABC Corp',
    roomId: 'r3', // Linked to VIP 1
    hostId: 'u3', // Linked to Tran Thi B
    startTime: '09:00',
    endTime: '11:00',
    date: '27/02/2024',
    status: 'upcoming',
    participants: 4,
    participantIds: ['u3', 'u8'],
    documentIds: ['d4'],
  },
  {
    id: 'm4',
    title: 'Đào tạo nhân sự mới',
    roomId: 'r1',
    hostId: 'u3',
    startTime: '13:30',
    endTime: '16:00',
    date: '28/02/2024',
    status: 'upcoming',
    participants: 20,
    participantIds: ['u3', 'u5', 'u6', 'u7', 'u8'],
    documentIds: ['d5'],
  }
];

// 4. Documents Data (Linked to Users)
export const DOCUMENTS: Document[] = [
  // Added sample URL for d1 to match SQL
  { id: 'd1', name: 'Bien_ban_cuoc_hop_tuan_4.docx', type: 'doc', size: '2.4 MB', updatedAt: '26/02/2024', ownerId: 'u1', url: 'https://filesamples.com/samples/document/docx/sample2.docx' },
  { id: 'd2', name: 'Bao_cao_tai_chinh_Q1.xlsx', type: 'xls', size: '5.1 MB', updatedAt: '25/02/2024', ownerId: 'u4' },
  // Add a valid sample PDF URL for d3 to make the demo work smoothly
  { 
    id: 'd3', 
    name: 'Tai_lieu_du_an_eCabinet.pdf', 
    type: 'pdf', 
    size: '12.8 MB', 
    updatedAt: '24/02/2024', 
    ownerId: 'u2',
    url: 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf'
  },
  { id: 'd4', name: 'Slide_thuyet_trinh_T2.pptx', type: 'ppt', size: '8.5 MB', updatedAt: '24/02/2024', ownerId: 'u1' },
  { id: 'd5', name: 'Danh_sach_nhan_su_moi.xls', type: 'xls', size: '1.2 MB', updatedAt: '23/02/2024', ownerId: 'u3' },
];

// Helper functions for easy lookup
export const getUserById = (id: string) => USERS.find(u => u.id === id);
export const getRoomById = (id: string) => ROOMS.find(r => r.id === id);