import {
  // createUserWithEmailAndPassword as firebaseCreateUserWithEmailAndPassword, // unused
} from 'firebase/auth';
import type {
  // Auth, // unused
  // UserCredential, // unused
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
  documentId,
  Timestamp,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { User } from '@/types';
import { db } from '@/lib/firebase';
import type { AppUser, UserRole, UserStatus, StudentData, TeacherData } from '@/types/index';
// import { getAuth, deleteUser as deleteAuthUser } from 'firebase/auth'; // unused
// import { format } from 'date-fns'; // unused

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
  const functions = getFunctions(undefined, 'asia-southeast1');
  const createUser = httpsCallable(functions, 'createUserFunction');
  
  try {
    // Проверяем, что все обязательные поля присутствуют
    if (!userData.email || !userData.password || !userData.firstName || !userData.lastName || !userData.role) {
      throw new Error('Missing required fields');
    }
    
    const result = await createUser(userData);
    
    if (!result.data) {
      throw new Error('No data returned from createUser function');
    }
    
    return result.data as User;
  } catch (error) {
    if (error instanceof Error) {
      // Проверяем, является ли ошибка ошибкой Firebase Functions
      if ('code' in error) {
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
 * @param userData Object containing firstName, lastName, email, role, teacherDetails, and studentDetails.
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
    teacherDetails?: {
      specialization: string;
      academicDegree: string;
      education: string;
    };
    studentDetails?: {
      groupId: string;
    };
  }
): Promise<void> => {
  const userRef = doc(db, 'users', uid);
  const newUser = {
    email: userData.email,
    firstName: userData.firstName,
    lastName: userData.lastName,
    role: userData.role,
    ...(userData.teacherDetails && { teacherDetails: userData.teacherDetails }),
    ...(userData.studentDetails && { studentDetails: userData.studentDetails }),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  return setDoc(userRef, newUser);
};

/**
 * Fetches all users from Firestore, ordered by creation date.
 * @returns Promise<User[]>
 */
export const getUsersFromFirestore = async (): Promise<User[]> => {
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
  dataToUpdate: Partial<Pick<User, 'firstName' | 'lastName' | 'role' | 'groupId' | 'studentDetails' | 'teacherDetails'>>
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
export const deleteUserFromFirestore = async (db: Firestore, uid: string): Promise<void> => {
  try {
    // Get user data first to check role
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data() as User;

    // Delete associated profile based on role
    if (userData.role === 'student') {
      const studentProfileQuery = query(
        collection(db, 'students'),
        where('userId', '==', uid)
      );
      const studentSnapshot = await getDocs(studentProfileQuery);
      studentSnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
    } else if (userData.role === 'teacher') {
      const teacherProfileQuery = query(
        collection(db, 'teachers'),
        where('userId', '==', uid)
      );
      const teacherSnapshot = await getDocs(teacherProfileQuery);
      teacherSnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
    }

    // Delete user document
    await deleteDoc(doc(db, 'users', uid));
  } catch (error) {
    console.error('Error deleting user from Firestore:', error);
    throw error;
  }
};

const USERS_COLLECTION = 'users';

/**
 * Gets a user by their ID
 * @param userId The ID of the user to retrieve
 * @returns Promise<AppUser | null> The user or null if not found
 */
export const getUserById = async (userId: string): Promise<AppUser | null> => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    console.warn(`User with ID ${userId} not found.`);
    return null;
  }

  return {
    uid: userSnap.id,
    ...userSnap.data(),
  } as AppUser;
};

/**
 * Gets users with optional filtering by role and pagination
 * @param options Optional parameters for filtering and pagination
 * @returns Promise<{ users: AppUser[], lastDoc: DocumentSnapshot | null }>
 */
export const getUsers = async (options: {
  role?: UserRole;
  status?: UserStatus;
  limit?: number;
  startAfterDoc?: DocumentSnapshot;
} = {}): Promise<{ users: AppUser[]; lastDoc: DocumentSnapshot | null }> => {
  const { role, status, limit: limitCount = 20, startAfterDoc } = options;

  let q = query(
    collection(db, USERS_COLLECTION),
    orderBy('createdAt', 'desc')
  );

  if (role) {
    q = query(q, where('role', '==', role));
  }

  if (status) {
    q = query(q, where('status', '==', status));
  }

  if (limitCount) {
    q = query(q, limit(limitCount));
  }

  if (startAfterDoc) {
    q = query(q, startAfter(startAfterDoc));
  }

  const querySnapshot = await getDocs(q);
  const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1] || null;

  const users = querySnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data(),
  })) as AppUser[];

  return { users, lastDoc };
};

