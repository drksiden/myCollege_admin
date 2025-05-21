import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from 'firebase-functions/v2/https';

// Инициализируем Admin SDK САМЫМ ПЕРВЫМ ДЕЙСТВИЕМ
admin.initializeApp();

// Устанавливаем глобальные настройки
setGlobalOptions({ 
  region: "us-central1"
});

// Импортируем функции из обработчиков
import * as userHandlers from "./userHandlers";
import * as groupHandlers from "./groupHandlers";
import * as scheduleHandlers from "./scheduleHandlers";
import * as subjectHandlers from "./subjectHandlers";

// Реэкспортируем все функции
export const createUserOnServer = userHandlers.createUserOnServer;
export const listUsers = userHandlers.listUsers;
export const updateUser = userHandlers.updateUser;
export const deleteUser = userHandlers.deleteUser;
export const getUser = userHandlers.getUser;

export const createGroup = groupHandlers.createGroup;
export const listGroups = groupHandlers.listGroups;
export const updateGroup = groupHandlers.updateGroup;
export const deleteGroup = groupHandlers.deleteGroup;
export const getGroup = groupHandlers.getGroup;
export const addStudentToGroup = groupHandlers.addStudentToGroup;
export const removeStudentFromGroup = groupHandlers.removeStudentFromGroup;

// Экспортируем функции расписания
export const createScheduleItem = scheduleHandlers.createScheduleItem;
export const updateScheduleItem = scheduleHandlers.updateScheduleItem;
export const deleteScheduleItem = scheduleHandlers.deleteScheduleItem;
export const getSchedule = scheduleHandlers.getSchedule;

// Экспортируем функции для работы с предметами
export const getSubjects = subjectHandlers.getSubjects;
export const createSubject = subjectHandlers.createSubject;
export const updateSubject = subjectHandlers.updateSubject;
export const deleteSubject = subjectHandlers.deleteSubject;

// Функции для управления пользователями
export const createUser = onCall(async (request) => {
  try {
    const { email, password, userData } = request.data;
    
    // Создаем пользователя в Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: true,
      displayName: `${userData.lastName} ${userData.firstName} ${userData.patronymic || ''}`.trim()
    });

    // Формируем полное имя
    const fullName = `${userData.lastName} ${userData.firstName} ${userData.patronymic || ''}`.trim();

    // Добавляем данные пользователя в Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      ...userData,
      name: fullName,
      uid: userRecord.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, uid: userRecord.uid };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new Error('Failed to create user');
  }
});

export const getTeachers = onCall(async () => {
  try {
    const teachersSnapshot = await admin.firestore()
      .collection('users')
      .where('role', '==', 'teacher')
      .get();

    const teachers = teachersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { teachers };
  } catch (error) {
    console.error('Error getting teachers:', error);
    throw new Error('Failed to get teachers');
  }
});

export const getStudents = onCall(async () => {
  try {
    const studentsSnapshot = await admin.firestore()
      .collection('users')
      .where('role', '==', 'student')
      .get();

    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { students };
  } catch (error) {
    console.error('Error getting students:', error);
    throw new Error('Failed to get students');
  }
});

export const getGroups = onCall(async () => {
  try {
    const groupsSnapshot = await admin.firestore()
      .collection('groups')
      .get();

    const groups = groupsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { groups };
  } catch (error) {
    console.error('Error getting groups:', error);
    throw new Error('Failed to get groups');
  }
});