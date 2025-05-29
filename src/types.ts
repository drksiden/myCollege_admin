import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  iin: string;
  birthDate: Timestamp;
  phone?: string;
  address?: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  teacherId?: string;
  studentId?: string;
  groupId?: string;
  teacherDetails?: {
    department: string;
    qualification: string;
  };
  studentDetails?: {
    groupId: string;
    studentId: string;
  };
}

export interface Student {
  id: string;
  userId: string;
  groupId: string;
  groupName?: string;
  studentCardId: string;
  enrollmentDate: Timestamp;
  dateOfBirth: Timestamp;
  status: 'active' | 'inactive' | 'graduated';
  firstName: string;
  lastName: string;
  phone?: string;
  address?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Teacher {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  subjects: string[];
  groups: string[];
  specialization: string;
  experience: number;
  education: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Group {
  id: string;
  name: string;
  year: number;
  specialization: string;
  students: string[];
  scheduleId: string;
  curatorId?: string;
  course: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subject {
  id: string;
  name: string;
  description: string;
  hoursPerWeek: number;
  hoursPerSemester: number;
  credits: number;
  hours: number;
  type: 'lecture' | 'practice' | 'laboratory';
  teacherId?: string;
  groups: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Schedule {
  id: string;
  groupId: string;
  semester: number;
  year: number;
  lessons: Lesson[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Lesson {
  id: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number; // 1-7 (понедельник-воскресенье)
  startTime: string; // формат "HH:mm"
  endTime: string; // формат "HH:mm"
  room: string;
  type: 'lecture' | 'practice' | 'laboratory';
  weekType?: 'odd' | 'even' | 'all'; // для чередующихся недель
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
  images: {
    url: string;
    alt: string;
    order: number;
  }[];
  isPublished: boolean;
  publishedAt?: Timestamp;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const ChatType = {
  PRIVATE: 'private',
  GROUP: 'group',
  CHANNEL: 'channel',
} as const;

export type ChatType = typeof ChatType[keyof typeof ChatType];

export interface Chat {
  id: string;
  type: ChatType;
  name?: string; // For group chats
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

export interface Journal {
  id: string;
  groupId: string;
  subjectId: string;
  teacherId: string;
  semester: number;
  year: number;
  entries: {
    date: Timestamp;
    topic: string;
    homework?: string;
    notes?: string;
    attendance?: {
      studentId: string;
      status: 'present' | 'absent' | 'late' | 'excused';
    }[];
  }[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JournalEntry {
  id: string;
  journalId: string;
  date: Timestamp;
  topic: string;
  hours: number;
  type: 'lecture' | 'seminar' | 'laboratory';
  notes?: string;
  studentId?: string;
  grade?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 