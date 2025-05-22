import * as admin from 'firebase-admin';
import { createUser } from './users';

admin.initializeApp();

export {
  createUser,
};

// No cloud functions needed for client-only development