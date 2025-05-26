import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Lesson } from '@/types';

export const getAllLessons = async (groupId: string): Promise<Lesson[]> => {
  const lessonsRef = collection(db, 'lessons');
  const q = query(lessonsRef, where('groupId', '==', groupId));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      groupId: data.groupId,
      subjectId: data.subjectId,
      teacherId: data.teacherId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      room: data.room,
      type: data.type,
      weekType: data.weekType,
      duration: data.duration,
      isFloating: data.isFloating,
      semester: data.semester,
      year: data.year,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Lesson;
  });
};

export const getLesson = async (lessonId: string): Promise<Lesson | null> => {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonDoc = await getDoc(lessonRef);
  
  if (!lessonDoc.exists()) return null;
  
  const data = lessonDoc.data();
  return {
    id: lessonDoc.id,
    groupId: data.groupId,
    subjectId: data.subjectId,
    teacherId: data.teacherId,
    dayOfWeek: data.dayOfWeek,
    startTime: data.startTime,
    endTime: data.endTime,
    room: data.room,
    type: data.type,
    weekType: data.weekType,
    duration: data.duration,
    isFloating: data.isFloating,
    semester: data.semester,
    year: data.year,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } as Lesson;
};

export const createLesson = async (lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const lessonsRef = collection(db, 'lessons');
  const docRef = await addDoc(lessonsRef, {
    ...lessonData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return docRef.id;
};

export const updateLesson = async (
  lessonId: string,
  updates: Partial<Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const lessonRef = doc(db, 'lessons', lessonId);
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  };
  await updateDoc(lessonRef, updateData);
};

export const deleteLesson = async (lessonId: string): Promise<void> => {
  const lessonRef = doc(db, 'lessons', lessonId);
  await deleteDoc(lessonRef);
}; 