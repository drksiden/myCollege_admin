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
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    date: doc.data().date as Timestamp,
  })) as Lesson[];
};

export const getLesson = async (lessonId: string): Promise<Lesson | null> => {
  const lessonRef = doc(db, 'lessons', lessonId);
  const lessonDoc = await getDoc(lessonRef);
  
  if (!lessonDoc.exists()) return null;
  
  return {
    id: lessonDoc.id,
    ...lessonDoc.data(),
    date: lessonDoc.data().date as Timestamp,
  } as Lesson;
};

export const createLesson = async (lessonData: Omit<Lesson, 'id'>): Promise<string> => {
  const lessonsRef = collection(db, 'lessons');
  const docRef = await addDoc(lessonsRef, {
    ...lessonData,
    date: Timestamp.fromDate(lessonData.date),
  });
  return docRef.id;
};

export const updateLesson = async (
  lessonId: string,
  updates: Partial<Omit<Lesson, 'id'>>
): Promise<void> => {
  const lessonRef = doc(db, 'lessons', lessonId);
  const updateData = {
    ...updates,
    date: updates.date ? Timestamp.fromDate(updates.date) : undefined,
  };
  await updateDoc(lessonRef, updateData);
};

export const deleteLesson = async (lessonId: string): Promise<void> => {
  const lessonRef = doc(db, 'lessons', lessonId);
  await deleteDoc(lessonRef);
}; 