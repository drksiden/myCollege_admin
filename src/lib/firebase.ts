// src/lib/firebase.ts (в вашем React-проекте)
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, enableIndexedDbPersistence } from "firebase/firestore";
import { getFunctions } from "firebase/functions";
import { getStorage } from "firebase/storage";

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

// Включаем офлайн-режим для Firestore
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
  } else if (err.code === 'unimplemented') {
    console.warn('The current browser does not support persistence.');
  }
});

export { auth, db, functions, storage, app }; // Экспортируем storage