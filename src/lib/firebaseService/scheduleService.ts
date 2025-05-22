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

/**
 * Creates a new schedule in Firestore.
 * @param db Firestore instance.
 * @param scheduleData Object containing groupId, semester, year.
 *                     'lessons' array is initialized as empty.
 * @returns Promise<string> The ID of the newly created schedule.
 */
export const createSchedule = async (groupId: string, schedule: Omit<Schedule, 'id'>) => {
  const scheduleData = {
    ...schedule,
    groupId,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const docRef = await addDoc(collection(db, 'schedules'), scheduleData);
  return { id: docRef.id, ...scheduleData };
};

/**
 * Fetches a specific schedule from Firestore by its document ID.
 * @param db Firestore instance.
 * @param scheduleId The document ID of the schedule.
 * @returns Promise<Schedule | null> The schedule or null if not found.
 */
export const getSchedule = async (scheduleId: string) => {
  const docRef = doc(db, 'schedules', scheduleId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) {
    return null;
  }
  return { id: docSnap.id, ...docSnap.data() } as Schedule;
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

/**
 * Updates schedule metadata (groupId, semester, year) or the entire lessons array.
 * @param db Firestore instance.
 * @param scheduleId The document ID of the schedule to update.
 * @param updates Partial data of Schedule to update (groupId, semester, year, lessons).
 * @returns Promise<void>
 */
export const updateSchedule = async (scheduleId: string, schedule: Partial<Schedule>) => {
  const docRef = doc(db, 'schedules', scheduleId);
  const updateData = {
    ...schedule,
    updatedAt: new Date(),
  };
  await updateDoc(docRef, updateData);
  return { id: scheduleId, ...updateData };
};

/**
 * Deletes a schedule from Firestore.
 * IMPORTANT: This does not update group.scheduleId. That should be handled by the calling function.
 * @param db Firestore instance.
 * @param scheduleId The document ID of the schedule to delete.
 * @returns Promise<void>
 */
export const deleteSchedule = async (scheduleId: string) => {
  const docRef = doc(db, 'schedules', scheduleId);
  await deleteDoc(docRef);
};

// --- Lesson Management within a Schedule (Phase 1: Modify lessons array and update schedule) ---

/**
 * Adds a Lesson object to the 'lessons' array of a specific schedule.
 * Fetches the schedule, adds the lesson (with a new UUID if id is missing), and updates the schedule.
 * @param db Firestore instance.
 * @param scheduleId The document ID of the schedule.
 * @param lessonData The Lesson object to add. If lessonData.id is not provided, a new UUID will be generated.
 * @returns Promise<void>
 */
export const addLessonToSchedule = async (
  db: Firestore,
  scheduleId: string,
  lessonData: Omit<Lesson, 'id'> & { id?: string } // Allow id to be optional for creation
): Promise<void> => {
  const schedule = await getSchedule(scheduleId);
  if (!schedule) {
    throw new Error("Schedule not found");
  }
  const newLesson: Lesson = {
    ...lessonData,
    id: lessonData.id || uuidv4(), // Ensure lesson has a unique ID
  };
  const updatedLessons = [...schedule.lessons, newLesson];
  return updateSchedule(scheduleId, { lessons: updatedLessons });
};

/**
 * Removes a lesson from the 'lessons' array of a schedule based on lesson.id.
 * @param db Firestore instance.
 * @param scheduleId The document ID of the schedule.
 * @param lessonId The ID of the lesson to remove.
 * @returns Promise<void>
 */
export const removeLessonFromSchedule = async (
  db: Firestore,
  scheduleId: string,
  lessonId: string
): Promise<void> => {
  const schedule = await getSchedule(scheduleId);
  if (!schedule) {
    throw new Error("Schedule not found");
  }
  const updatedLessons = schedule.lessons.filter(lesson => lesson.id !== lessonId);
  return updateSchedule(scheduleId, { lessons: updatedLessons });
};

/**
 * Updates a specific lesson within the 'lessons' array of a schedule.
 * The updatedLesson object must have the same 'id' as an existing lesson.
 * @param db Firestore instance.
 * @param scheduleId The document ID of the schedule.
 * @param updatedLesson The updated Lesson object.
 * @returns Promise<void>
 */
export const updateLessonInSchedule = async (
  db: Firestore,
  scheduleId: string,
  updatedLesson: Lesson
): Promise<void> => {
  const schedule = await getSchedule(scheduleId);
  if (!schedule) {
    throw new Error("Schedule not found");
  }
  const lessonIndex = schedule.lessons.findIndex(lesson => lesson.id === updatedLesson.id);
  if (lessonIndex === -1) {
    throw new Error("Lesson not found in schedule");
  }
  const updatedLessons = [...schedule.lessons];
  updatedLessons[lessonIndex] = updatedLesson;
  return updateSchedule(scheduleId, { lessons: updatedLessons });
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
