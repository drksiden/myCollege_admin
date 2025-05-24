import {
  Firestore,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  orderBy,
  query,
  where,
  // arrayUnion, // Not used directly for lessons array in Phase 1 if replacing whole array
  // arrayRemove, // Not used directly for lessons array in Phase 1 if replacing whole array
} from 'firebase/firestore';
import type { Schedule, Lesson, ScheduleEntry } from '@/types'; // Group, Subject, Teacher, User not directly used here
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for lessons
import { db } from '@/lib/firebase';

// Re-export types for convenience
export type { Schedule, Lesson, ScheduleEntry };

const SCHEDULES_COLLECTION = 'schedules';

/**
 * Создает новое расписание для группы
 * @param db Firestore instance
 * @param scheduleData Данные расписания
 * @returns Promise<Schedule>
 */
export const createSchedule = async (
  db: any,
  scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Schedule> => {
  const schedulesCollection = collection(db, SCHEDULES_COLLECTION);
  const newSchedule = {
    ...scheduleData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(schedulesCollection, newSchedule);
  return {
    id: docRef.id,
    ...newSchedule,
  } as Schedule;
};

/**
 * Обновляет существующее расписание
 * @param db Firestore instance
 * @param scheduleId ID расписания
 * @param updates Обновленные данные
 * @returns Promise<void>
 */
export const updateSchedule = async (
  db: any,
  scheduleId: string,
  updates: Partial<Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  const dataWithTimestamp = {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  };
  return updateDoc(scheduleRef, dataWithTimestamp);
};

/**
 * Удаляет расписание
 * @param db Firestore instance
 * @param scheduleId ID расписания
 * @returns Promise<void>
 */
export const deleteSchedule = async (
  db: any,
  scheduleId: string
): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  return deleteDoc(scheduleRef);
};

/**
 * Получает расписание по ID
 * @param db Firestore instance
 * @param scheduleId ID расписания
 * @returns Promise<Schedule | null>
 */
export const getSchedule = async (
  db: any,
  scheduleId: string
): Promise<Schedule | null> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  const scheduleDoc = await getDoc(scheduleRef);
  if (!scheduleDoc.exists()) {
    return null;
  }
  return {
    id: scheduleDoc.id,
    ...scheduleDoc.data(),
  } as Schedule;
};

/**
 * Получает расписание группы
 * @param db Firestore instance
 * @param groupId ID группы
 * @param semester Семестр
 * @param year Учебный год
 * @returns Promise<Schedule | null>
 */
export const getGroupSchedule = async (
  db: any,
  groupId: string,
  semester: number,
  year: number
): Promise<Schedule | null> => {
  const schedulesRef = collection(db, SCHEDULES_COLLECTION);
  const q = query(
    schedulesRef,
    where('groupId', '==', groupId),
    where('semester', '==', semester),
    where('year', '==', year)
  );
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Schedule;
};

/**
 * Добавляет урок в расписание
 * @param db Firestore instance
 * @param scheduleId ID расписания
 * @param lesson Данные урока
 * @returns Promise<void>
 */
export const addLesson = async (
  db: any,
  scheduleId: string,
  lesson: Omit<Lesson, 'id'>
): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  const scheduleDoc = await getDoc(scheduleRef);
  if (!scheduleDoc.exists()) {
    throw new Error('Schedule not found');
  }
  const schedule = scheduleDoc.data() as Schedule;
  const newLesson = {
    ...lesson,
    id: crypto.randomUUID(), // Генерируем уникальный ID для урока
  };
  const updatedLessons = [...schedule.lessons, newLesson];
  return updateDoc(scheduleRef, {
    lessons: updatedLessons,
    updatedAt: serverTimestamp() as Timestamp,
  });
};

/**
 * Обновляет урок в расписании
 * @param db Firestore instance
 * @param scheduleId ID расписания
 * @param lessonId ID урока
 * @param updates Обновленные данные урока
 * @returns Promise<void>
 */
