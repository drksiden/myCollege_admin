import {
  Auth,
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  Timestamp,
  query,
  orderBy,
} from 'firebase/firestore';
import type { User } from '@/types'; // Assuming User is correctly defined in src/types/index.ts

// Re-export User type for convenience
export type { User };

/**
 * Creates a new user in Firebase Authentication.
 * @param auth Firebase Auth instance.
 * @param email User's email.
 * @param password User's password.
 * @returns Promise<UserCredential>
 */
export const createUserInAuth = async (
  auth: Auth,
  email: string,
  password?: string // Password can be optional if handled by backend or other flows
): Promise<UserCredential> => {
  if (!password) {
    // This case should ideally be handled by a backend function that sets a temporary password
    // or sends a password reset email. For client-side, a password is required.
    throw new Error("Password is required for client-side user creation.");
  }
  return firebaseCreateUserWithEmailAndPassword(auth, email, password);
};

/**
 * Creates a user document in Firestore.
 * @param db Firestore instance.
 * @param uid User's UID (from Auth).
 * @param userData Object containing firstName, lastName, email, role.
 * @returns Promise<void>
 */
export const createUserDocument = async (
  db: Firestore,
  uid: string,
  userData: {
    firstName: string;
    lastName: string;
    email: string;
    role: User['role'];
  }
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const newUser: Omit<User, 'uid' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
    createdAt: serverTimestamp() as Timestamp, // Cast to Timestamp for type consistency
    updatedAt: serverTimestamp() as Timestamp, // Cast to Timestamp for type consistency
    // teacherId and studentId can be added later if needed
  };
  // Type workaround for setDoc with serverTimestamp.
  // The actual type of newUser when serverTimestamp is resolved will match User.
  return setDoc(userRef, newUser as any);
};

/**
 * Fetches all users from Firestore, ordered by creation date.
 * @param db Firestore instance.
 * @returns Promise<User[]>
 */
export const getUsersFromFirestore = async (db: Firestore): Promise<User[]> => {
  const usersCollection = collection(db, 'users');
  const q = query(usersCollection, orderBy('createdAt', 'desc'));
  const usersSnapshot = await getDocs(q);
  return usersSnapshot.docs.map(docSnapshot => ({
    uid: docSnapshot.id,
    ...docSnapshot.data(),
  } as User));
};

/**
 * Updates a user document in Firestore.
 * @param db Firestore instance.
 * @param uid User's UID.
 * @param dataToUpdate Partial data of User to update (e.g., { firstName, lastName, role }).
 * @returns Promise<void>
 */
export const updateUserInFirestore = async (
  db: Firestore,
  uid: string,
  dataToUpdate: Partial<Pick<User, 'firstName' | 'lastName' | 'role'>>
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const updatePayload: Partial<User> & { updatedAt: Timestamp } = {
    ...dataToUpdate,
    updatedAt: serverTimestamp() as Timestamp,
  };
  // Type workaround for updateDoc with serverTimestamp.
  return updateDoc(userRef, updatePayload as any);
};

/**
 * Deletes a user document from Firestore.
 * Note: This does NOT delete the Firebase Auth user.
 * @param db Firestore instance.
 * @param uid User's UID.
 * @returns Promise<void>
 */
export const deleteUserFromFirestore = async (
  db: Firestore,
  uid: string
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  return deleteDoc(userRef);
};
