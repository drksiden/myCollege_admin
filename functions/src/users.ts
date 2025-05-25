import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  iin?: string;
  role: 'student' | 'teacher' | 'admin';
  enrollmentDate?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  specialization?: string;
  academicDegree?: string;
  groupId?: string;
  education?: string;
}

export const createUser = async (request: { data: CreateUserData; auth?: { uid: string } }) => {
  console.log('createUser function called with request:', request);
  const { data } = request;

  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    console.error('Unauthenticated request');
    throw new functions.https.HttpsError('unauthenticated', 'Требуется аутентификация для создания пользователей');
  }

  console.log('Authenticated user:', request.auth.uid);

  // Проверяем, что текущий пользователь - администратор
  const adminUser = await admin.firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  console.log('Admin user data:', adminUser.data());

  if (!adminUser.exists || adminUser.data()?.role !== 'admin') {
    console.error('User is not an admin');
    throw new functions.https.HttpsError('permission-denied', 'Только администраторы могут создавать пользователей');
  }

  try {
    console.log('Creating user in Firebase Auth with data:', data);
    // Создаем пользователя в Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: data.email,
      password: data.password,
      displayName: `${data.lastName} ${data.firstName} ${data.middleName || ''}`.trim(),
    });

    console.log('User created in Auth:', userRecord.uid);

    // Подготавливаем данные для Firestore
    const userData = {
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      middleName: data.middleName || '',
      iin: data.iin || '',
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
        education: data.education || null,
      });
    }

    console.log('Creating user document in Firestore with data:', userData);

    // Создаем документ пользователя в Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    console.log('User document created in Firestore');

    // Если это студент и указана группа, обновляем счетчик студентов в группе
    if (data.role === 'student' && data.groupId) {
      console.log('Updating student count in group:', data.groupId);
      const groupRef = admin.firestore().collection('groups').doc(data.groupId);
      await groupRef.update({
        studentCount: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      });
      console.log('Group updated successfully');
    }

    return {
      success: true,
      message: 'Пользователь успешно создан',
      data: {
        uid: userRecord.uid,
        ...userData,
      }
    };
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'Пользователь с таким email уже существует.');
    }
    if (error.code === 'auth/invalid-password') {
      throw new functions.https.HttpsError('invalid-argument', 'Пароль слишком простой или некорректный.');
    }
    if (error.code === 'auth/invalid-email') {
      throw new functions.https.HttpsError('invalid-argument', 'Некорректный email.');
    }
    throw new functions.https.HttpsError('internal', error.message || 'Ошибка при создании пользователя');
  }
};

export const deleteUser = async (request: { data: { userId: string }; auth?: { uid: string } }) => {
  const { data } = request;

  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    throw new Error('Требуется аутентификация для удаления пользователей');
  }

  // Проверяем, что текущий пользователь - администратор
  const adminUser = await admin.firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  if (!adminUser.exists || adminUser.data()?.role !== 'admin') {
    throw new Error('Только администраторы могут удалять пользователей');
  }

  try {
    // Получаем данные пользователя перед удалением
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(data.userId)
      .get();

    if (!userDoc.exists) {
      throw new Error('Пользователь не найден');
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
    throw new Error('Ошибка при удалении пользователя');
  }
};

// Получение списка преподавателей
export const getTeachers = async (request: { auth?: { uid: string } }) => {
  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    throw new Error('Требуется аутентификация');
  }

  try {
    const teachersSnapshot = await admin.firestore()
      .collection('users')
      .where('role', '==', 'teacher')
      .get();

    return teachersSnapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting teachers:', error);
    throw new Error('Ошибка при получении списка преподавателей');
  }
}; 