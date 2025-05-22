import type { Student } from '@/types';
import {
  Firestore,
  doc,
  // setDoc, // Not used directly as addDoc generates ID
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebaseService/firebase';

// Removed re-export of Student type

const STUDENTS_COLLECTION = 'students';

/**
 * Creates a new student profile in Firestore.
 * @param db Firestore instance.
 * @param studentData Object containing student-specific fields.
 *                    It should not include 'uid', 'createdAt', or 'updatedAt'.
 * @returns Promise<string> The ID of the newly created student profile.
 */
export const createStudentProfile = async (
  db: Firestore,
  studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const dataWithTimestamps: Omit<Student, 'id'> = {
    ...studentData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), dataWithTimestamps);
  return docRef.id;
};

/**
 * Fetches a specific student profile from Firestore by its document ID.
 * @param db Firestore instance.
 * @param studentProfileId The document ID of the student profile.
 * @returns Promise<Student | null> The student profile or null if not found.
 */
export const getStudentProfile = async (
  db: Firestore,
  studentProfileId: string
): Promise<Student | null> => {
  const studentRef = doc(db, STUDENTS_COLLECTION, studentProfileId);
  const docSnap = await getDoc(studentRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Student;
  }
  return null;
};

/**
 * Fetches a student profile from Firestore based on the userId.
 * Assumes there's at most one student profile per userId.
 * @param db Firestore instance.
 * @param userId The UID of the user associated with the student profile.
 * @returns Promise<Student | null> The student profile or null if not found.
 */
export const getStudentProfileByUserId = async (
  db: Firestore,
  userId: string
): Promise<Student | null> => {
  const studentsCollection = collection(db, STUDENTS_COLLECTION);
  const q = query(studentsCollection, where('userId', '==', userId)); // Query by userId field
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Assuming only one profile per userId
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Student; // Map docSnap.id to 'id'
  }
  return null;
};

/**
 * Updates an existing student profile in Firestore.
 * @param db Firestore instance.
 * @param studentProfileId The document ID of the student profile to update.
 * @param updates Partial data of Student to update. Excludes 'uid', 'createdAt'.
 * @returns Promise<void>
 */
export const updateStudentProfile = async (
  db: Firestore,
  studentProfileId: string,
  updates: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const studentRef = doc(db, STUDENTS_COLLECTION, studentProfileId);
  const dataWithTimestamp = {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  };
  return updateDoc(studentRef, dataWithTimestamp);
};

/**
 * Deletes a student profile from Firestore.
 * Note: This function does NOT update the corresponding User document's studentId.
 * That logic should be handled by the calling function, potentially using a batch write.
 * @param db Firestore instance.
 * @param studentProfileId The document ID of the student profile to delete.
 * @returns Promise<void>
 */
export const deleteStudentProfileInService = async (
  db: Firestore,
  studentProfileId: string
): Promise<void> => {
  const studentRef = doc(db, STUDENTS_COLLECTION, studentProfileId);
  return deleteDoc(studentRef);
};

/**
 * Fetches all student profiles from Firestore.
 * @param db Firestore instance.
 * @returns Promise<Student[]> An array of student profiles.
 */
export const getAllStudents = async (db: Firestore): Promise<Student[]> => {
  const studentsCollection = collection(db, STUDENTS_COLLECTION);
  const q = query(studentsCollection, orderBy('createdAt', 'desc')); // Optional: order by creation
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id, // Map docSnap.id to 'id'
    ...docSnap.data(),
  } as Student));
};

// Redundant functions below are removed as per refactoring plan.
// getStudents() - covered by getAllStudents
// getStudent(uid: string) - covered by getStudentProfile(profileId: string) or getStudentProfileByUserId(userId: string)
// getStudentsByGroup(groupId: string) - To be removed, client-side filtering or specific query if needed later.
// createStudent(...) - covered by createStudentProfile
// updateStudent(uid: string, ...) - covered by updateStudentProfile(profileId: string, ...)
// deleteStudent(uid: string) - covered by deleteStudentProfileInService(profileId: string)