export const updateLesson = async (
  db: any,
  scheduleId: string,
  lessonId: string,
  updates: Partial<Omit<Lesson, 'id'>>
): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  const scheduleDoc = await getDoc(scheduleRef);
  if (!scheduleDoc.exists()) {
    throw new Error('Schedule not found');
  }
  const schedule = scheduleDoc.data() as Schedule;
  const updatedLessons = schedule.lessons.map(lesson =>
    lesson.id === lessonId ? { ...lesson, ...updates } : lesson
  );
  return updateDoc(scheduleRef, {
    lessons: updatedLessons,
    updatedAt: serverTimestamp() as Timestamp,
  });
};

/**
 * Удаляет урок из расписания
 * @param db Firestore instance
 * @param scheduleId ID расписания
 * @param lessonId ID урока
 * @returns Promise<void>
 */
export const deleteLesson = async (
  db: any,
  scheduleId: string,
  lessonId: string
): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, scheduleId);
  const scheduleDoc = await getDoc(scheduleRef);
  if (!scheduleDoc.exists()) {
    throw new Error('Schedule not found');
  }
  const schedule = scheduleDoc.data() as Schedule;
  const updatedLessons = schedule.lessons.filter(lesson => lesson.id !== lessonId);
  return updateDoc(scheduleRef, {
    lessons: updatedLessons,
    updatedAt: serverTimestamp() as Timestamp,
  });
};

/**
 * Fetches all schedules from Firestore, ordered by year, semester, then groupId.
 * @param db Firestore instance.
 * @returns Promise<Schedule[]> An array of schedules.
 */
export const getAllSchedules = async (db: Firestore): Promise<Schedule[]> => {
  const schedulesCollection = collection(db, 'schedules');
  // Consider adding more specific ordering if needed, e.g., by group name (would require joins or denormalization)
  const q = query(schedulesCollection, orderBy('year', 'desc'), orderBy('semester', 'asc'), orderBy('groupId', 'asc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as Schedule));
};

// Get schedule by group ID
export const getScheduleByGroupId = async (groupId: string) => {
  const q = query(collection(db, 'schedules'), where('groupId', '==', groupId));
  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }
  const doc = querySnapshot.docs[0];
  return { id: doc.id, ...doc.data() } as Schedule;
};

// Add schedule entry
export const addScheduleEntry = async (scheduleId: string, entry: ScheduleEntry) => {
  const docRef = doc(db, 'schedules', scheduleId);
  const schedule = await getSchedule(scheduleId);
  if (!schedule) {
    throw new Error('Schedule not found');
  }
  
  const updatedEntries = [...schedule.entries, entry];
  await updateDoc(docRef, {
    entries: updatedEntries,
    updatedAt: new Date(),
  });
  
  return { id: scheduleId, ...schedule, entries: updatedEntries };
};

// Update schedule entry
export const updateScheduleEntry = async (
  scheduleId: string,
  entryId: string,
  entry: Partial<ScheduleEntry>
) => {
  const docRef = doc(db, 'schedules', scheduleId);
  const schedule = await getSchedule(scheduleId);
  if (!schedule) {
    throw new Error('Schedule not found');
  }
  
  const updatedEntries = schedule.entries.map(e => 
    e.id === entryId ? { ...e, ...entry } : e
  );
  
  await updateDoc(docRef, {
    entries: updatedEntries,
    updatedAt: new Date(),
  });
  
  return { id: scheduleId, ...schedule, entries: updatedEntries };
};

// Delete schedule entry
export const deleteScheduleEntry = async (scheduleId: string, entryId: string) => {
  const docRef = doc(db, 'schedules', scheduleId);
  const schedule = await getSchedule(scheduleId);
  if (!schedule) {
    throw new Error('Schedule not found');
  }
  
  const updatedEntries = schedule.entries.filter(e => e.id !== entryId);
  await updateDoc(docRef, {
    entries: updatedEntries,
    updatedAt: new Date(),
  });
  
  return { id: scheduleId, ...schedule, entries: updatedEntries };
};
