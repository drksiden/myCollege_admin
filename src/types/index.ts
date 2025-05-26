import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role?: 'admin' | 'teacher' | 'student';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  teacherId?: string;
  studentId?: string;
  groupId?: string;
  middleName?: string;
  iin?: string;
  phone?: string;
  address?: string;
  birthDate?: Timestamp;
  enrollmentDate?: Timestamp;
}

export interface Teacher {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  specialization: string;
  experience: number;
  education: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Student {
  id: string;
  userId: string;
  studentCardId: string;
  groupId: string;
  enrollmentDate: Timestamp;
  dateOfBirth: Timestamp;
  status: 'active' | 'inactive' | 'graduated';
  address: string;
  phone: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  students?: string[];
  year: number;
  specialization: string;
  curatorId: string;
  course: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subject {
  id: string;
  name: string;
  description?: string;
  credits: number;
  hours: number;
  specialization: string;
}

export interface Lesson {
  id: string;
  groupId: string;
  subjectId: string;
  teacherId: string;
  dayOfWeek: number;  // 1-6 for Monday-Saturday
  startTime: string;
  endTime: string;
  room: string;
  type: 'lecture' | 'practice' | 'laboratory';
  weekType: 'all' | 'numerator' | 'denominator';
  duration: number;
  isFloating: boolean;
  semester: number;
  year: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Schedule {
  id: string;                 // Firestore document ID
  groupId: string;
  semester: number;           // e.g., 1 or 2 for a typical semester system
  year: number;               // e.g., 2023 (academic year start)
  lessons: Lesson[];          // Array of Lesson objects
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Journal {
  id: string;
  groupId: string;
  subjectId: string;
  teacherId: string;      // Teacher Profile Document ID
  semester: number;
  year: number;
  entries: JournalEntry[]; // Array of journal entries
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// New interface for Journal Entries
export interface JournalEntry {
  // id: string; // Not using a separate ID for sub-collection items for now
  date: Timestamp;        // Date of the class/entry
  studentId: string;      // Student Profile Document ID
  attendance: 'present' | 'absent' | 'late';
  grade?: number;         // Optional grade for this entry
  comment: string;        // Comment is always a string (may be empty)
}

export interface Grade {
  id: string;
  studentId: string;
  subjectId: string;
  teacherId: string;
  groupId: string;
  semester: number;
  year: number;
  type: 'exam' | 'test' | 'homework' | 'project';
  value: number;
  date: Timestamp;
  comment?: string;
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