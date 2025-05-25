import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { createUser, deleteUser, getTeachers } from './users';
import { createNews, updateNews, deleteNews } from './news';

// Инициализируем Firebase Admin
admin.initializeApp();

// Экспортируем функции
export const createUserFunction = onCall({
  region: 'asia-southeast1'
}, createUser);

export const deleteUserFunction = onCall({
  region: 'asia-southeast1'
}, deleteUser);

export const getTeachersFunction = onCall({
  region: 'asia-southeast1'
}, getTeachers);

export const createNewsFunction = onCall({
  region: 'asia-southeast1'
}, createNews);

export const updateNewsFunction = onCall({
  region: 'asia-southeast1'
}, updateNews);

export const deleteNewsFunction = onCall({
  region: 'asia-southeast1'
}, deleteNews);

// No cloud functions needed for client-only development