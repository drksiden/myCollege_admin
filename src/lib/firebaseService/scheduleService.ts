import { collection, doc, getDocs, getDoc, addDoc, updateDoc, deleteDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Lesson, Schedule } from '@/types';

const LESSONS_COLLECTION = 'lessons';
const SCHEDULES_COLLECTION = 'schedules';

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
 * Получает занятия группы на семестр
 * @param groupId ID группы
 * @param semesterId ID семестра
 * @returns Promise<Lesson[]>
 */
export const getGroupLessons = async (groupId: string, semesterId: string): Promise<Lesson[]> => {
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

/**
 * Создает новое расписание
 * @param data Данные расписания без id и временных меток
 * @returns Promise<Schedule>
 */
export const createSchedule = async (data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> => {
  const scheduleRef = await addDoc(collection(db, SCHEDULES_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  const scheduleDoc = await getDoc(scheduleRef);
  return { id: scheduleRef.id, ...scheduleDoc.data() } as Schedule;
};

/**
 * Обновляет расписание
 * @param id ID расписания
 * @param data Данные для обновления
 * @returns Promise<Schedule>
 */
export const updateSchedule = async (id: string, data: Partial<Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Schedule> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, id);
  await updateDoc(scheduleRef, {
    ...data,
    updatedAt: serverTimestamp()
  });

  const scheduleDoc = await getDoc(scheduleRef);
  return { id: scheduleRef.id, ...scheduleDoc.data() } as Schedule;
};

/**
 * Получает расписание по ID
 * @param id ID расписания
 * @returns Promise<Schedule | null>
 */
export const getSchedule = async (id: string): Promise<Schedule | null> => {
  const scheduleDoc = await getDoc(doc(db, SCHEDULES_COLLECTION, id));
  if (!scheduleDoc.exists()) return null;
  return { id: scheduleDoc.id, ...scheduleDoc.data() } as Schedule;
};

/**
 * Получает расписание группы
 * @param params Объект с параметрами { groupId: string, semesterId: string }
 * @returns Promise<Lesson[]>
 */
export const getGroupSchedule = async ({ groupId, semesterId }: { groupId: string; semesterId: string }): Promise<Lesson[]> => {
  const q = query(
    collection(db, LESSONS_COLLECTION),
    where('groupId', '==', groupId),
    where('semesterId', '==', semesterId)
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
};

/**
 * Удаляет расписание
 * @param id ID расписания
 * @returns Promise<void>
 */
export const deleteSchedule = async (id: string): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, id);
  await deleteDoc(scheduleRef);
}; 