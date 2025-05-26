import { db } from './firebase';
import { createUserDocument } from './userService';
import { createSubject } from './subjectService';
import { createGroup } from './groupService';
import { createTeacherProfile } from './teacherService';
import { createStudentProfile } from './studentService';
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
    const admin = {
      email: adminData.email,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
      role: 'admin',
    } as const;
    await createUserDocument(db, adminData.email, admin);

    // 2. Создаем базовые предметы
    const subjects = [
      {
        name: 'Математика',
        description: 'Базовый курс математики',
        credits: 6,
        hours: 144,
        hoursPerWeek: 4,
        hoursPerSemester: 72,
        type: 'lecture' as const,
        groups: [],
      },
      {
        name: 'Физика',
        description: 'Базовый курс физики',
        credits: 5,
        hours: 120,
        hoursPerWeek: 3,
        hoursPerSemester: 60,
        type: 'lecture' as const,
        groups: [],
      },
      {
        name: 'Информатика',
        description: 'Базовый курс информатики',
        credits: 4,
        hours: 96,
        hoursPerWeek: 2,
        hoursPerSemester: 48,
        type: 'lecture' as const,
        groups: [],
      },
    ];

    for (const subject of subjects) {
      await createSubject(db, subject);
    }

    // 3. Создаем базовые группы
    const groups = [
      {
        name: 'Группа 1',
        year: 1,
        specialization: 'Информационные технологии',
        curatorId: '',
        course: 1,
        students: [],
        scheduleId: '',
      },
      {
        name: 'Группа 2',
        year: 1,
        specialization: 'Информационные технологии',
        curatorId: '',
        course: 1,
        students: [],
        scheduleId: '',
      },
    ];

    for (const group of groups) {
      await createGroup(group);
    }

    // 4. Создаем тестового преподавателя
    const teacher = {
      userId: 'teacher1',
      firstName: 'Иван',
      lastName: 'Иванов',
      specialization: 'Математика',
      experience: 5,
      education: 'Высшее',
      groups: [],
      subjects: [],
    };

    await createTeacherProfile(db, teacher);

    // 5. Создаем тестового студента
    const student = {
      userId: 'student1',
      groupId: '',
      studentCardId: 'ST001',
      enrollmentDate: Timestamp.now(),
      dateOfBirth: Timestamp.now(),
      status: 'active' as const,
      firstName: 'Иван',
      lastName: 'Иванов',
      phone: '',
      address: '',
    };

    await createStudentProfile(student);

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