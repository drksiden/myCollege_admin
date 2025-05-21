import * as functions from "firebase-functions/v2";
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import "./firebase"; // Import Firebase initialization first

import { listUsers, createUserOnServer, getStudents, getTeachers, addStudentToGroup, removeStudentFromGroup } from "./userHandlers";
import { createGroup, listGroups, getGroup } from "./groupHandlers";
import * as scheduleHandlers from "./scheduleHandlers";
import * as subjectHandlers from "./subjectHandlers";

// Set global options for all functions
functions.setGlobalOptions({ 
  region: "us-central1"
});

// Export user functions
export const listUsersFunction = listUsers;
export const createUserOnServerFunction = createUserOnServer;
export const getStudentsFunction = getStudents;
export const getTeachersFunction = getTeachers;
export const addStudentToGroupFunction = addStudentToGroup;
export const removeStudentFromGroupFunction = removeStudentFromGroup;

// Export group functions
export const createGroupFunction = createGroup;
export const listGroupsFunction = listGroups;
export const getGroupFunction = getGroup;

// Export schedule functions
export const createScheduleFunction = scheduleHandlers.createSchedule;
export const updateScheduleFunction = scheduleHandlers.updateSchedule;
export const deleteScheduleFunction = scheduleHandlers.deleteSchedule;
export const getSchedulesFunction = scheduleHandlers.getSchedules;

// Export subject functions
export const createSubjectFunction = subjectHandlers.createSubject;
export const updateSubjectFunction = subjectHandlers.updateSubject;
export const deleteSubjectFunction = subjectHandlers.deleteSubject;
export const getSubjectsFunction = subjectHandlers.getSubjects;

// Функции для управления пользователями
export const createUser = onCall<{ email: string; password: string; userData: any }>(async (request) => {
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

export const getUserFunction = onCall<{ uid: string }>(async (request) => {
  // ... existing code ...
});

export const deleteUserFunction = onCall<{ uid: string }>(async (request) => {
  // ... existing code ...
});

export const updateUserFunction = onCall<{ uid: string; userData: any }>(async (request) => {
  // ... existing code ...
});

export const updateGroupFunction = onCall<{ groupId: string; groupData: any }>(async (request) => {
  // ... existing code ...
});

export const deleteGroupFunction = onCall<{ groupId: string }>(async (request) => {
  // ... existing code ...
});