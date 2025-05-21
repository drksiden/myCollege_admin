// src/lib/firebase.ts (в вашем React-проекте)
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage"; // Добавили для Storage

// Ваша конфигурация Firebase из консоли (для "боевого" окружения)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, // Убедитесь, что это значение есть в .env
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Инициализируем Firebase приложение
const app = initializeApp(firebaseConfig);

// Получаем экземпляры сервисов
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app,"us-central1"); // Укажите регион, если все ваши функции в одном регионе
                                                             // или если вы хотите явно указать регион для вызова функций.
                                                             // Если функции в разных регионах, то регион указывается при вызове конкретной функции.
                                                             // Для эмулятора это обычно не так критично, как для "боевого" окружения.
const storage = getStorage(app); // Инициализируем Storage

// Подключаемся к эмуляторам ТОЛЬКО в режиме разработки
if (import.meta.env.DEV) { // Vite предоставляет import.meta.env.DEV
  console.log("Подключение к Firebase Emulators...");

  // Используйте хост '127.0.0.1' вместо 'localhost', чтобы избежать возможных проблем с IPv6/IPv4
  // Порты из вашего вывода firebase emulators:start:
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  // Для других эмуляторов, если вы их используете (например, Pub/Sub), также есть свои connect...Emulator функции.

  console.log("Auth эмулятор подключен к http://127.0.0.1:9099");
  console.log("Functions эмулятор подключен к http://127.0.0.1:5001");
  console.log("Firestore эмулятор подключен к http://127.0.0.1:8080");
  console.log("Storage эмулятор подключен к http://127.0.0.1:9199");
}

export { auth, db, functions, storage, app }; // Экспортируем storage