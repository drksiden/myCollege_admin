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
  and,
} from 'firebase/firestore';
import type { Grade } from '@/types';
import { getSubject } from './subjectService';
import { getUsers } from './userService';

const GRADES_COLLECTION = 'grades';
const NOTIFICATIONS_COLLECTION = 'notifications';

interface GetGradesOptions {
  studentIds?: string[];
  subjectId?: string;
  semesterId?: string;
  type?: string;
}

class GradeServiceError extends Error {
  public code?: string;
  public context?: Record<string, unknown>;
  
  constructor(message: string, code?: string, context?: Record<string, unknown>) {
    super(message);
    this.name = 'GradeServiceError';
    this.code = code;
    this.context = context;
  }
}

function checkDatabaseInitialized() {
  if (!db) {
    throw new GradeServiceError('Firestore database is not initialized', 'DB_NOT_INITIALIZED');
  }
}

export async function getGrades(options: GetGradesOptions = {}) {
  try {
    checkDatabaseInitialized();
    const gradesRef = collection(db, GRADES_COLLECTION);
    
    // Создаем массив условий для фильтрации
    const conditions = [];
    if (options.studentIds?.length) {
      conditions.push(where('studentId', 'in', options.studentIds));
    }
    if (options.subjectId) {
      conditions.push(where('subjectId', '==', options.subjectId));
    }
    if (options.semesterId) {
      conditions.push(where('semesterId', '==', options.semesterId));
    }
    if (options.type) {
      conditions.push(where('type', '==', options.type));
    }

    // Создаем запрос с условиями
    const q = conditions.length > 0 
      ? query(gradesRef, and(...conditions))
      : query(gradesRef);

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error getting grades:', { error, options });
    throw new GradeServiceError('Failed to get grades', 'GET_GRADES_ERROR', { options });
  }
}

export async function getGrade(id: string) {
  try {
    checkDatabaseInitialized();
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
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error getting grade:', { error, gradeId: id });
    throw new GradeServiceError('Failed to get grade', 'GET_GRADE_ERROR', { gradeId: id });
  }
}

export async function getGradesByStudent(studentId: string) {
  try {
    checkDatabaseInitialized();
    const gradesRef = collection(db, GRADES_COLLECTION);
    const q = query(gradesRef, where('studentId', '==', studentId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error getting student grades:', { error, studentId });
    throw new GradeServiceError('Failed to get student grades', 'GET_STUDENT_GRADES_ERROR', { studentId });
  }
}

export async function getGradesBySubject(subjectId: string) {
  try {
    checkDatabaseInitialized();
    const gradesRef = collection(db, GRADES_COLLECTION);
    const q = query(gradesRef, where('subjectId', '==', subjectId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error getting subject grades:', { error, subjectId });
    throw new GradeServiceError('Failed to get subject grades', 'GET_SUBJECT_GRADES_ERROR', { subjectId });
  }
}

export async function getGradesByGroup(groupId: string) {
  try {
    checkDatabaseInitialized();
    const gradesRef = collection(db, GRADES_COLLECTION);
    const q = query(gradesRef, where('groupId', '==', groupId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error getting group grades:', { error, groupId });
    throw new GradeServiceError('Failed to get group grades', 'GET_GROUP_GRADES_ERROR', { groupId });
  }
}

export const addGrade = async (data: Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    checkDatabaseInitialized();
    const gradesRef = collection(db, GRADES_COLLECTION);
    const gradeData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(gradesRef, gradeData);

    // Get subject and student data for notifications
    const subject = await getSubject(data.subjectId);
    const { users } = await getUsers({ role: 'student' });
    const student = users.find(u => u.uid === data.studentId);

    // Create notification for the student
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const notificationData = {
      recipientId: data.studentId,
      type: 'new_grade',
      title: 'Новая оценка',
      body: `Вам выставлена оценка ${data.value} по предмету ${subject?.name || 'Неизвестный предмет'}`,
      link: `/grades/${data.studentId}`,
      isRead: false,
      createdAt: Timestamp.now(),
    };
    await addDoc(notificationsRef, notificationData);

    // Create notification for the teacher
    const teacherNotificationData = {
      recipientId: data.teacherId,
      type: 'grade_added',
      title: 'Оценка добавлена',
      body: `Вы выставили оценку ${data.value} студенту ${student?.firstName} ${student?.lastName}`,
      link: `/grades/${data.studentId}`,
      isRead: false,
      createdAt: Timestamp.now(),
    };
    await addDoc(notificationsRef, teacherNotificationData);

    return docRef.id;
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error adding grade:', { error, gradeData: data });
    throw new GradeServiceError('Failed to add grade', 'ADD_GRADE_ERROR', { gradeData: data });
  }
};

export async function updateGrade(id: string, data: Partial<Omit<Grade, 'id' | 'createdAt' | 'updatedAt'>>) {
  try {
    checkDatabaseInitialized();
    const gradeRef = doc(db, GRADES_COLLECTION, id);
    await updateDoc(gradeRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error updating grade:', { error, gradeId: id, updateData: data });
    throw new GradeServiceError('Failed to update grade', 'UPDATE_GRADE_ERROR', { gradeId: id, updateData: data });
  }
}

export async function deleteGrade(id: string) {
  try {
    checkDatabaseInitialized();
    const gradeRef = doc(db, GRADES_COLLECTION, id);
    await deleteDoc(gradeRef);
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error deleting grade:', { error, gradeId: id });
    throw new GradeServiceError('Failed to delete grade', 'DELETE_GRADE_ERROR', { gradeId: id });
  }
}

// Export alias for backward compatibility
export const createGrade = addGrade; 