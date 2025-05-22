import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  iin: string;
  role: 'student' | 'teacher' | 'admin';
  enrollmentDate?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  specialization?: string;
  academicDegree?: string;
  groupId?: string;
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
      displayName: `${data.lastName} ${data.firstName} ${data.middleName || ''}`.trim(),
    });

    // Подготавливаем данные для Firestore
    const userData = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || '',
      iin: data.iin,
      role: data.role,
      birthDate: data.birthDate || null,
      phone: data.phone || null,
      address: data.address || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Добавляем специфичные поля в зависимости от роли
    if (data.role === 'student') {
      Object.assign(userData, {
        enrollmentDate: data.enrollmentDate || null,
        groupId: data.groupId || null,
      });
    } else if (data.role === 'teacher') {
      Object.assign(userData, {
        specialization: data.specialization || null,
        academicDegree: data.academicDegree || null,
      });
    }

    // Создаем документ пользователя в Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    // Если это студент и указана группа, обновляем счетчик студентов в группе
    if (data.role === 'student' && data.groupId) {
      const groupRef = admin.firestore().collection('groups').doc(data.groupId);
      await groupRef.update({
        studentCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return {
      uid: userRecord.uid,
      ...userData,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Ошибка при создании пользователя'
    );
  }
});

export const deleteUser = functions.https.onCall(async (request: functions.https.CallableRequest<{ userId: string }>) => {
  const { data } = request;

  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Требуется аутентификация для удаления пользователей'
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
      'Только администраторы могут удалять пользователей'
    );
  }

  try {
    // Получаем данные пользователя перед удалением
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(data.userId)
      .get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Пользователь не найден'
      );
    }

    const userData = userDoc.data();

    // Если это студент и у него есть группа, обновляем счетчик студентов
    if (userData?.role === 'student' && userData?.groupId) {
      const groupRef = admin.firestore().collection('groups').doc(userData.groupId);
      await groupRef.update({
        studentCount: FieldValue.increment(-1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Удаляем документ пользователя из Firestore
    await admin.firestore()
      .collection('users')
      .doc(data.userId)
      .delete();

    // Удаляем пользователя из Firebase Auth
    await admin.auth().deleteUser(data.userId);

    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Ошибка при удалении пользователя'
    );
  }
}); 