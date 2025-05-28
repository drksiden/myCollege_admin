import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import * as functions from 'firebase-functions';
import { CallableRequest } from 'firebase-functions/v2/https';

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

export const createUser = async (request: CallableRequest<CreateUserData>) => {
  try {
    const { data } = request;
    const { email, password, firstName, lastName, middleName, role, groupId } = data;

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role) {
      throw new Error('Missing required fields');
    }

    // Validate role
    if (!['student', 'teacher', 'admin'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Validate groupId for students
    if (role === 'student' && !groupId) {
      throw new Error('Group ID is required for students');
    }

    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${lastName} ${firstName} ${middleName || ''}`.trim(),
    });

    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      middleName: middleName || null,
      role,
      groupId: role === 'student' ? groupId : null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);

    return {
      success: true,
      message: 'User created successfully',
      data: userData
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError('internal', 'Failed to create user');
  }
};

export const deleteUser = async (request: { data: { uid: string }; auth?: { uid: string } }) => {
  const { data } = request;

  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Требуется аутентификация для удаления пользователей');
  }

  // Проверяем, что передан корректный ID пользователя
  if (!data.uid || typeof data.uid !== 'string' || data.uid.trim() === '') {
    throw new functions.https.HttpsError('invalid-argument', 'Необходимо указать корректный ID пользователя');
  }

  try {
    // Проверяем, что текущий пользователь - администратор
    const adminUser = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    if (!adminUser.exists || adminUser.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Только администраторы могут удалять пользователей');
    }

    // Получаем данные пользователя перед удалением
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(data.uid)
      .get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Пользователь не найден');
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
      .doc(data.uid)
      .delete();

    // Удаляем пользователя из Firebase Auth
    await admin.auth().deleteUser(data.uid);

    return { success: true, message: 'Пользователь успешно удален' };
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Ошибка при удалении пользователя');
  }
}; 