import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  orderBy,
  serverTimestamp,
  addDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Subject } from '@/types';

// Re-export Subject type for convenience
export type { Subject };

const SUBJECTS_COLLECTION = 'subjects';
const TEACHERS_COLLECTION = 'teachers';
const SCHEDULES_COLLECTION = 'schedules';

/**
 * Creates a new subject in Firestore.
 * @param subjectData Object containing subject details.
 * @returns Promise<Subject> The newly created subject.
 */
export const createSubject = async (
  subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Subject> => {
  const newSubject = {
    ...subjectData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(collection(db, SUBJECTS_COLLECTION), newSubject);
  
  return {
    id: docRef.id,
    ...newSubject,
  } as Subject;
};

/**
 * Fetches a specific subject from Firestore by its document ID.
 * @param subjectId The document ID of the subject.
 * @returns Promise<Subject | null> The subject or null if not found.
 */
export const getSubject = async (
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
 * @returns Promise<Subject[]> An array of subjects.
 */
export const getAllSubjects = async (): Promise<Subject[]> => {
  const subjectsRef = collection(db, SUBJECTS_COLLECTION);
  const q = query(subjectsRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Subject));
};

/**
 * Updates an existing subject in Firestore.
 * @param subjectId The document ID of the subject to update.
 * @param updates Partial data of Subject to update.
 * @returns Promise<void>
 */
export const updateSubject = async (
  subjectId: string,
  updates: Partial<Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const subjectRef = doc(db, SUBJECTS_COLLECTION, subjectId);
  await updateDoc(subjectRef, {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  });
};

/**
 * Deletes a subject from Firestore.
 * @param subjectId The document ID of the subject to delete.
 * @returns Promise<void>
 */
export const deleteSubject = async (
  subjectId: string
): Promise<void> => {
  const subjectRef = doc(db, SUBJECTS_COLLECTION, subjectId);
  await deleteDoc(subjectRef);
};

/**
 * Fetches subjects by their IDs.
 * @param subjectIds Array of subject IDs to fetch.
 * @returns Promise<Subject[]> Array of found subjects.
 */
export const getSubjectsByIds = async (subjectIds: string[]): Promise<Subject[]> => {
  const subjects: Subject[] = [];
  for (const id of subjectIds) {
    const subject = await getSubject(id);
    if (subject) {
      subjects.push(subject);
    }
  }
  return subjects;
};

export async function getSubjectsByTeacher(teacherId: string) {
  // Get all schedules where this teacher is assigned
  const schedulesRef = collection(db, SCHEDULES_COLLECTION);
  const q = query(schedulesRef, where('teacherId', '==', teacherId));
  const snapshot = await getDocs(q);
  
  // Get unique subject IDs from schedules
  const subjectIds = [...new Set(snapshot.docs.map(doc => doc.data().subjectId))];
  
  // Get subject details for these IDs
  const subjects: Subject[] = [];
  for (const subjectId of subjectIds) {
    const subjectDoc = await getDoc(doc(db, SUBJECTS_COLLECTION, subjectId));
    if (subjectDoc.exists()) {
      subjects.push({ id: subjectDoc.id, ...subjectDoc.data() } as Subject);
    }
  }
  
  return subjects;
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
