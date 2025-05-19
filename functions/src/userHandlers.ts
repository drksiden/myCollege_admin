import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Инициализация Firebase Admin SDK, если еще не сделана в index.ts
// admin.initializeApp(); // Раскомментируйте, если это отдельный файл и admin не инициализирован
const db = admin.firestore();

// Рекомендуется установить регион, если еще не установлено глобально
const regionalFunctions = functions.region('europe-west1'); // Выберите ваш регион

/**
 * HTTP-вызываемая функция для получения списка пользователей.
 * Только администраторы могут вызывать эту функцию.
 * TODO: Добавить пагинацию и фильтрацию в будущем.
 */
export const listUsers = regionalFunctions.https.onCall(
  async (data, context) => {
    // 1. Проверка аутентификации и прав администратора
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'Пользователь не аутентифицирован.'
      );
    }

    const userDocRef = db.collection('users').doc(context.auth.uid);
    try {
      const userDoc = await userDocRef.get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        throw new functions.https.HttpsError(
          'permission-denied',
          'У пользователя нет прав администратора для выполнения этой операции.'
        );
      }
    } catch (error) {
      console.error('Ошибка при проверке прав администратора:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Ошибка при проверке прав доступа.'
      );
    }

    // 2. Получение списка пользователей из Firestore
    try {
      const usersSnapshot = await db
        .collection('users')
        .orderBy('lastName')
        .get(); // Сортируем по фамилии для примера

      const usersList: any[] = []; // Уточним тип позже, когда будет User тип из фронтенда
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id, // UID пользователя, который является ID документа
          firstName: userData.firstName,
          lastName: userData.lastName,
          patronymic: userData.patronymic || '',
          email: userData.email,
          role: userData.role,
          groupId: userData.groupId || null,
          groupName: userData.groupName || '',
          // createdAt: userData.createdAt?.toDate().toISOString(), // Пример преобразования Timestamp
          // profilePictureUrl: userData.profilePictureUrl || null,
        });
      });

      return {
        success: true,
        users: usersList,
      };
    } catch (error) {
      console.error('Ошибка при получении списка пользователей:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Произошла ошибка при получении списка пользователей.'
      );
    }
  }
);
