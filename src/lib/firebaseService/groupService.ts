import {
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
  arrayUnion,
  arrayRemove,
  where,
  writeBatch,
  documentId,
} from 'firebase/firestore';
import type { Group, Student } from '@/types';
import { db } from '@/lib/firebase';

// Re-export Group type for convenience
export type { Group };

/**
 * Creates a new group in Firestore.
 * @param groupData Object containing group details (name, year, specialization).
 *                  'students' array is initialized as empty. 'scheduleId' is empty.
 * @returns Promise<string> The ID of the newly created group.
 */
export const createGroup = async (
  groupData: Pick<Group, 'name' | 'year' | 'specialization' | 'curatorId'>
): Promise<string> => {
  const groupsRef = collection(db, 'groups');
  const newGroup = {
    ...groupData,
    students: [],
    scheduleId: '',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(groupsRef, newGroup);
  return docRef.id;
};

/**
 * Fetches a specific group from Firestore by its document ID.
 * @param groupId The document ID of the group.
 * @returns Promise<Group | null> The group or null if not found.
 */
export const getGroup = async (
  groupId: string
): Promise<Group | null> => {
  const groupRef = doc(db, 'groups', groupId);
  const groupDoc = await getDoc(groupRef);
  if (!groupDoc.exists()) return null;
  return {
    id: groupDoc.id,
    ...groupDoc.data(),
    createdAt: groupDoc.data().createdAt,
    updatedAt: groupDoc.data().updatedAt,
  } as Group;
};

/**
 * Fetches all groups from Firestore, ordered by name.
 * @returns Promise<Group[]> An array of groups.
 */
export async function getAllGroups(): Promise<Group[]> {
  const groupsRef = collection(db, 'groups');
  const snapshot = await getDocs(groupsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Group[];
}

/**
 * Updates an existing group in Firestore (name, year, specialization).
 * @param groupId The document ID of the group to update.
 * @param updates Partial data of Group to update (name, year, specialization).
 * @returns Promise<void>
 */
export const updateGroup = async (
  groupId: string,
  updates: Partial<Pick<Group, 'name' | 'year' | 'specialization' | 'students' | 'scheduleId' | 'curatorId'>>
): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  const updateData = {
    ...updates,
    updatedAt: Timestamp.now(),
  };
  await updateDoc(groupRef, updateData);
};

/**
 * Deletes a group from Firestore.
 * IMPORTANT: This function ONLY deletes the group document.
 * Unlinking students (clearing their groupId) MUST be handled separately, ideally in a batch
 * by the calling function in the page component to ensure data consistency.
 * @param groupId The document ID of the group to delete.
 * @returns Promise<void>
 */
export const deleteGroup = async (
  groupId: string
): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  await deleteDoc(groupRef);
};

/**
 * Adds a student's profile ID to the 'students' array of a group
 * AND updates the student's 'groupId' field. Uses a batch write for atomicity.
 * @param groupId The document ID of the group.
 * @param studentProfileId The document ID of the student's profile.
 * @returns Promise<void>
 */
export const addStudentToGroup = async (
  groupId: string,
  studentProfileId: string
): Promise<void> => {
  const batch = writeBatch(db);
  const groupRef = doc(db, 'groups', groupId);
  const studentProfileRef = doc(db, 'students', studentProfileId);
  const studentDoc = await getDoc(studentProfileRef);
  
  if (!studentDoc.exists()) {
    throw new Error('Student profile not found');
  }
  
  const studentData = studentDoc.data();
  const userId = studentData.userId;

  // Add student to group's student list
  batch.update(groupRef, {
    students: arrayUnion(studentProfileId),
    updatedAt: serverTimestamp() as Timestamp,
  });

  // Update student's groupId
  batch.update(studentProfileRef, {
    groupId: groupId,
    updatedAt: serverTimestamp() as Timestamp,
  });

  // Update user's groupId if userId exists
  if (userId) {
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      groupId: groupId,
      updatedAt: serverTimestamp() as Timestamp,
    });
  }

  return batch.commit();
};

/**
 * Removes a student's profile ID from the 'students' array of a group
 * AND updates the student's 'groupId' field to an empty string (or null). Uses a batch write.
 * @param groupId The document ID of the group.
 * @param studentProfileId The document ID of the student's profile.
 * @returns Promise<void>
 */
export const removeStudentFromGroup = async (
  groupId: string,
  studentProfileId: string
): Promise<void> => {
  const batch = writeBatch(db);
  const groupRef = doc(db, 'groups', groupId);
  const studentProfileRef = doc(db, 'students', studentProfileId);
  const studentDoc = await getDoc(studentProfileRef);
  
  if (!studentDoc.exists()) {
    throw new Error('Student profile not found');
  }
  
  const studentData = studentDoc.data();
  const userId = studentData.userId;

  // Remove student from group's student list
  batch.update(groupRef, {
    students: arrayRemove(studentProfileId),
    updatedAt: serverTimestamp() as Timestamp,
  });

  // Clear student's groupId
  batch.update(studentProfileRef, {
    groupId: "",
    updatedAt: serverTimestamp() as Timestamp,
  });

  // Clear user's groupId if userId exists
  if (userId) {
    const userRef = doc(db, 'users', userId);
    batch.update(userRef, {
      groupId: "",
      updatedAt: serverTimestamp() as Timestamp,
    });
  }

  return batch.commit();
};

/**
 * Fetches student profile details for a list of student profile IDs.
 * @param studentProfileIds Array of student profile document IDs.
 * @returns Promise<Student[]> An array of student profiles. Returns empty if input array is empty.
 */
export const getStudentsInGroupDetails = async (
  studentProfileIds: string[]
): Promise<Student[]> => {
  if (!studentProfileIds || studentProfileIds.length === 0) {
    return [];
  }
  // Firestore 'in' queries are limited to 30 elements in the array.
  const studentsRef = collection(db, 'students');
  const q = query(studentsRef, where(documentId(), 'in', studentProfileIds));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Student[];
};

export const getGroupsByTeacher = async (teacherId: string): Promise<Group[]> => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('teacherId', '==', teacherId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Group[];
};

export const getGroups = async (): Promise<Group[]> => {
  const groupsRef = collection(db, 'groups');
  const snapshot = await getDocs(groupsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Group[];
};

export const deleteGroupInService = async (
  groupId: string
): Promise<void> => {
  const groupRef = doc(db, 'groups', groupId);
  await deleteDoc(groupRef);
};
