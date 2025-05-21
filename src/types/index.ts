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

export interface Student {
  id: string;
  userId: string;
  groupId: string;
  enrollmentDate: Timestamp;
  status: 'active' | 'inactive' | 'graduated';
  studentId: string;
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
  id: string;
  name: string;
  description?: string;
  credits: number;
  hours: number;
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
  type: string;
}

export interface Schedule {
  id: string;
  groupId: string;
  lessons: Lesson[];
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
    studentId: string;
    attendance: 'present' | 'absent' | 'late';
    grade?: number;
    comment?: string;
  }[];
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