import * as // или const functions = require("firebase-functions");
functions from 'firebase-functions';
import * as // или const admin = require("firebase-admin");
admin from 'firebase-admin';

import { listUsers } from './userHandlers';

// Инициализация Firebase Admin SDK (один раз в начале файла)
admin.initializeApp();
const db = admin.firestore();

// Рекомендуется установить регион для функций
const regionalFunctions = functions.region('europe-west1'); // Выберите подходящий регион

/**
 * HTTP-функция для создания новой учебной группы.
 * Ожидает в теле запроса (POST) данные группы.
 */
export const createGroup = regionalFunctions.https.onCall(
  async (data, context) => {
    // 1. Аутентификация и Авторизация (Критически важно!)
    // Убедимся, что запрос пришел от аутентифицированного пользователя
    // и что этот пользователь имеет права администратора.
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Пользователь не аутентифицирован.'
      );
    }

    // Пример проверки роли администратора (вы можете хранить кастомные клеймы
    // или проверять роль в Firestore)
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'У пользователя нет прав для выполнения этой операции.'
      );
    }

    // 2. Валидация входных данных (data)
    // Например, убедимся, что обязательные поля name, course, specialty присутствуют.
    if (!data.name || !data.course || !data.specialty) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Отсутствуют обязательные поля: name, course, specialty.'
      );
    }

    try {
      // 3. Подготовка данных для сохранения
      const newGroupData = {
        name: data.name, // String
        course: Number(data.course), // Number
        specialty: data.specialty, // String
        curatorId: data.curatorId || null, // String (UID учителя)
        curatorName: data.curatorName || '', // String (Денормализованное ФИО)
        subjects: data.subjects || [], // List<Map<String, dynamic>>
        studentCount: 0, // Инициализируем нулем
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // TODO: Дополнительная логика, если curatorId указан,
      //       проверить, что такой учитель существует и его ФИО (curatorName) корректно.
      // TODO: Валидация структуры subjects, если они передаются сразу.

      // 4. Сохранение в Firestore
      const groupRef = await db.collection('groups').add(newGroupData);

      return {
        message: 'Группа успешно создана!',
        groupId: groupRef.id,
        data: newGroupData, // Можно вернуть созданные данные
      };
    } catch (error) {
      console.error('Ошибка при создании группы:', error);
      throw new functions.https.HttpsError(
        'unknown',
        'Произошла ошибка при создании группы.',
        error
      );
    }
  }
);

export { listUsers };
