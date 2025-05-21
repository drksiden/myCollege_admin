// src/lib/firebase.ts (в вашем React-проекте)
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";

// Конфигурация Firebase из консоли
const firebaseConfig = {
  apiKey: "AIzaSyC1dGgjrn9_RWpFIf5wjHsX2wkUdKOnZ80",
  authDomain: "mycollege-8c0c5.firebaseapp.com",
  projectId: "mycollege-8c0c5",
  storageBucket: "mycollege-8c0c5.appspot.com",
  messagingSenderId: "109234567890",
  appId: "1:109234567890:web:1234567890abcdef"
};

// Инициализируем Firebase приложение
const app = initializeApp(firebaseConfig);

// Получаем экземпляры сервисов
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, "us-central1");
const storage = getStorage(app);

if (import.meta.env.DEV) {
  // Подключение к эмуляторам Firebase
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFunctionsEmulator(functions, "localhost", 5001);
  connectStorageEmulator(storage, "localhost", 9199);
}

export { auth, db, functions, storage, app }; // Экспортируем storage