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
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Journal, JournalEntry } from '@/types';

// Re-export types for convenience
export type { Journal, JournalEntry };

/**
 * Creates a new journal in Firestore.
 * @param journalData Object containing groupId, subjectId, teacherId, semesterId.
 * @returns Promise<string> The ID of the newly created journal.
 */
export const createJournal = async (
  journalData: Pick<Journal, 'groupId' | 'subjectId' | 'teacherId' | 'semesterId'>
): Promise<string> => {
  const dataWithDefaults: Omit<Journal, 'id'> = {
    ...journalData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(collection(db, 'journals'), dataWithDefaults);
  return docRef.id;
};

/**
 * Fetches a specific journal from Firestore by its document ID.
 * @param journalId The document ID of the journal.
 * @returns Promise<Journal | null> The journal or null if not found.
 */
export const getJournal = async (
  journalId: string
): Promise<Journal | null> => {
  const journalRef = doc(db, 'journals', journalId);
  const docSnap = await getDoc(journalRef);
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Journal;
  }
  return null;
};

/**
 * Fetches all journals from Firestore, ordered by semesterId, then other fields.
 * @returns Promise<Journal[]> An array of journals.
 */
export const getAllJournals = async (): Promise<Journal[]> => {
  const journalsCollection = collection(db, 'journals');
  const q = query(
    journalsCollection, 
    orderBy('semesterId', 'desc'),
    orderBy('groupId', 'asc'),
    orderBy('subjectId', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as Journal));
};

/**
 * Updates journal metadata (groupId, subjectId, teacherId, semesterId).
 * @param journalId The document ID of the journal to update.
 * @param updates Partial data of Journal to update.
 * @returns Promise<void>
 */
export const updateJournal = async (
  journalId: string,
  updates: Partial<Omit<Journal, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const journalRef = doc(db, 'journals', journalId);
  const dataWithTimestamp = {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  };
  return updateDoc(journalRef, dataWithTimestamp);
};

/**
 * Deletes a journal from Firestore.
 * @param journalId The document ID of the journal to delete.
 * @returns Promise<void>
 */
export const deleteJournal = async (
  journalId: string
): Promise<void> => {
  const journalRef = doc(db, 'journals', journalId);
  return deleteDoc(journalRef);
};

/**
 * Fetches all journal entries for a specific journal.
 * @param journalId The document ID of the journal.
 * @returns Promise<JournalEntry[]> An array of journal entries.
 */
export const getJournalEntries = async (journalId: string): Promise<JournalEntry[]> => {
  const journalEntriesCollection = collection(db, 'journalEntries');
  const q = query(
    journalEntriesCollection,
    where('journalId', '==', journalId),
    orderBy('date', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as JournalEntry));
};

/**
 * Creates a new journal entry.
 * @param entryData The journal entry data.
 * @returns Promise<string> The ID of the newly created entry.
 */
export const createJournalEntry = async (
  entryData: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const dataWithDefaults: Omit<JournalEntry, 'id'> = {
    ...entryData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(collection(db, 'journalEntries'), dataWithDefaults);
  return docRef.id;
};

/**
 * Updates an existing journal entry.
 * @param entryId The document ID of the entry to update.
 * @param updates Partial data of JournalEntry to update.
 * @returns Promise<void>
 */
export const updateJournalEntry = async (
  entryId: string,
  updates: Partial<Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const entryRef = doc(db, 'journalEntries', entryId);
  const dataWithTimestamp = {
    ...updates,
    updatedAt: serverTimestamp() as Timestamp,
  };
  return updateDoc(entryRef, dataWithTimestamp);
};

/**
 * Deletes a journal entry.
 * @param entryId The document ID of the entry to delete.
 * @returns Promise<void>
 */
export const deleteJournalEntry = async (
  entryId: string
): Promise<void> => {
  const entryRef = doc(db, 'journalEntries', entryId);
  return deleteDoc(entryRef);
};
