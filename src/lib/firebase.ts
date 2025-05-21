// src/lib/firebase.ts (в вашем React-проекте)
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Firebase configuration keys.
// These should be stored in your .env.local file (see .env.local.example)
// Find these keys in your Firebase project console:
// Project settings > General > Your apps > Firebase SDK snippet > Config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Инициализируем Firebase приложение
const app = initializeApp(firebaseConfig);

// Получаем экземпляры сервисов
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");
const storage = getStorage(app);

// Connect to Firebase emulators if running in a development environment (e.g., localhost)
// Ensure your emulators are running for this to work!
// Firebase Auth Emulator: firebase emulators:start --only auth
// Firebase Firestore Emulator: firebase emulators:start --only firestore
// Firebase Functions Emulator: firebase emulators:start --only functions
// Firebase Storage Emulator: firebase emulators:start --only storage
if (import.meta.env.DEV && location.hostname === 'localhost') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
    console.log('Firebase Auth connected to local emulator on port 9099');
  } catch (error) {
    console.error('Error connecting Auth to emulator:', error);
  }

  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
    console.log('Firebase Firestore connected to local emulator on port 8080');
  } catch (error) {
    console.error('Error connecting Firestore to emulator:', error);
  }

  try {
    connectFunctionsEmulator(functions, "localhost", 5001);
    console.log('Firebase Functions connected to local emulator on port 5001');
  } catch (error) {
    console.error('Error connecting Functions to emulator:', error);
  }

  try {
    connectStorageEmulator(storage, "localhost", 9199);
    console.log('Firebase Storage connected to local emulator on port 9199');
  } catch (error) {
    console.error('Error connecting Storage to emulator:', error);
  }
} else {
  console.log('Firebase connected to production services. Emulators not used.');
}

export { auth, db, functions, storage, app };