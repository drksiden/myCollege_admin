import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type {
  User,
  Teacher,
  Student,
  Group,
  Subject,
  Schedule,
  Journal,
  Grade,
} from '../types';

// Users
export const createUser = async (userData: Omit<User, 'createdAt' | 'updatedAt'>) => {
  const userRef = doc(db, 'users', userData.uid);
  await setDoc(userRef, {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

export const updateUser = async (uid: string, userData: Partial<User>) => {
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    ...userData,
    updatedAt: serverTimestamp(),
  });
};

export const getUser = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? (userSnap.data() as User) : null;
};

// Teachers
export const createTeacher = async (teacherData: Omit<Teacher, 'id'>) => {
  const teacherRef = await addDoc(collection(db, 'teachers'), teacherData);
  return teacherRef.id;
};

export const getTeacher = async (id: string) => {
  const teacherRef = doc(db, 'teachers', id);
  const teacherSnap = await getDoc(teacherRef);
  return teacherSnap.exists() ? (teacherSnap.data() as Teacher) : null;
};

// Students
export const createStudent = async (studentData: Omit<Student, 'id'>) => {
  const studentRef = await addDoc(collection(db, 'students'), {
    ...studentData,
    enrollmentDate: serverTimestamp(),
  });
  return studentRef.id;
};

export const getStudent = async (id: string) => {
  const studentRef = doc(db, 'students', id);
  const studentSnap = await getDoc(studentRef);
  return studentSnap.exists() ? (studentSnap.data() as Student) : null;
};

// Groups
export const createGroup = async (groupData: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => {
  const groupRef = await addDoc(collection(db, 'groups'), {
    ...groupData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return groupRef.id;
};

export const getGroup = async (id: string) => {
  const groupRef = doc(db, 'groups', id);
  const groupSnap = await getDoc(groupRef);
  return groupSnap.exists() ? (groupSnap.data() as Group) : null;
};

// Subjects
export const createSubject = async (subjectData: Omit<Subject, 'id'>) => {
  const subjectRef = await addDoc(collection(db, 'subjects'), subjectData);
  return subjectRef.id;
};

export const getSubject = async (id: string) => {
  const subjectRef = doc(db, 'subjects', id);
  const subjectSnap = await getDoc(subjectRef);
  return subjectSnap.exists() ? (subjectSnap.data() as Subject) : null;
};

// Schedule
export const createSchedule = async (scheduleData: Omit<Schedule, 'id'>) => {
  const scheduleRef = await addDoc(collection(db, 'schedules'), scheduleData);
  return scheduleRef.id;
};

export const getSchedule = async (id: string) => {
  const scheduleRef = doc(db, 'schedules', id);
  const scheduleSnap = await getDoc(scheduleRef);
  return scheduleSnap.exists() ? (scheduleSnap.data() as Schedule) : null;
};

// Journal
export const createJournal = async (journalData: Omit<Journal, 'id'>) => {
  const journalRef = await addDoc(collection(db, 'journals'), journalData);
  return journalRef.id;
};

export const addJournalEntry = async (
  journalId: string,
  entry: Journal['entries'][0]
) => {
  const journalRef = doc(db, 'journals', journalId);
  const journalSnap = await getDoc(journalRef);
  if (journalSnap.exists()) {
    const journal = journalSnap.data() as Journal;
    await updateDoc(journalRef, {
      entries: [...journal.entries, entry],
    });
  }
};

// Grades
export const createGrade = async (gradeData: Omit<Grade, 'id'>) => {
  const gradeRef = await addDoc(collection(db, 'grades'), {
    ...gradeData,
    date: serverTimestamp(),
  });
  return gradeRef.id;
};

export const getStudentGrades = async (studentId: string) => {
  const gradesQuery = query(
    collection(db, 'grades'),
    where('studentId', '==', studentId)
  );
  const gradesSnap = await getDocs(gradesQuery);
  return gradesSnap.docs.map(doc => doc.data() as Grade);
}; 