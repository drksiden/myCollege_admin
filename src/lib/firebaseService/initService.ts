import { db } from './firebase';
import { createUserDocument } from './userService';
import { createSubject } from './subjectService';
import { createGroup } from './groupService';
import { createTeacherProfile } from './teacherService';
import { createStudentProfile } from './studentService';
import type { User, Subject, Group, Teacher, Student } from '@/types';
import { collection, query, where, limit, getDocs, Timestamp } from 'firebase/firestore';

/**
 * Инициализирует базу данных начальными данными
 * @param adminData Данные администратора
 * @returns Promise<void>
 */
export const initializeDatabase = async (adminData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<void> => {
  try {
    // 1. Создаем администратора
    const admin: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      uid: adminData.email, // Временное решение, в реальном приложении это будет UID из Firebase Auth
      email: adminData.email,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      role: 'admin',
    };
    await createUserDocument(db, adminData.email, admin);

    // 2. Создаем базовые предметы
    const subjects: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Математика',
        description: 'Базовый курс математики',
        credits: 6,
        hoursPerSemester: 72,
        hours: 144,
        type: 'lecture',
      },
      {
        name: 'Физика',
        description: 'Базовый курс физики',
        credits: 5,
        hoursPerSemester: 60,
        hours: 120,
        type: 'lecture',
      },
      {
        name: 'Информатика',
        description: 'Базовый курс информатики',
        credits: 4,
        hoursPerSemester: 48,
        hours: 96,
        type: 'practice',
      },
    ];

    for (const subject of subjects) {
      await createSubject(db, subject);
    }

    // 3. Создаем базовые группы
    const groups: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Группа 1',
        year: 1,
        specialization: 'Информационные технологии',
        students: [],
        scheduleId: '', // Будет заполнено после создания расписания
      },
      {
        name: 'Группа 2',
        year: 1,
        specialization: 'Информационные технологии',
        students: [],
        scheduleId: '', // Будет заполнено после создания расписания
      },
    ];

    for (const group of groups) {
      await createGroup(db, group);
    }

    // 4. Создаем тестового преподавателя
    const teacher: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: 'teacher1', // В реальном приложении это будет UID из Firebase Auth
      firstName: 'Иван',
      lastName: 'Иванов',
      email: 'teacher@example.com',
      specialization: 'Математика',
      experience: 5,
      education: 'Высшее',
      subjects: [], // Будет заполнено после создания предметов
      groups: [], // Будет заполнено после создания групп
    };

    await createTeacherProfile(db, teacher);

    // 5. Создаем тестового студента
    const student: Omit<Student, 'id' | 'createdAt' | 'updatedAt'> = {
      userId: 'student1', // В реальном приложении это будет UID из Firebase Auth
      groupId: '', // Будет заполнено после создания групп
      studentCardId: 'ST001',
      enrollmentDate: Timestamp.now(),
      status: 'active',
    };

    await createStudentProfile(db, student);

    console.log('База данных успешно инициализирована');
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
    throw error;
  }
};

/**
 * Проверяет, инициализирована ли база данных
 * @returns Promise<boolean>
 */
export const isDatabaseInitialized = async (): Promise<boolean> => {
  try {
    // Проверяем наличие хотя бы одного администратора
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('role', '==', 'admin'), limit(1));
    const querySnapshot = await getDocs(q);

    return !querySnapshot.empty;
  } catch (error) {
    console.error('Ошибка при проверке инициализации базы данных:', error);
    return false;
  }
}; 