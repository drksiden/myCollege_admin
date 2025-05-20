import * as admin from 'firebase-admin';
import {
  onCall,
  HttpsError,
  CallableRequest,
} from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

setGlobalOptions({ region: 'asia-northeast1' });

interface UserData {
  id: string;
  firstName?: string;
  lastName?: string;
  patronymic?: string;
  email?: string;
  role?: 'student' | 'teacher' | 'admin';
  groupId?: string | null;
  groupName?: string;
}

export const listUsers = onCall(
  async (
    request: CallableRequest<unknown>
  ): Promise<{ success: boolean; users: UserData[]; message?: string }> => {
    // 1. Проверка аутентификации и прав администратора
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Пользователь не аутентифицирован.'
      );
    }

    const userDocRef = db.collection('users').doc(request.auth.uid);
    try {
      const userDoc = await userDocRef.get();
      const userDataFromDb = userDoc.data();

      if (
        !userDoc.exists ||
        !userDataFromDb ||
        userDataFromDb.role !== 'admin'
      ) {
        throw new HttpsError(
          'permission-denied',
          'У пользователя нет прав администратора для выполнения этой операции.'
        );
      }
    } catch (error) {
      console.error('Ошибка при проверке прав администратора:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Ошибка при проверке прав доступа.');
    }

    // 2. Получение списка пользователей из Firestore
    try {
      const usersSnapshot = await db
        .collection('users')
        .orderBy('lastName')
        .get();

      const usersList: UserData[] = [];
      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        usersList.push({
          id: doc.id,
          firstName: userData.firstName,
          lastName: userData.lastName,
          patronymic: userData.patronymic || '',
          email: userData.email,
          role: userData.role,
          groupId: userData.groupId || null,
          groupName: userData.groupName || '',
        });
      });

      return {
        success: true,
        users: usersList,
      };
    } catch (error) {
      console.error('Ошибка при получении списка пользователей:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError(
        'internal',
        'Произошла ошибка при получении списка пользователей.'
      );
    }
  }
);

interface CreateUserData {
  email: string;
  password?: string; // Пароль может быть опциональным, если генерируется или другой метод входа
  firstName: string;
  lastName: string;
  patronymic?: string;
  role: 'student' | 'teacher' | 'admin';
  groupId?: string | null; // Для студентов
  groupName?: string; // Для студентов (денормализовано)
  // Дополнительные поля для teacherDetails, если роль "teacher"
  teacherDetails?: {
    department?: string;
    qualification?: string;
  };
}

export const createUserOnServer = onCall(
  async (
    request: CallableRequest<CreateUserData>
  ): Promise<{ success: boolean; uid?: string; message: string }> => {
    // 1. Проверка аутентификации и прав администратора
    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Пользователь не аутентифицирован.'
      );
    }

    const adminUserDocRef = admin
      .firestore()
      .collection('users')
      .doc(request.auth.uid);
    try {
      const adminUserDoc = await adminUserDocRef.get();
      const adminUserData = adminUserDoc.data();
      if (
        !adminUserDoc.exists ||
        !adminUserData ||
        adminUserData.role !== 'admin'
      ) {
        throw new HttpsError('permission-denied', 'Нет прав администратора.');
      }
    } catch (error) {
      console.error('Ошибка проверки прав (createUser):', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Ошибка проверки прав (createUser).');
    }

    const data = request.data;

    // 2. Валидация входных данных
    if (!data.email || !data.firstName || !data.lastName || !data.role) {
      throw new HttpsError(
        'invalid-argument',
        'Отсутствуют обязательные поля: email, firstName, lastName, role.'
      );
    }
    if (data.role === 'student' && (!data.groupId || !data.groupName)) {
      throw new HttpsError(
        'invalid-argument',
        'Для студента должны быть указаны groupId и groupName.'
      );
    }
    // TODO: Добавить более строгую валидацию email, пароля (если есть), длины полей и т.д.
    // Например, пароль должен быть минимум 6 символов, если он передается
    if (data.password && data.password.length < 6) {
      throw new HttpsError(
        'invalid-argument',
        'Пароль должен содержать не менее 6 символов.'
      );
    }

    let newUserRecord;
    try {
      // 3. Создание пользователя в Firebase Authentication
      const userCreationRequest: admin.auth.CreateRequest = {
        email: data.email,
        emailVerified: true, // Можно установить true, так как создается админом
        displayName: `${data.lastName} ${data.firstName}`,
      };
      // Пароль добавляем, только если он передан.
      // Если пароль не передан, пользователь сможет войти через "сброс пароля" или другой метод.
      if (data.password) {
        userCreationRequest.password = data.password;
      }

      newUserRecord = await admin.auth().createUser(userCreationRequest);

      // 4. Подготовка данных для Firestore
      const userFirestoreData: any = {
        // Используем any временно, лучше создать интерфейс
        firstName: data.firstName,
        lastName: data.lastName,
        patronymic: data.patronymic || '',
        email: data.email, // Дублируем email для удобства запросов к Firestore
        role: data.role,
        profilePictureUrl: null, // Или URL по умолчанию
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (data.role === 'student') {
        userFirestoreData.groupId = data.groupId;
        userFirestoreData.groupName = data.groupName;
        // TODO: Обновить studentCount в соответствующей группе
      } else if (data.role === 'teacher' && data.teacherDetails) {
        userFirestoreData.teacherDetails = data.teacherDetails;
      }

      // 5. Сохранение данных пользователя в Firestore с UID из Auth как ID документа
      await admin
        .firestore()
        .collection('users')
        .doc(newUserRecord.uid)
        .set(userFirestoreData);

      return {
        success: true,
        uid: newUserRecord.uid,
        message: `Пользователь ${data.role} успешно создан.`,
      };
    } catch (error: any) {
      console.error('Ошибка при создании пользователя:', error);
      // Если пользователь был создан в Auth, но произошла ошибка при записи в Firestore,
      // нужно откатить создание пользователя в Auth для консистентности (или реализовать retry-логику).
      // Это продвинутый сценарий. Пока что просто удалим его из Auth, если он был создан.
      if (newUserRecord && newUserRecord.uid) {
        try {
          await admin.auth().deleteUser(newUserRecord.uid);
          console.log(
            `Пользователь ${newUserRecord.uid} удален из Auth из-за ошибки Firestore.`
          );
        } catch (deleteError) {
          console.error(
            `Критическая ошибка: не удалось удалить пользователя ${newUserRecord.uid} из Auth после ошибки Firestore:`,
            deleteError
          );
          // Здесь нужна логика для администратора, чтобы вручную исправить несоответствие
        }
      }

      if (error instanceof HttpsError) throw error;
      // Преобразование ошибок Firebase Auth в HttpsError
      if (error.code === 'auth/email-already-exists') {
        throw new HttpsError(
          'already-exists',
          'Пользователь с таким email уже существует.'
        );
      }
      if (error.code === 'auth/invalid-password') {
        throw new HttpsError(
          'invalid-argument',
          'Некорректный пароль. Он должен быть строкой не менее 6 символов.'
        );
      }
      throw new HttpsError(
        'internal',
        error.message ||
          'Произошла неизвестная ошибка при создании пользователя.'
      );
    }
  }
);
