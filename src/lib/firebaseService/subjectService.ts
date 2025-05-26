import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  Firestore,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Subject } from '@/types';

// Re-export Subject type for convenience
export type { Subject };

const SUBJECTS_COLLECTION = 'subjects';
const TEACHERS_COLLECTION = 'teachers';

/**
 * Creates a new subject in Firestore and updates the teacher's subjects array.
 * @param db Firestore instance.
 * @param subjectData Object containing subject details.
 * @returns Promise<Subject> The newly created subject.
 */
export const createSubject = async (
  db: Firestore,
  subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Subject> => {
  const batch = writeBatch(db);
  
  // Create new subject document
  const subjectRef = doc(collection(db, SUBJECTS_COLLECTION));
  const newSubject = {
    ...subjectData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  batch.set(subjectRef, newSubject);
  
  // If teacherId is provided, update teacher's subjects array
  if (subjectData.teacherId) {
    const teacherRef = doc(db, TEACHERS_COLLECTION, subjectData.teacherId);
    batch.update(teacherRef, {
      subjects: arrayUnion(subjectRef.id),
      updatedAt: serverTimestamp() as Timestamp,
    });
  }
  
  // Commit the batch
  await batch.commit();
  
  return {
    id: subjectRef.id,
    ...newSubject,
  } as Subject;
};

/**
 * Fetches a specific subject from Firestore by its document ID.
 * @param db Firestore instance.
 * @param subjectId The document ID of the subject.
 * @returns Promise<Subject | null> The subject or null if not found.
 */
export const getSubject = async (
  db: Firestore,
  subjectId: string
): Promise<Subject | null> => {
  const subjectRef = doc(db, SUBJECTS_COLLECTION, subjectId);
  const docSnap = await getDoc(subjectRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Subject;
  }
  return null;
};

/**
 * Fetches all subjects from Firestore, ordered by name.
 * @param db Firestore instance.
 * @returns Promise<Subject[]> An array of subjects.
 */
export const getAllSubjects = async (): Promise<Subject[]> => {
  const subjectsRef = collection(db, SUBJECTS_COLLECTION);
  const snapshot = await getDocs(subjectsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Subject[];
};

/**
 * Updates an existing subject in Firestore and handles teacher synchronization.
 * @param db Firestore instance.
 * @param subjectId The document ID of the subject to update.
 * @param updates Partial data of Subject to update.
 * @param oldTeacherId The previous teacherId (if any) for handling teacher changes.
 * @returns Promise<void>
 */
export const updateSubject = async (
  db: Firestore,
  subjectId: string,
  updates: Partial<Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>>,
  oldTeacherId?: string | null
): Promise<void> => {
  const batch = writeBatch(db);
  const subjectRef = doc(db, SUBJECTS_COLLECTION, subjectId);
  
  // Update subject
  batch.update(subjectRef, {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  });
  
  const newTeacherId = updates.teacherId;
  
  // Handle teacher changes
  if (oldTeacherId !== newTeacherId) {
    // Remove subject from old teacher's subjects array
    if (oldTeacherId) {
      const oldTeacherRef = doc(db, TEACHERS_COLLECTION, oldTeacherId);
      batch.update(oldTeacherRef, {
        subjects: arrayRemove(subjectId),
        updatedAt: serverTimestamp() as Timestamp,
      });
    }
    
    // Add subject to new teacher's subjects array
    if (newTeacherId) {
      const newTeacherRef = doc(db, TEACHERS_COLLECTION, newTeacherId);
      batch.update(newTeacherRef, {
        subjects: arrayUnion(subjectId),
        updatedAt: serverTimestamp() as Timestamp,
      });
    }
  }
  
  // Commit the batch
  await batch.commit();
};

/**
 * Deletes a subject from Firestore and removes it from the teacher's subjects array.
 * @param db Firestore instance.
 * @param subjectId The document ID of the subject to delete.
 * @returns Promise<void>
 */
export const deleteSubject = async (
  db: Firestore,
  subjectId: string
): Promise<void> => {
  const batch = writeBatch(db);
  
  // Get the subject to find its teacherId
  const subjectRef = doc(db, SUBJECTS_COLLECTION, subjectId);
  const subjectDoc = await getDoc(subjectRef);
  
  if (!subjectDoc.exists()) {
    throw new Error('Subject not found');
  }
  
  const subjectData = subjectDoc.data() as Subject;
  
  // Delete the subject
  batch.delete(subjectRef);
  
  // Remove subject from teacher's subjects array if teacherId exists
  if (subjectData.teacherId) {
    const teacherRef = doc(db, TEACHERS_COLLECTION, subjectData.teacherId);
    batch.update(teacherRef, {
      subjects: arrayRemove(subjectId),
      updatedAt: serverTimestamp() as Timestamp,
    });
  }
  
  // Commit the batch
  await batch.commit();
};

/**
 * Fetches all subjects from Firestore.
 * @param db Firestore instance
 * @returns Promise<Subject[]>
 */
export const getSubjects = async (): Promise<Subject[]> => {
  const subjectsCollection = collection(db, SUBJECTS_COLLECTION);
  const q = query(subjectsCollection, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Subject));
};

/**
 * Fetches a single subject by ID.
 * @param db Firestore instance
 * @param id Subject ID
 * @returns Promise<Subject | null>
 */
export const getSubjectById = async (db: Firestore, id: string): Promise<Subject | null> => {
  const subjectRef = doc(db, SUBJECTS_COLLECTION, id);
  const snapshot = await getDoc(subjectRef);
  if (!snapshot.exists()) return null;
  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Subject;
};

export async function getSubjectsByTeacher(teacherId: string) {
  const subjectsRef = collection(db, SUBJECTS_COLLECTION);
  const q = query(subjectsRef, where('teacherId', '==', teacherId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Subject[];
}

export async function getSubjectsByGroup(groupId: string) {
  const subjectsRef = collection(db, SUBJECTS_COLLECTION);
  const q = query(subjectsRef, where('groupId', '==', groupId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Subject[];
}
