import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";
import { onCall } from 'firebase-functions/v2/https';

// Инициализируем Admin SDK САМЫМ ПЕРВЫМ ДЕЙСТВИЕМ
admin.initializeApp();

// Теперь остальные импорты firebase-functions и ваших обработчиков
import { 
  createUserOnServer, 
  listUsers, 
  updateUser, 
  deleteUser,
  getUser 
} from "./userHandlers";
import { 
  createGroup, 
  listGroups, 
  updateGroup, 
  deleteGroup, 
  getGroup,
  addStudentToGroup,
  removeStudentFromGroup 
} from "./groupHandlers";

// Устанавливаем глобальные настройки
setGlobalOptions({ 
  region: "us-central1"
});

// Экспортируем все функции
export { 
  // User functions
  createUserOnServer, 
  listUsers, 
  updateUser, 
  deleteUser,
  getUser,
  
  // Group functions
  createGroup, 
  listGroups, 
  updateGroup, 
  deleteGroup, 
  getGroup,
  addStudentToGroup,
  removeStudentFromGroup 
};

export const getTeachers = onCall({
  cors: true
}, async (request) => {
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
    throw new Error('Error getting teachers');
  }
});

export const getGroups = onCall({
  cors: true
}, async (request) => {
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
    throw new Error('Error getting groups');
  }
});