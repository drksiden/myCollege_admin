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

export const getAllUsers = async () => {
  const usersSnap = await getDocs(collection(db, 'users'));
  return usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
};

export const deleteUser = async (uid: string) => {
  const userRef = doc(db, 'users', uid);
  await deleteDoc(userRef);
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

export const getAllTeachers = async () => {
  const teachersSnap = await getDocs(collection(db, 'teachers'));
  return teachersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Teacher));
};

export const updateTeacher = async (id: string, teacherData: Partial<Teacher>) => {
  const teacherRef = doc(db, 'teachers', id);
  await updateDoc(teacherRef, teacherData);
};

export const deleteTeacher = async (id: string) => {
  const teacherRef = doc(db, 'teachers', id);
  await deleteDoc(teacherRef);
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

export const getAllStudents = async () => {
  const studentsSnap = await getDocs(collection(db, 'students'));
  return studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student));
};

export const updateStudent = async (id: string, studentData: Partial<Student>) => {
  const studentRef = doc(db, 'students', id);
  await updateDoc(studentRef, studentData);
};

export const deleteStudent = async (id: string) => {
  const studentRef = doc(db, 'students', id);
  await deleteDoc(studentRef);
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

export const getAllGroups = async () => {
  const groupsSnap = await getDocs(collection(db, 'groups'));
  return groupsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
};

export const updateGroup = async (id: string, groupData: Partial<Group>) => {
  const groupRef = doc(db, 'groups', id);
  await updateDoc(groupRef, {
    ...groupData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteGroup = async (id: string) => {
  const groupRef = doc(db, 'groups', id);
  await deleteDoc(groupRef);
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

export const getAllSubjects = async () => {
  const subjectsSnap = await getDocs(collection(db, 'subjects'));
  return subjectsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Subject));
};

export const updateSubject = async (id: string, subjectData: Partial<Subject>) => {
  const subjectRef = doc(db, 'subjects', id);
  await updateDoc(subjectRef, subjectData);
};

export const deleteSubject = async (id: string) => {
  const subjectRef = doc(db, 'subjects', id);
  await deleteDoc(subjectRef);
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

export const getAllSchedules = async () => {
  const schedulesSnap = await getDocs(collection(db, 'schedules'));
  return schedulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
};

export const getSchedulesByGroup = async (groupId: string) => {
  const schedulesQuery = query(
    collection(db, 'schedules'),
    where('groupId', '==', groupId)
  );
  const schedulesSnap = await getDocs(schedulesQuery);
  return schedulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
};

export const getSchedulesByTeacher = async (teacherId: string) => {
  const schedulesQuery = query(
    collection(db, 'schedules'),
    where('teacherId', '==', teacherId)
  );
  const schedulesSnap = await getDocs(schedulesQuery);
  return schedulesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
};

export const updateSchedule = async (id: string, scheduleData: Partial<Schedule>) => {
  const scheduleRef = doc(db, 'schedules', id);
  await updateDoc(scheduleRef, scheduleData);
};

export const deleteSchedule = async (id: string) => {
  const scheduleRef = doc(db, 'schedules', id);
  await deleteDoc(scheduleRef);
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

export const getAllJournals = async () => {
  const journalsSnap = await getDocs(collection(db, 'journals'));
  return journalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Journal));
};

export const getJournalsByGroup = async (groupId: string) => {
  const journalsQuery = query(
    collection(db, 'journals'),
    where('groupId', '==', groupId)
  );
  const journalsSnap = await getDocs(journalsQuery);
  return journalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Journal));
};

export const getJournalsBySubject = async (subjectId: string) => {
  const journalsQuery = query(
    collection(db, 'journals'),
    where('subjectId', '==', subjectId)
  );
  const journalsSnap = await getDocs(journalsQuery);
  return journalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Journal));
};

export const updateJournal = async (id: string, journalData: Partial<Journal>) => {
  const journalRef = doc(db, 'journals', id);
  await updateDoc(journalRef, journalData);
};

export const deleteJournal = async (id: string) => {
  const journalRef = doc(db, 'journals', id);
  await deleteDoc(journalRef);
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

export const getAllGrades = async () => {
  const gradesSnap = await getDocs(collection(db, 'grades'));
  return gradesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
};

export const getGradesBySubject = async (subjectId: string) => {
  const gradesQuery = query(
    collection(db, 'grades'),
    where('subjectId', '==', subjectId)
  );
  const gradesSnap = await getDocs(gradesQuery);
  return gradesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Grade));
};

export const updateGrade = async (id: string, gradeData: Partial<Grade>) => {
  const gradeRef = doc(db, 'grades', id);
  await updateDoc(gradeRef, gradeData);
};

export const deleteGrade = async (id: string) => {
  const gradeRef = doc(db, 'grades', id);
  await deleteDoc(gradeRef);
}; 