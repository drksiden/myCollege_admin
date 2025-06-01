import {
  doc,
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
} from 'firebase/firestore';
import type { Group } from '@/types';
import { db } from '@/lib/firebase';

// Re-export Group type for convenience
export type { Group };

/**
 * Creates a new group in Firestore.
 * @param groupData Object containing group details (name, year, specialization, curatorId, subjectIds).
 * @returns Promise<string> The ID of the newly created group.
 */
export const createGroup = async (
  groupData: Pick<Group, 'name' | 'year' | 'specialization' | 'curatorId' | 'subjectIds'>
): Promise<string> => {
  const groupsRef = collection(db, 'groups');
  const newGroup = {
    ...groupData,
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
  const q = query(groupsRef, orderBy('name'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Group[];
}

/**
 * Updates an existing group in Firestore.
 * @param groupId The document ID of the group to update.
 * @param updates Partial data of Group to update.
 * @returns Promise<void>
 */
export const updateGroup = async (
  groupId: string,
  updates: Partial<Pick<Group, 'name' | 'year' | 'specialization' | 'curatorId' | 'subjectIds'>>
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
 * Unlinking students (clearing their groupId) MUST be handled separately by the calling function
 * to ensure data consistency.
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
 * Fetches all groups from Firestore, ordered by name.
 * @returns Promise<Group[]> An array of groups.
 */
export const getGroups = async (): Promise<Group[]> => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, orderBy('name'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Group[];
};

export const getGroupsByTeacher = async (teacherId: string): Promise<Group[]> => {
  const groupsRef = collection(db, 'groups');
  const q = query(groupsRef, where('curatorId', '==', teacherId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Group[];
};
