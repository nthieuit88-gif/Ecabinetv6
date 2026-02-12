import { LucideIcon } from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
}

export interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
}

export interface ChartData {
  name: string;
  meetings: number;
}

export interface QuickActionProps {
  label: string;
  icon: LucideIcon;
  color: string;
  onClick: () => void;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  status: 'available' | 'occupied' | 'maintenance';
  facilities: string[];
  image?: string;
  documentIds?: string[]; // New field: Linked documents (e.g., manuals)
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  status: 'active' | 'inactive';
  avatar?: string;
  department: string;
}

export interface Meeting {
  id: string;
  title: string;
  roomId: string; // Relational link to Room
  hostId: string; // Relational link to User
  startTime: string;
  endTime: string;
  date: string;
  status: 'upcoming' | 'ongoing' | 'finished' | 'cancelled';
  participants: number;
  participantIds?: string[]; // List of specific user IDs participating
  documentIds?: string[]; // New field: Linked documents for the meeting
}

export interface Document {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'xls' | 'ppt' | 'other';
  size: string;
  updatedAt: string;
  ownerId: string; // Relational link to User
  url?: string; // Link to the file in Supabase Storage
}