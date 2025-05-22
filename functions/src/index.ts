import * as admin from 'firebase-admin';
import { createUser, updateUser, deleteUser } from './users';
import { onNewsPublished } from './news';

admin.initializeApp();

export {
  createUser,
  updateUser,
  deleteUser,
  onNewsPublished,
};

// No cloud functions needed for client-only development