import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import type { Lesson } from '@/types';

const LESSONS_COLLECTION = 'lessons';

/**
 * Создает новое занятие
 * @param data Данные занятия без id и временных меток
 * @returns Promise<Lesson>
 */
export const createLesson = async (data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson> => {
  const lessonRef = await addDoc(collection(db, LESSONS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const lessonDoc = await getDoc(lessonRef);
  return { id: lessonRef.id, ...lessonDoc.data() } as Lesson;
};

/**
 * Обновляет занятие
 * @param id ID занятия
 * @param data Данные для обновления
 * @returns Promise<Lesson>
 */
export const updateLesson = async (id: string, data: Partial<Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Lesson> => {
  const lessonRef = doc(db, LESSONS_COLLECTION, id);
  await updateDoc(lessonRef, {
    ...data,
    updatedAt: serverTimestamp()
  });

  const lessonDoc = await getDoc(lessonRef);
  return { id: lessonRef.id, ...lessonDoc.data() } as Lesson;
};

/**
 * Получает занятие по ID
 * @param id ID занятия
 * @returns Promise<Lesson | null>
 */
export const getLesson = async (id: string): Promise<Lesson | null> => {
  const lessonDoc = await getDoc(doc(db, LESSONS_COLLECTION, id));
  if (!lessonDoc.exists()) return null;
  return { id: lessonDoc.id, ...lessonDoc.data() } as Lesson;
};

/**
 * Получает расписание группы на семестр
 * @param groupId ID группы
 * @param semesterId ID семестра
 * @returns Promise<Lesson[]>
 */
export const getGroupSchedule = async (groupId: string, semesterId: string): Promise<Lesson[]> => {
  const q = query(
    collection(db, LESSONS_COLLECTION),
    where('groupId', '==', groupId),
    where('semesterId', '==', semesterId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
};

/**
 * Получает расписание преподавателя на семестр
 * @param teacherId ID преподавателя
 * @param semesterId ID семестра
 * @returns Promise<Lesson[]>
 */
export const getTeacherSchedule = async (teacherId: string, semesterId: string): Promise<Lesson[]> => {
  const q = query(
    collection(db, LESSONS_COLLECTION),
    where('teacherId', '==', teacherId),
    where('semesterId', '==', semesterId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
};

/**
 * Удаляет занятие
 * @param id ID занятия
 * @returns Promise<void>
 */
export const deleteLesson = async (id: string): Promise<void> => {
  const lessonRef = doc(db, LESSONS_COLLECTION, id);
  await deleteDoc(lessonRef);
}; 