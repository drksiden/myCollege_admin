import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Semester } from '@/types/index';

const SEMESTERS_COLLECTION = 'semesters';

/**
 * Creates a new semester in Firestore
 * @param semesterData Data for the new semester
 * @returns Promise<string> The ID of the newly created semester
 */
export const createSemester = async (
  semesterData: Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const semestersRef = collection(db, SEMESTERS_COLLECTION);
  const docRef = await addDoc(semestersRef, {
    ...semesterData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Gets a semester by its ID
 * @param semesterId The ID of the semester to retrieve
 * @returns Promise<Semester | null> The semester or null if not found
 */
export const getSemester = async (semesterId: string): Promise<Semester | null> => {
  const semesterRef = doc(db, SEMESTERS_COLLECTION, semesterId);
  const docSnap = await getDoc(semesterRef);
  
  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Semester;
};

/**
 * Gets all semesters, optionally filtered by status
 * @param status Optional status filter
 * @returns Promise<Semester[]> Array of semesters
 */
export const getSemesters = async (status?: Semester['status']): Promise<Semester[]> => {
  let q = query(
    collection(db, SEMESTERS_COLLECTION),
    orderBy('startDate', 'desc')
  );

  if (status) {
    q = query(q, where('status', '==', status));
  }

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Semester[];
};

/**
 * Gets the current active semester
 * @returns Promise<Semester | null> The active semester or null if none found
 */
export const getActiveSemester = async (): Promise<Semester | null> => {
  const now = Timestamp.now();
  const q = query(
    collection(db, SEMESTERS_COLLECTION),
    where('status', '==', 'active'),
    where('startDate', '<=', now),
    where('endDate', '>=', now),
    limit(1)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Semester;
};

/**
 * Updates a semester
 * @param semesterId The ID of the semester to update
 * @param semesterData The new data for the semester
 * @returns Promise<void>
 */
export const updateSemester = async (
  semesterId: string,
  semesterData: Partial<Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const semesterRef = doc(db, SEMESTERS_COLLECTION, semesterId);
  await updateDoc(semesterRef, {
    ...semesterData,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Deletes a semester
 * @param semesterId The ID of the semester to delete
 * @returns Promise<void>
 */
export const deleteSemester = async (semesterId: string): Promise<void> => {
  const semesterRef = doc(db, SEMESTERS_COLLECTION, semesterId);
  await deleteDoc(semesterRef);
};

/**
 * Archives a semester
 * @param semesterId The ID of the semester to archive
 * @returns Promise<void>
 */
export const archiveSemester = async (semesterId: string): Promise<void> => {
  const semesterRef = doc(db, SEMESTERS_COLLECTION, semesterId);
  await updateDoc(semesterRef, {
    status: 'archived',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Activates a semester
 * @param semesterId The ID of the semester to activate
 * @returns Promise<void>
 */
export const activateSemester = async (semesterId: string): Promise<void> => {
  const semesterRef = doc(db, SEMESTERS_COLLECTION, semesterId);
  await updateDoc(semesterRef, {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
};

export async function getCurrentSemester(): Promise<Semester | null> {
  const now = Timestamp.now();
  const semestersRef = collection(db, SEMESTERS_COLLECTION);
  const q = query(
    semestersRef,
    where('startDate', '<=', now),
    where('endDate', '>=', now)
  );
  const querySnapshot = await getDocs(q);
  
  if (querySnapshot.empty) {
    return null;
  }
  
  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as Semester;
}

export async function getSemesterById(semesterId: string): Promise<Semester | null> {
  const semesterRef = doc(db, SEMESTERS_COLLECTION, semesterId);
  const docSnap = await getDoc(semesterRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  return {
    id: docSnap.id,
    ...docSnap.data()
  } as Semester;
} 