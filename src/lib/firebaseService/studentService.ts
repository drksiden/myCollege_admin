import type { Student } from '@/types';
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
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Removed re-export of Student type

const STUDENTS_COLLECTION = 'students';
const GROUPS_COLLECTION = 'groups';

/**
 * Creates a new student profile in Firestore.
 * @param studentData Object containing student-specific fields.
 *                    It should not include 'id', 'createdAt', or 'updatedAt'.
 * @returns Promise<string> The ID of the newly created student profile.
 */
export const createStudentProfile = async (
  studentData: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    if (!studentData.groupId) {
      throw new Error('ID группы обязателен для создания профиля студента');
    }
    
    // Создаем профиль студента
    const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), {
      ...studentData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });

    // Обновляем массив студентов в группе
    const groupRef = doc(db, GROUPS_COLLECTION, studentData.groupId);
    await updateDoc(groupRef, {
      students: arrayUnion(docRef.id),
      updatedAt: Timestamp.now(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Ошибка при создании профиля студента:', error);
    throw new Error('Не удалось создать профиль студента');
  }
};

/**
 * Fetches a specific student profile from Firestore by its document ID.
 * @param studentProfileId The document ID of the student profile.
 * @returns Promise<Student | null> The student profile or null if not found.
 */
export const getStudentProfile = async (
  studentProfileId: string
): Promise<Student | null> => {
  try {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentProfileId);
    const docSnap = await getDoc(studentRef);
    
    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as Student;
    }
    return null;
  } catch (error) {
    console.error('Ошибка при получении профиля студента:', error);
    throw new Error('Не удалось получить профиль студента');
  }
};

/**
 * Fetches a student profile from Firestore based on the userId.
 * Assumes there's at most one student profile per userId.
 * @param userId The UID of the user associated with the student profile.
 * @returns Promise<Student | null> The student profile or null if not found.
 */
export const getStudentProfileByUserId = async (
  userId: string
): Promise<Student | null> => {
  const studentsCollection = collection(db, STUDENTS_COLLECTION);
  const q = query(studentsCollection, where('userId', '==', userId));
  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Assuming only one profile per userId
    const docSnap = querySnapshot.docs[0];
    return { id: docSnap.id, ...docSnap.data() } as Student;
  }
  return null;
};

/**
 * Updates an existing student profile in Firestore.
 * @param studentProfileId The document ID of the student profile to update.
 * @param updates Partial data of Student to update. Excludes 'id', 'createdAt'.
 * @returns Promise<void>
 */
export const updateStudentProfile = async (
  id: string,
  studentData: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  try {
    const studentRef = doc(db, STUDENTS_COLLECTION, id);
    const studentDoc = await getDoc(studentRef);
    
    if (!studentDoc.exists()) {
      throw new Error('Профиль студента не найден');
    }

    const oldData = studentDoc.data() as Student;
    const newGroupId = studentData.groupId;

    // Если изменилась группа
    if (newGroupId && newGroupId !== oldData.groupId) {
      // Удаляем студента из старой группы
      if (oldData.groupId) {
        const oldGroupRef = doc(db, GROUPS_COLLECTION, oldData.groupId);
        await updateDoc(oldGroupRef, {
          students: arrayRemove(id),
          updatedAt: Timestamp.now(),
        });
      }

      // Добавляем студента в новую группу
      const newGroupRef = doc(db, GROUPS_COLLECTION, newGroupId);
      await updateDoc(newGroupRef, {
        students: arrayUnion(id),
        updatedAt: Timestamp.now(),
      });
    }

    // Обновляем данные профиля
    await updateDoc(studentRef, {
      ...studentData,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Ошибка при обновлении профиля студента:', error);
    throw new Error('Не удалось обновить профиль студента');
  }
};

/**
 * Deletes a student profile from Firestore.
 * Note: This function does NOT update the corresponding User document's studentId.
 * That logic should be handled by the calling function, potentially using a batch write.
 * @param studentProfileId The document ID of the student profile to delete.
 * @returns Promise<void>
 */
export const deleteStudentProfile = async (
  studentProfileId: string
): Promise<void> => {
  try {
    const studentRef = doc(db, STUDENTS_COLLECTION, studentProfileId);
    await deleteDoc(studentRef);
  } catch (error) {
    console.error('Ошибка при удалении профиля студента:', error);
    throw new Error('Не удалось удалить профиль студента');
  }
};

/**
 * Fetches all student profiles from Firestore.
 * @returns Promise<Student[]> An array of student profiles.
 */
export const getAllStudents = async (): Promise<Student[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];
  } catch (error) {
    console.error('Ошибка при получении списка студентов:', error);
    throw new Error('Не удалось получить список студентов');
  }
};

export const getStudents = async (): Promise<Student[]> => {
  const studentsRef = collection(db, STUDENTS_COLLECTION);
  const snapshot = await getDocs(studentsRef);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  } as Student));
};

export const getStudent = async (id: string): Promise<Student | null> => {
  const studentRef = doc(db, STUDENTS_COLLECTION, id);
  const studentDoc = await getDoc(studentRef);
  if (!studentDoc.exists()) {
    return null;
  }
  return {
    id: studentDoc.id,
    ...studentDoc.data(),
  } as Student;
};

export const getStudentsByGroup = async (groupId: string): Promise<Student[]> => {
  try {
    console.log('Getting students for group:', groupId);
    const q = query(
      collection(db, STUDENTS_COLLECTION),
      where('groupId', '==', groupId)
    );
    const querySnapshot = await getDocs(q);
    const students = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];
    console.log('Found students:', students);
    return students;
  } catch (error) {
    console.error('Ошибка при получении студентов группы:', error);
    throw new Error('Не удалось получить список студентов группы');
  }
};

export const createStudent = async (data: Omit<Student, 'id' | 'createdAt' | 'updatedAt'>): Promise<Student> => {
  const studentsRef = collection(db, STUDENTS_COLLECTION);
  const docRef = await addDoc(studentsRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return {
    id: docRef.id,
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  } as Student;
};

export const updateStudent = async (
  id: string,
  data: Partial<Omit<Student, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> => {
  const studentRef = doc(db, STUDENTS_COLLECTION, id);
  const dataWithTimestamp = {
    ...data,
    updatedAt: serverTimestamp(),
  };
  return updateDoc(studentRef, dataWithTimestamp);
};

export const deleteStudent = async (id: string): Promise<void> => {
  const studentRef = doc(db, STUDENTS_COLLECTION, id);
  return deleteDoc(studentRef);
};
