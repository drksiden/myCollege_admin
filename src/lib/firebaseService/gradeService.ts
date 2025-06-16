import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Grade } from '@/types';
import { getUsers } from './userService';
import { sendChatNotification } from './notificationService';

const GRADES_COLLECTION = 'journalEntries';

export interface GetGradesOptions {
  studentIds?: string[];
  journalId?: string;
  semesterId?: string;
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

export async function getGrades(options: GetGradesOptions = {}): Promise<Grade[]> {
  try {
    const { studentIds, journalId, semesterId } = options;
    const gradesRef = collection(db, GRADES_COLLECTION);
    const conditions = [];

    if (studentIds && studentIds.length > 0) {
      conditions.push(where('studentId', 'in', studentIds));
    }
    if (journalId) {
      conditions.push(where('journalId', '==', journalId));
    }
    if (semesterId) {
      conditions.push(where('semesterId', '==', semesterId));
    }
    // Добавляем условие для фильтрации только записей с оценками
    conditions.push(where('grade', '!=', null));

    const q = query(gradesRef, ...conditions);
    const querySnapshot = await getDocs(q);
    
    console.log('Query conditions:', conditions);
    const grades = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Grade[];
    
    console.log('Found grades:', grades);
    return grades;
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error getting grades:', error);
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
    const q = query(gradesRef, where('journalId', '==', subjectId));
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

export async function createGrade(data: Omit<Grade, "id" | "createdAt" | "updatedAt">): Promise<Grade> {
  try {
    const gradeData = {
      ...data,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, GRADES_COLLECTION), gradeData);
    const newGrade = { id: docRef.id, ...gradeData } as Grade;

    // Отправляем уведомление студенту
    const { users: students } = await getUsers({ role: 'student' });
    const student = students.find(s => s.uid === data.studentId);
    if (student) {
      await sendChatNotification({
        userId: data.studentId,
        title: 'Новая оценка',
        message: `Вам выставлена оценка ${data.grade} по предмету ${data.journalId}`,
        chatId: 'grades',
        senderId: data.teacherId,
        senderName: 'Система'
      });
    }

    // Отправляем уведомление преподавателю
    const { users: teachers } = await getUsers({ role: 'teacher' });
    const teacher = teachers.find(t => t.uid === data.teacherId);
    if (teacher) {
      await sendChatNotification({
        userId: data.teacherId,
        title: 'Оценка выставлена',
        message: `Вы выставили оценку ${data.grade} студенту ${student?.firstName} ${student?.lastName}`,
        chatId: 'grades',
        senderId: 'system',
        senderName: 'Система'
      });
    }

    return newGrade;
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error creating grade:', error);
    throw new GradeServiceError('Failed to create grade', 'CREATE_GRADE_ERROR', { gradeData: data });
  }
}

export async function updateGrade(id: string, data: Partial<Grade>): Promise<void> {
  try {
    const gradeRef = doc(db, GRADES_COLLECTION, id);
    await updateDoc(gradeRef, {
      ...data,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error updating grade:', error);
    throw new GradeServiceError('Failed to update grade', 'UPDATE_GRADE_ERROR', { gradeId: id, updateData: data });
  }
}

export async function deleteGrade(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, GRADES_COLLECTION, id));
  } catch (error) {
    if (error instanceof GradeServiceError) {
      throw error;
    }
    console.error('Error deleting grade:', { error, gradeId: id });
    throw new GradeServiceError('Failed to delete grade', 'DELETE_GRADE_ERROR', { gradeId: id });
  }
} 