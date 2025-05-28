import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { createUser, deleteUser } from './users';

// Инициализируем Firebase Admin
admin.initializeApp();

// Экспортируем функции
export const createUserFunction = onCall({
  region: 'asia-southeast1',
  cors: true,
  maxInstances: 10,
}, createUser);

export const deleteUserFunction = onCall({
  region: 'asia-southeast1',
  cors: true,
  maxInstances: 10,
}, deleteUser);

// No cloud functions needed for client-only development