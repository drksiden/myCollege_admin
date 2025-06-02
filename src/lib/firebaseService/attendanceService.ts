import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AttendanceEntry } from '@/types';

const ATTENDANCE_COLLECTION = 'attendance';

export async function getAttendanceByLesson(lessonId: string) {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(attendanceRef, where('lessonId', '==', lessonId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AttendanceEntry[];
}

export async function getAttendanceByStudent(studentId: string) {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(attendanceRef, where('studentId', '==', studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AttendanceEntry[];
}

export async function getAttendanceBySubject(subjectId: string): Promise<AttendanceEntry[]> {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(attendanceRef, where('subjectId', '==', subjectId));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AttendanceEntry[];
}

export async function createAttendanceRecord(data: Omit<AttendanceEntry, 'id' | 'createdAt' | 'updatedAt'>) {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const docRef = await addDoc(attendanceRef, {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return {
    id: docRef.id,
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as AttendanceEntry;
}

export async function updateAttendanceRecord(id: string, data: Partial<Omit<AttendanceEntry, 'id' | 'createdAt' | 'updatedAt'>>) {
  const attendanceRef = doc(db, ATTENDANCE_COLLECTION, id);
  await updateDoc(attendanceRef, {
    ...data,
    updatedAt: Timestamp.now(),
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
  })) as AttendanceEntry[];
}

export async function getGroupAttendanceSubjects(groupId: string): Promise<string[]> {
  const attendanceRef = collection(db, ATTENDANCE_COLLECTION);
  const q = query(attendanceRef, where('groupId', '==', groupId));
  const querySnapshot = await getDocs(q);
  
  // Получаем уникальные ID предметов из записей посещаемости
  const subjectIds = new Set<string>();
  querySnapshot.docs.forEach(doc => {
    const data = doc.data();
    if (data.subjectId) {
      subjectIds.add(data.subjectId);
    }
  });
  
  return Array.from(subjectIds);
} 