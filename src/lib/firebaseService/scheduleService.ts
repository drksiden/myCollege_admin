import { collection, doc, getDoc, getDocs, query, where, addDoc, updateDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Lesson, Schedule } from '@/types';

const SCHEDULES_COLLECTION = 'schedules';

/**
 * Получает расписание группы
 * @param params Объект с параметрами { groupId: string, semesterId: string }
 * @returns Promise<Lesson[]>
 */
export async function getGroupSchedule({ groupId, semesterId }: { groupId: string; semesterId: string }): Promise<Lesson[]> {
  try {
    // Получаем расписание
    const scheduleQuery = query(
      collection(db, SCHEDULES_COLLECTION),
      where('groupId', '==', groupId),
      where('semesterId', '==', semesterId)
    );
    
    const scheduleSnapshot = await getDocs(scheduleQuery);
    
    if (!scheduleSnapshot.empty) {
      const schedule = scheduleSnapshot.docs[0].data() as Schedule;
      return schedule.lessons || [];
    }

    // Если расписание не найдено, создаем новое
    await addDoc(collection(db, SCHEDULES_COLLECTION), {
      groupId,
      semesterId,
      groupName: '', // Будет обновлено позже
      semester: 1, // TODO: получить из семестра
      year: new Date().getFullYear(),
      lessons: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    return [];
  } catch (error) {
    console.error('Error in getGroupSchedule:', error);
    // В случае ошибки BloomFilter, пробуем получить данные напрямую
    if (error instanceof Error && error.name === 'BloomFilterError') {
      try {
        const scheduleQuery = query(
          collection(db, SCHEDULES_COLLECTION),
          where('groupId', '==', groupId),
          where('semesterId', '==', semesterId)
        );
        
        const scheduleSnapshot = await getDocs(scheduleQuery);
        if (!scheduleSnapshot.empty) {
          const schedule = scheduleSnapshot.docs[0].data() as Schedule;
          return schedule.lessons || [];
        }
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }
    throw error;
  }
}

/**
 * Создает новое занятие
 * @param data Данные занятия без id и временных меток
 * @returns Promise<Lesson>
 */
export const createLesson = async (data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lesson> => {
  try {
    const lesson: Lesson = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // Получаем расписание
    const scheduleQuery = query(
      collection(db, SCHEDULES_COLLECTION),
      where('groupId', '==', data.groupId),
      where('semesterId', '==', data.semesterId)
    );
    
    const scheduleSnapshot = await getDocs(scheduleQuery);
    
    if (!scheduleSnapshot.empty) {
      const scheduleDoc = scheduleSnapshot.docs[0];
      const schedule = scheduleDoc.data() as Schedule;
      const lessons = [...(schedule.lessons || []), lesson];
      
      await updateDoc(doc(db, SCHEDULES_COLLECTION, scheduleDoc.id), {
        lessons,
        updatedAt: Timestamp.now()
      });
    } else {
      // Если расписание не существует, создаем новое
      await addDoc(collection(db, SCHEDULES_COLLECTION), {
        groupId: data.groupId,
        semesterId: data.semesterId,
        groupName: '', // Будет обновлено позже
        semester: 1, // TODO: получить из семестра
        year: new Date().getFullYear(),
        lessons: [lesson],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }

    return lesson;
  } catch (error) {
    console.error('Error in createLesson:', error);
    throw error;
  }
};

/**
 * Обновляет занятие
 * @param id ID занятия
 * @param data Данные для обновления
 * @returns Promise<Lesson>
 */
export const updateLesson = async (id: string, data: Partial<Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Lesson> => {
  try {
    // Получаем расписание
    const scheduleQuery = query(
      collection(db, SCHEDULES_COLLECTION),
      where('groupId', '==', data.groupId),
      where('semesterId', '==', data.semesterId)
    );
    
    const scheduleSnapshot = await getDocs(scheduleQuery);
    
    if (!scheduleSnapshot.empty) {
      const scheduleDoc = scheduleSnapshot.docs[0];
      const schedule = scheduleDoc.data() as Schedule;
      const lessons = schedule.lessons || [];
      const lessonIndex = lessons.findIndex(l => l.id === id);
      
      if (lessonIndex !== -1) {
        const updatedLesson = {
          ...lessons[lessonIndex],
          ...data,
          updatedAt: Timestamp.now()
        };
        
        lessons[lessonIndex] = updatedLesson;
        
        await updateDoc(doc(db, SCHEDULES_COLLECTION, scheduleDoc.id), {
          lessons,
          updatedAt: Timestamp.now()
        });
        
        return updatedLesson;
      }
    }
    
    throw new Error('Lesson not found');
  } catch (error) {
    console.error('Error in updateLesson:', error);
    throw error;
  }
};

/**
 * Получает занятие по ID
 * @param id ID занятия
 * @returns Promise<Lesson | null>
 */
export const getLesson = async (id: string): Promise<Lesson | null> => {
  const lessonDoc = await getDoc(doc(db, SCHEDULES_COLLECTION, id));
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
    collection(db, SCHEDULES_COLLECTION),
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
    collection(db, SCHEDULES_COLLECTION),
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
  try {
    // Получаем все расписания
    const schedulesSnapshot = await getDocs(collection(db, SCHEDULES_COLLECTION));
    
    for (const doc of schedulesSnapshot.docs) {
      const schedule = doc.data() as Schedule;
      const lessons = schedule.lessons || [];
      const lessonIndex = lessons.findIndex(l => l.id === id);
      
      if (lessonIndex !== -1) {
        lessons.splice(lessonIndex, 1);
        await updateDoc(doc.ref, {
          lessons,
          updatedAt: Timestamp.now()
        });
        return;
      }
    }
    
    throw new Error('Lesson not found');
  } catch (error) {
    console.error('Error in deleteLesson:', error);
    throw error;
  }
};

/**
 * Создает новое расписание
 * @param data Данные расписания без id и временных меток
 * @returns Promise<Schedule>
 */
export const createSchedule = async (data: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule> => {
  const scheduleRef = await addDoc(collection(db, SCHEDULES_COLLECTION), {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
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
    updatedAt: Timestamp.now()
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
 * Удаляет расписание
 * @param id ID расписания
 * @returns Promise<void>
 */
export const deleteSchedule = async (id: string): Promise<void> => {
  const scheduleRef = doc(db, SCHEDULES_COLLECTION, id);
  await deleteDoc(scheduleRef);
};

/**
 * Мигрирует существующие данные расписания в новую структуру
 * @returns Promise<void>
 */
export async function migrateSchedules(): Promise<void> {
  console.log('Starting schedule migration...');
  
  // Получаем все занятия
  const lessonsSnapshot = await getDocs(collection(db, SCHEDULES_COLLECTION));
  const lessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lesson));
  
  // Группируем занятия по groupId и semesterId
  const scheduleMap = new Map<string, Lesson[]>();
  
  lessons.forEach(lesson => {
    const key = `${lesson.groupId}_${lesson.semesterId}`;
    if (!scheduleMap.has(key)) {
      scheduleMap.set(key, []);
    }
    scheduleMap.get(key)?.push(lesson);
  });
  
  // Создаем или обновляем расписания
  const batch = writeBatch(db);
  let batchCount = 0;
  const BATCH_LIMIT = 500; // Ограничение Firestore на количество операций в одном batch
  
  for (const [key, scheduleLessons] of scheduleMap) {
    const [groupId, semesterId] = key.split('_');
    
    // Проверяем существование расписания
    const scheduleQuery = query(
      collection(db, SCHEDULES_COLLECTION),
      where('groupId', '==', groupId),
      where('semesterId', '==', semesterId)
    );
    
    const scheduleSnapshot = await getDocs(scheduleQuery);
    
    if (scheduleSnapshot.empty) {
      // Создаем новое расписание
      const scheduleRef = doc(collection(db, SCHEDULES_COLLECTION));
      batch.set(scheduleRef, {
        groupId,
        semesterId,
        groupName: '', // Будет обновлено позже
        semester: 1, // TODO: получить из семестра
        year: new Date().getFullYear(),
        lessons: scheduleLessons,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    } else {
      // Обновляем существующее расписание
      const scheduleDoc = scheduleSnapshot.docs[0];
      batch.update(doc(db, SCHEDULES_COLLECTION, scheduleDoc.id), {
        lessons: scheduleLessons,
        updatedAt: Timestamp.now()
      });
    }
    
    batchCount++;
    
    // Если достигли лимита, выполняем batch и создаем новый
    if (batchCount >= BATCH_LIMIT) {
      await batch.commit();
      batchCount = 0;
      console.log(`Committed batch of ${BATCH_LIMIT} operations`);
    }
  }
  
  // Выполняем оставшиеся операции
  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} operations`);
  }
  
  console.log('Schedule migration completed successfully');
}

/**
 * Очищает дублирующиеся расписания, оставляя только одно для каждой комбинации groupId и semesterId
 */
export async function cleanupDuplicateSchedules(): Promise<void> {
  console.log('Starting cleanup of duplicate schedules...');
  
  // Получаем все расписания
  const schedulesSnapshot = await getDocs(collection(db, SCHEDULES_COLLECTION));
  const schedules = schedulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Schedule));
  
  // Группируем расписания по groupId и semesterId
  const scheduleMap = new Map<string, Schedule[]>();
  
  schedules.forEach(schedule => {
    const key = `${schedule.groupId}_${schedule.semesterId}`;
    if (!scheduleMap.has(key)) {
      scheduleMap.set(key, []);
    }
    scheduleMap.get(key)?.push(schedule);
  });
  
  // Удаляем дубликаты, оставляя только одно расписание для каждой группы
  const batch = writeBatch(db);
  let batchCount = 0;
  const BATCH_LIMIT = 500;
  
  for (const [, scheduleGroup] of scheduleMap) {
    if (scheduleGroup.length > 1) {
      // Оставляем первое расписание, удаляем остальные
      scheduleGroup.slice(1).forEach(schedule => {
        batch.delete(doc(db, SCHEDULES_COLLECTION, schedule.id));
        batchCount++;
      });
      
      if (batchCount >= BATCH_LIMIT) {
        await batch.commit();
        batchCount = 0;
        console.log(`Committed batch of ${BATCH_LIMIT} operations`);
      }
    }
  }
  
  if (batchCount > 0) {
    await batch.commit();
    console.log(`Committed final batch of ${batchCount} operations`);
  }
  
  console.log('Cleanup of duplicate schedules completed');
} 