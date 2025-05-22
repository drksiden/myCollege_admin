import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import type { Attendance, AttendanceRecord } from '@/types';

const ATTENDANCE_COLLECTION = 'attendance';

export async function getAttendanceByGroup(groupId: string) {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(attendanceRef, where('groupId', '==', groupId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Attendance[];
}

export async function getAttendanceByStudent(studentId: string) {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(attendanceRef, where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Attendance[];
}

export async function getAttendanceBySubject(subjectId: string) {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(attendanceRef, where('subjectId', '==', subjectId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Attendance[];
}

export async function createAttendanceRecord(data: Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>) {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const docRef = await addDoc(attendanceRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return {
    id: docRef.id,
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Attendance;
}

export async function updateAttendanceRecord(id: string, data: Partial<Omit<Attendance, 'id' | 'createdAt' | 'updatedAt'>>) {
  const attendanceRef = doc(db, ATTENDANCE_COLLECTION, id);
  await updateDoc(attendanceRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAttendanceRecord(id: string) {
  const attendanceRef = doc(db, ATTENDANCE_COLLECTION, id);
  await deleteDoc(attendanceRef);
}

export async function getAttendanceByDate(date: Date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(
    attendanceRef,
    where('date', '>=', Timestamp.fromDate(startOfDay)),
    where('date', '<=', Timestamp.fromDate(endOfDay))
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Attendance[];
} 