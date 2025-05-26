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
  query,
  where,
} from 'firebase/firestore';
import type { Schedule, Lesson } from '@/types';

// Re-export types for convenience
export type { Schedule, Lesson };

// Define ScheduleEntry type locally since it's only used in this file
interface ScheduleEntry {
  id: string;
  date: Timestamp;
  type: 'class' | 'exam' | 'test';
  description: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Extend Schedule type for this file
interface ScheduleWithEntries extends Schedule {
  entries?: ScheduleEntry[];
}

const SCHEDULES_COLLECTION = 'schedules';

/**
 * Создает новое расписание для группы
 * @param db Firestore instance
 * @param scheduleData Данные расписания
 * @returns Promise<Schedule>
 */
export const createSchedule = async (
  db: Firestore,
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
  db: Firestore,
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
  db: Firestore,
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
  db: Firestore,
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
  db: Firestore,
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
  db: Firestore,
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
    id: doc(collection(db, 'lessons')).id,
  };
  
  const updatedLessons = [...(schedule.lessons || []), newLesson];
  
  await updateDoc(scheduleRef, {
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
  db: Firestore,
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
  
  await updateDoc(scheduleRef, {
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
  db: Firestore,
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
  
  await updateDoc(scheduleRef, {
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
  const schedulesRef = collection(db, SCHEDULES_COLLECTION);
  const querySnapshot = await getDocs(schedulesRef);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Schedule[];
};

// Get schedule by group ID
export const getScheduleByGroupId = async (
  db: Firestore,
  groupId: string
): Promise<Schedule | null> => {
  const schedulesRef = collection(db, SCHEDULES_COLLECTION);
  const q = query(schedulesRef, where('groupId', '==', groupId));
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
 * Добавляет запись в расписание
 */
export const addScheduleEntry = async (
  db: Firestore,
  scheduleId: string,
  entry: Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ScheduleWithEntries> => {
  const schedule = await getSchedule(db, scheduleId) as ScheduleWithEntries;
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  const newEntry: ScheduleEntry = {
    id: doc(collection(db, 'entries')).id,
    ...entry,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  const updatedEntries = [...(schedule.entries || []), newEntry];
  
  await updateDoc(doc(db, SCHEDULES_COLLECTION, scheduleId), {
    entries: updatedEntries,
    updatedAt: serverTimestamp() as Timestamp,
  });

  return {
    ...schedule,
    entries: updatedEntries,
  };
};

/**
 * Обновляет запись в расписании
 */
export const updateScheduleEntry = async (
  db: Firestore,
  scheduleId: string,
  entryId: string,
  updates: Partial<Omit<ScheduleEntry, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<ScheduleWithEntries> => {
  const schedule = await getSchedule(db, scheduleId) as ScheduleWithEntries;
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  const updatedEntries = (schedule.entries || []).map((entry: ScheduleEntry) =>
    entry.id === entryId
      ? {
          ...entry,
          ...updates,
          updatedAt: serverTimestamp() as Timestamp,
        }
      : entry
  );

  await updateDoc(doc(db, SCHEDULES_COLLECTION, scheduleId), {
    entries: updatedEntries,
    updatedAt: serverTimestamp() as Timestamp,
  });

  return {
    ...schedule,
    entries: updatedEntries,
  };
};

/**
 * Удаляет запись из расписания
 */
export const deleteScheduleEntry = async (
  db: Firestore,
  scheduleId: string,
  entryId: string
): Promise<ScheduleWithEntries> => {
  const schedule = await getSchedule(db, scheduleId) as ScheduleWithEntries;
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  const updatedEntries = (schedule.entries || []).filter((entry: ScheduleEntry) => entry.id !== entryId);

  await updateDoc(doc(db, SCHEDULES_COLLECTION, scheduleId), {
    entries: updatedEntries,
    updatedAt: serverTimestamp() as Timestamp,
  });

  return {
    ...schedule,
    entries: updatedEntries,
  };
};
