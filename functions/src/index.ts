import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { createUser as createUserHandler, deleteUser as deleteUserHandler } from './users';

// Инициализируем Firebase Admin
admin.initializeApp();

// Экспортируем функции
export const createUser = onCall({
  region: 'asia-southeast1',
  cors: true,
  maxInstances: 10,
}, createUserHandler);

export const deleteUser = onCall({
  region: 'asia-southeast1',
  cors: true,
  maxInstances: 10,
}, deleteUserHandler);

// No cloud functions needed for client-only development