import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import type { Grade } from '@/types';
import { createNotification } from './notificationService';

const GRADES_COLLECTION = 'grades';

export async function getGrades() {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }
    const gradesRef = collection(db, GRADES_COLLECTION);
    const snapshot = await getDocs(gradesRef);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
  } catch (error) {
    console.error('Error getting grades:', error);
    throw error;
  }
}

export async function getGrade(id: string) {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }
    const gradeRef = doc(db, GRADES_COLLECTION, id);
    const gradeDoc = await getDoc(gradeRef);
    
    if (!gradeDoc.exists()) {
      return null;
    }

    return {
      id: gradeDoc.id,
      ...gradeDoc.data()
    } as Grade;
  } catch (error) {
    console.error('Error getting grade:', error);
    throw error;
  }
}

export async function getGradesByStudent(studentId: string) {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }
    const gradesRef = collection(db, GRADES_COLLECTION);
    const q = query(gradesRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
  } catch (error) {
    console.error('Error getting student grades:', error);
    throw error;
  }
}

export async function getGradesBySubject(subjectId: string) {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }
    const gradesRef = collection(db, GRADES_COLLECTION);
    const q = query(gradesRef, where('subjectId', '==', subjectId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
  } catch (error) {
    console.error('Error getting subject grades:', error);
    throw error;
  }
}

export async function getGradesByGroup(groupId: string) {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }
    const gradesRef = collection(db, GRADES_COLLECTION);
    const q = query(gradesRef, where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
  } catch (error) {
    console.error('Error getting group grades:', error);
    throw error;
  }
}

export async function createGrade(data: Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }
    const gradesRef = collection(db, GRADES_COLLECTION);
    const gradeData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(gradesRef, gradeData);

    // Create notification for the student
    await createNotification({
      userId: data.studentId,
      title: 'New Grade Added',
      message: `You received a grade of ${data.value} in ${data.type}`,
      type: 'grade',
      read: false,
      data: {
        gradeId: docRef.id,
        subjectId: data.subjectId,
        groupId: data.groupId,
      },
    });

    return docRef;
  } catch (error) {
    console.error('Error creating grade:', error);
    throw error;
  }
}

export async function updateGrade(id: string, data: Partial<Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>>) {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }
    const gradeRef = doc(db, GRADES_COLLECTION, id);
    await updateDoc(gradeRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating grade:', error);
    throw error;
  }
}

export async function deleteGrade(id: string) {
  try {
    if (!db) {
      throw new Error('Firestore database is not initialized');
    }
    const gradeRef = doc(db, GRADES_COLLECTION, id);
    await deleteDoc(gradeRef);
  } catch (error) {
    console.error('Error deleting grade:', error);
    throw error;
  }
} 