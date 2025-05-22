import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { createUser, deleteUser } from './users';

// Инициализируем Firebase Admin
admin.initializeApp();

// Экспортируем функции
export const createUserFunction = functions
  .region('europe-west3')
  .https.onCall(createUser);

export const deleteUserFunction = functions
  .region('europe-west3')
  .https.onCall(deleteUser);

// No cloud functions needed for client-only development