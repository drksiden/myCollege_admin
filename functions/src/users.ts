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
  status?: string;
  experience?: string;
}

export const createUser = async (request: CallableRequest<CreateUserData>) => {
  try {
    console.log('Creating user with data:', request.data);
    
    // Проверяем аутентификацию
    if (!request.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Требуется аутентификация для создания пользователей');
    }

    // Проверяем, что текущий пользователь - администратор
    const adminUser = await admin.firestore()
      .collection('users')
      .doc(request.auth.uid)
      .get();

    if (!adminUser.exists || adminUser.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Только администраторы могут создавать пользователей');
    }

    const { data } = request;
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      middleName, 
      role, 
      groupId,
      iin,
      phone,
      address,
      birthDate,
      enrollmentDate
    } = data;

    console.log('Validating user data:', { email, role, iin });

    // Validate required fields
    if (!email || !password || !firstName || !lastName || !role || !iin) {
      throw new functions.https.HttpsError('invalid-argument', 'Отсутствуют обязательные поля');
    }

    // Validate role
    if (!['student', 'teacher', 'admin'].includes(role)) {
      throw new functions.https.HttpsError('invalid-argument', 'Некорректная роль');
    }

    // Validate groupId for students
    if (role === 'student' && !groupId) {
      throw new functions.https.HttpsError('invalid-argument', 'Для студента необходимо указать группу');
    }

    console.log('Creating user in Firebase Auth...');
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${lastName} ${firstName} ${middleName || ''}`.trim(),
    });

    console.log('User created in Auth:', userRecord.uid);

    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      middleName: middleName || null,
      role,
      iin,
      phone: phone || null,
      address: address || null,
      birthDate: birthDate || null,
      enrollmentDate: enrollmentDate || null,
      status: data.status || 'active',
      specialization: data.specialization || null,
      education: data.education || null,
      experience: data.experience || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    console.log('Creating user document in Firestore:', userData);

    // Add role-specific data
    if (role === 'student' && groupId) {
      Object.assign(userData, {
        studentDetails: {
          groupId,
          studentId: userRecord.uid,
        }
      });

      // Update group's student count
      const groupRef = admin.firestore().collection('groups').doc(groupId);
      await groupRef.update({
        studentCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await admin.firestore().collection('users').doc(userRecord.uid).set(userData);
    console.log('User document created in Firestore');

    return {
      success: true,
      message: 'Пользователь успешно создан',
      data: userData
    };
  } catch (error) {
    console.error('Error creating user:', error);
    
    // Handle specific Firebase Auth errors
    if (error instanceof Error) {
      if (error.message.includes('email-already-exists')) {
        throw new functions.https.HttpsError('already-exists', 'Пользователь с таким email уже существует.');
      }
      if (error.message.includes('invalid-password')) {
        throw new functions.https.HttpsError('invalid-argument', 'Некорректный пароль. Пароль должен содержать минимум 6 символов.');
      }
      if (error.message.includes('invalid-email')) {
        throw new functions.https.HttpsError('invalid-argument', 'Некорректный email.');
      }
    }
    
    throw new functions.https.HttpsError('internal', 'Ошибка при создании пользователя');
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