/**
 * Updates a user's data
 * @param userId The ID of the user to update
 * @param dataToUpdate The data to update
 * @returns Promise<void>
 */
export const updateUser = async (
  userId: string,
  dataToUpdate: Partial<Omit<AppUser, 'uid' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userDocRef, {
    ...dataToUpdate,
    updatedAt: serverTimestamp(),
  });
};

/**
 * Deletes a user
 * @param userId The ID of the user to delete
 * @returns Promise<void>
 */
export const deleteUser = async (userId: string): Promise<void> => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  await deleteDoc(userDocRef);
};

/**
 * Approves a pending user
 * @param userId The ID of the user to approve
 * @param approvalData The data needed for approval based on role
 * @returns Promise<void>
 */
export const approveUser = async (
  userId: string,
  approvalData: {
    role: UserRole;
    groupId?: string;
    specialization?: string;
    education?: string;
    experience?: number;
  }
): Promise<void> => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  const userSnap = await getDoc(userDocRef);

  if (!userSnap.exists()) {
    throw new Error(`User with ID ${userId} not found.`);
  }

  const userData = userSnap.data() as AppUser;
  if (userData.status !== 'pending_approval') {
    throw new Error('User is not pending approval.');
  }

  const baseUpdateData = {
    status: 'active' as const,
    role: approvalData.role,
    updatedAt: serverTimestamp(),
  };

  let roleSpecificData = {};
  if (approvalData.role === 'student' && approvalData.groupId) {
    roleSpecificData = {
      groupId: approvalData.groupId,
    } as Partial<StudentData>;
  } else if (approvalData.role === 'teacher') {
    roleSpecificData = {
      specialization: approvalData.specialization,
      education: approvalData.education,
      experience: approvalData.experience,
      subjects: [],
    } as Partial<TeacherData>;
  }

  await updateDoc(userDocRef, {
    ...baseUpdateData,
    ...roleSpecificData,
  });
};

/**
 * Suspends a user
 * @param userId The ID of the user to suspend
 * @returns Promise<void>
 */
export const suspendUser = async (userId: string): Promise<void> => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userDocRef, {
    status: 'suspended',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Reactivates a suspended user
 * @param userId The ID of the user to reactivate
 * @returns Promise<void>
 */
export const reactivateUser = async (userId: string): Promise<void> => {
  const userDocRef = doc(db, USERS_COLLECTION, userId);
  await updateDoc(userDocRef, {
    status: 'active',
    updatedAt: serverTimestamp(),
  });
};

/**
 * Searches users by name or email
 * @param searchTerm Search term to look for in firstName, lastName, or email
 * @returns Promise<AppUser[]>
 */
export const searchUsers = async (searchTerm: string): Promise<AppUser[]> => {
  const usersCollection = collection(db, USERS_COLLECTION);
  const usersSnapshot = await getDocs(usersCollection);
  
  const searchTermLower = searchTerm.toLowerCase();
  
  return usersSnapshot.docs
    .map(doc => ({
      uid: doc.id,
      ...doc.data(),
    } as AppUser))
    .filter(user => 
      user.firstName.toLowerCase().includes(searchTermLower) ||
      user.lastName.toLowerCase().includes(searchTermLower) ||
      (user.email && user.email.toLowerCase().includes(searchTermLower))
    );
};

/**
 * Gets users by their IDs
 * @param userIds Array of user IDs to fetch
 * @returns Promise<AppUser[]>
 */
export const getUsersByIds = async (userIds: string[]): Promise<AppUser[]> => {
  if (!userIds.length) return [];
  
  const usersCollection = collection(db, USERS_COLLECTION);
  const q = query(usersCollection, where(documentId(), 'in', userIds));
  const usersSnapshot = await getDocs(q);
  
  return usersSnapshot.docs.map(doc => ({
    uid: doc.id,
    ...doc.data(),
  } as AppUser));
};
