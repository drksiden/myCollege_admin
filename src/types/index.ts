import { Timestamp } from 'firebase/firestore';

export interface User {
  uid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  teacherId?: string;
  studentId?: string;
}

export interface Teacher {
  id: string;
  userId: string;
  subjects: string[];
  groups: string[];
  specialization: string;
  experience: number;
  education: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone?: string;
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
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Subject {
  id: string;                 // Firestore document ID
  name: string;
  description: string;        // Made required as per task
  hoursPerSemester: number;   // Renamed from hours and clarified purpose
  type: 'lecture' | 'practice' | 'laboratory'; // Added as per task
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Lesson {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;
  room: string;
  type: 'lecture' | 'practice' | 'laboratory';
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
  comment?: string;       // Optional comment
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