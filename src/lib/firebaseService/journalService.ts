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
} from 'firebase/firestore';
import type { Journal, JournalEntry } from '@/types';

// Re-export types for convenience
export type { Journal, JournalEntry };

/**
 * Creates a new journal in Firestore.
 * @param db Firestore instance.
 * @param journalData Object containing groupId, subjectId, teacherId, semester, year.
 *                    'entries' array is initialized as empty.
 * @returns Promise<string> The ID of the newly created journal.
 */
export const createJournal = async (
  db: Firestore,
  journalData: Pick<Journal, 'groupId' | 'subjectId' | 'teacherId' | 'semester' | 'year'>
): Promise<string> => {
  const dataWithDefaults: Omit<Journal, 'id'> = {
    ...journalData,
    entries: [], // Initialize with an empty array of entries
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  const docRef = await addDoc(collection(db, 'journals'), dataWithDefaults);
  return docRef.id;
};

/**
 * Fetches a specific journal from Firestore by its document ID.
 * @param db Firestore instance.
 * @param journalId The document ID of the journal.
 * @returns Promise<Journal | null> The journal or null if not found.
 */
export const getJournal = async (
  db: Firestore,
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
 * Fetches all journals from Firestore, ordered by year, semester, then other fields.
 * @param db Firestore instance.
 * @returns Promise<Journal[]> An array of journals.
 */
export const getAllJournals = async (db: Firestore): Promise<Journal[]> => {
  const journalsCollection = collection(db, 'journals');
  const q = query(
    journalsCollection, 
    orderBy('year', 'desc'), 
    orderBy('semester', 'desc'),
    orderBy('groupId', 'asc'), // Or subjectId, depending on desired secondary sort
    orderBy('subjectId', 'asc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(docSnap => ({
    id: docSnap.id,
    ...docSnap.data(),
  } as Journal));
};

/**
 * Updates journal metadata (groupId, subjectId, teacherId, semester, year)
 * or the entire 'entries' array.
 * @param db Firestore instance.
 * @param journalId The document ID of the journal to update.
 * @param updates Partial data of Journal to update.
 * @returns Promise<void>
 */
export const updateJournal = async (
  db: Firestore,
  journalId: string,
  updates: Partial<Omit<Journal, 'id' | 'createdAt' | 'updatedAt'>> // Can include 'entries'
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
 * @param db Firestore instance.
 * @param journalId The document ID of the journal to delete.
 * @returns Promise<void>
 */
export const deleteJournal = async (
  db: Firestore,
  journalId: string
): Promise<void> => {
  const journalRef = doc(db, 'journals', journalId);
  return deleteDoc(journalRef);
};

/**
 * Adds or updates journal entries for a specific date.
 * Fetches the journal, filters out old entries for the given date,
 * adds the new/updated entries, and updates the journal with the modified 'entries' array.
 * @param db Firestore instance.
 * @param journalId The document ID of the journal.
 * @param date The specific date (as Firestore Timestamp) for which entries are being updated.
 * @param entriesForDate Array of JournalEntry objects for that date.
 * @returns Promise<void>
 */
export const addOrUpdateJournalEntriesForDate = async (
  db: Firestore,
  journalId: string,
  date: Timestamp, 
  entriesForDate: JournalEntry[] 
): Promise<void> => {
  const journal = await getJournal(db, journalId);
  if (!journal) {
    throw new Error("Journal not found");
  }

  // Filter out any existing entries for the given 'date'
  // Compare Timestamps by converting to milliseconds or using isEqual
  const otherEntries = journal.entries.filter(entry => 
    entry.date.toDate().setHours(0,0,0,0) !== date.toDate().setHours(0,0,0,0)
  );

  // Add the new 'entriesForDate' to the filtered list
  // Ensure the date in each entry matches the 'date' parameter, normalized
  const normalizedDateEntries = entriesForDate.map(e => ({...e, date}));
  const updatedEntries = [...otherEntries, ...normalizedDateEntries];
  
  // Sort entries by date then studentId for consistency, if desired
  updatedEntries.sort((a, b) => {
    const dateComparison = a.date.toMillis() - b.date.toMillis();
    if (dateComparison !== 0) return dateComparison;
    return a.studentId.localeCompare(b.studentId);
  });

  return updateJournal(db, journalId, { entries: updatedEntries });
};


/**
 * Removes all journal entries for a specific date.
 * @param db Firestore instance.
 * @param journalId The document ID of the journal.
 * @param date The specific date (as Firestore Timestamp) for which entries should be removed.
 * @returns Promise<void>
 */
export const removeJournalEntriesForDate = async (
  db: Firestore,
  journalId: string,
  date: Timestamp
): Promise<void> => {
  const journal = await getJournal(db, journalId);
  if (!journal) {
    throw new Error("Journal not found");
  }

  const updatedEntries = journal.entries.filter(entry => 
    entry.date.toDate().setHours(0,0,0,0) !== date.toDate().setHours(0,0,0,0)
  );
  
  return updateJournal(db, journalId, { entries: updatedEntries });
};
