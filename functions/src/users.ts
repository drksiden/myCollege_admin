import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'teacher' | 'admin';
}

export const createUser = functions.https.onCall(async (request: functions.https.CallableRequest<CreateUserData>) => {
  const { data } = request;

  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Требуется аутентификация для создания пользователей'
    );
  }

  // Проверяем, что текущий пользователь - администратор
  const adminUser = await admin.firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  if (!adminUser.exists || adminUser.data()?.role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Только администраторы могут создавать пользователей'
    );
  }

  try {
    // Создаем пользователя в Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: `${data.firstName} ${data.lastName}`,
    });

    // Создаем документ пользователя в Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Ошибка при создании пользователя'
    );
  }
}); 