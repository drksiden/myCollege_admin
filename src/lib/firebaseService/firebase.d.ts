import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';

declare module './firebase' {
  export const app: FirebaseApp;
  export const db: Firestore;
  export const auth: Auth;
} 