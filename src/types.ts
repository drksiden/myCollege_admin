import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'student';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student extends User {
  groupId?: string;
  specialization?: string;
  year?: number;
}

export interface Teacher extends User {
  subjects?: string[];
  specialization?: string;
  groups?: string[];
  experience?: number;
  education?: string;
}

export interface Group {
  id: string;
  name: string;
  year: number;
  specialization: string;
  students: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  credits: number;
  hours: number;
  teacherId?: string;
  groupId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Schedule {
  id: string;
  groupId: string;
  semester: number;
  year: number;
  entries: ScheduleEntry[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ScheduleEntry {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  subject: string;
  teacherId: string;
  room: string;
}

export interface Lesson {
  id: string;
  subject: string;
  teacherId: string;
  room: string;
  startTime: string;
  endTime: string;
  dayOfWeek: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  subjectId: string;
  groupId: string;
  date: Timestamp;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AttendanceRecord {
  id: string;
  date: Timestamp;
  subjectId: string;
  groupId: string;
  records: {
    studentId: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    notes?: string;
  }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  groupId: string;
  teacherId: string;
  value: number;
  type: 'exam' | 'test' | 'homework' | 'project';
  semester: number;
  date: Timestamp;
  notes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'grade' | 'attendance' | 'system';
  read: boolean;
  data?: Record<string, unknown>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Comment {
  id: string;
  gradeId: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface News {
  id: string;
  title: string;
  content: string;
  authorId: string;
  imageUrl?: string;
  isPublished: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: {
    content: string;
    senderId: string;
    timestamp: Timestamp;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  isDeleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 