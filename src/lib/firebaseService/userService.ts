import {
  createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword,
} from 'firebase/auth';
import type {
  Auth,
  UserCredential,
} from 'firebase/auth';
import {
  Firestore,
  doc,
  setDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  serverTimestamp,
  query,
  orderBy,
  where,
  limit,
  startAfter,
  DocumentSnapshot,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User } from '@/types';
import { db } from './firebase';
import { getAuth, deleteUser as deleteAuthUser } from 'firebase/auth';
import { format } from 'date-fns';

// Re-export User type for convenience
export type { User };

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  iin: string;
  role: 'student' | 'teacher' | 'admin';
  enrollmentDate?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  specialization?: string;
  academicDegree?: string;
  groupId?: string;
}

/**
 * Creates a new user using Cloud Function.
 * @param userData Object containing user data (email, password, firstName, lastName, role).
 * @returns Promise<User>
 */
export const createUserInAuth = async (userData: CreateUserData): Promise<User> => {
  const functions = getFunctions();
  const createUser = httpsCallable(functions, 'createUserFunction');
  
  try {
    console.log('Starting createUserInAuth...');
    console.log('Functions instance:', functions);
    console.log('User data:', userData);
    
    // Проверяем, что все обязательные поля присутствуют
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.role) {
      console.error('Missing required fields:', {
        email: !!userData.email,
        password: !!userData.password,
        firstName: !!userData.firstName,
        lastName: !!userData.lastName,
        role: !!userData.role
      });
      throw new Error('Missing required fields');
    }
    
    console.log('Calling createUser function...');
    const result = await createUser(userData);
    console.log('Create user result:', result);
    
    if (!result.data) {
      console.error('No data returned from createUser function');
      throw new Error('No data returned from createUser function');
    }
    
    console.log('User created successfully:', result.data);
    return result.data as User;
  } catch (error) {
    console.error('Error in createUserInAuth:', error);
    if (error instanceof Error) {
      // Проверяем, является ли ошибка ошибкой Firebase Functions
      if ('code' in error) {
        console.error('Firebase error code:', (error as any).code);
        console.error('Firebase error message:', error.message);
        throw new Error(`Firebase error: ${error.message}`);
      }
      throw new Error(`Failed to create user: ${error.message}`);
    }
    throw error;
  }
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
  const newUser = {
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return setDoc(userRef, newUser);
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
  const updatePayload = {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  };
  return updateDoc(userRef, updatePayload);
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

/**
 * Fetches a single user by ID from Firestore.
 * @param db Firestore instance.
 * @param uid User's UID.
 * @returns Promise<User | null>
 */
export const getUserById = async (
  db: Firestore,
  uid: string
): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }

  return {
    uid: userSnap.id,
    ...userSnap.data(),
  } as User;
};

/**
 * Fetches users filtered by role.
 * @param db Firestore instance.
 * @param role User role to filter by.
 * @returns Promise<User[]>
 */
export const getUsersByRole = async (
  db: Firestore,
  role: User['role']
): Promise<User[]> => {
  const usersCollection = collection(db, 'users');
  const q = query(
    usersCollection,
    where('role', '==', role),
    orderBy('createdAt', 'desc')
  );
  
  const usersSnapshot = await getDocs(q);
  return usersSnapshot.docs.map(docSnapshot => ({
    uid: docSnapshot.id,
    ...docSnapshot.data(),
  } as User));
};

/**
 * Fetches users with pagination.
 * @param db Firestore instance.
 * @param pageSize Number of users per page.
 * @param lastDoc Last document from previous page (for pagination).
 * @returns Promise<{ users: User[], lastDoc: DocumentSnapshot | null }>
 */
export const getUsersWithPagination = async (
  db: Firestore,
  pageSize: number = 10,
  lastDoc: DocumentSnapshot | null = null
): Promise<{ users: User[], lastDoc: DocumentSnapshot | null }> => {
  const usersCollection = collection(db, 'users');
  let q = query(
    usersCollection,
    orderBy('createdAt', 'desc'),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  const usersSnapshot = await getDocs(q);
  const users = usersSnapshot.docs.map(docSnapshot => ({
    uid: docSnapshot.id,
    ...docSnapshot.data(),
  } as User));

  const lastVisible = usersSnapshot.docs[usersSnapshot.docs.length - 1] || null;

  return {
    users,
    lastDoc: lastVisible,
  };
};

/**
 * Searches users by name or email.
 * @param db Firestore instance.
 * @param searchTerm Search term to look for in firstName, lastName, or email.
 * @returns Promise<User[]>
 */
export const searchUsers = async (
  db: Firestore,
  searchTerm: string
): Promise<User[]> => {
  const usersCollection = collection(db, 'users');
  const usersSnapshot = await getDocs(usersCollection);
  
  const searchTermLower = searchTerm.toLowerCase();
  
  return usersSnapshot.docs
    .map(docSnapshot => ({
      uid: docSnapshot.id,
      ...docSnapshot.data(),
    } as User))
    .filter(user => 
      user.firstName.toLowerCase().includes(searchTermLower) ||
      user.lastName.toLowerCase().includes(searchTermLower) ||
      user.email.toLowerCase().includes(searchTermLower)
    );
};

export const getUsers = async (): Promise<User[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  return snapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data()
  })) as User[];
};
