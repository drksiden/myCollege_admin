import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  middleName?: string; // Отчество
  iin: string; // ИИН
  role: 'student' | 'teacher' | 'admin';
  enrollmentDate?: string; // Дата зачисления (для студентов)
  birthDate?: string; // Дата рождения
  phone?: string; // Телефон
  address?: string; // Адрес
  specialization?: string; // Специализация (для преподавателей)
  academicDegree?: string; // Ученая степень (для преподавателей)
  groupId?: string; // ID группы (для студентов)
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

    // Используем batch для атомарного создания пользователя и связанных данных
    const batch = admin.firestore().batch();
    const userRef = admin.firestore().collection('users').doc(userRecord.uid);
    
    // Cast `userData` to `any` or a more specific type for flexibility in adding role-specific fields.
    const finalUserData: any = { ...userData }; 

    let studentProfileId: string | undefined = undefined;
    let teacherProfileId: string | undefined = undefined;

    if (data.role === 'student') {
      finalUserData.enrollmentDate = data.enrollmentDate || null;
      // finalUserData.groupId = data.groupId || null; // Retained top-level groupId on User for now, but studentDetails also has it.

      const studentCardId = data.iin + '_card'; 

      const studentProfileData = {
        userId: userRecord.uid,
        groupId: data.groupId || null,
        studentCardId: studentCardId,
        enrollmentDate: data.enrollmentDate ? admin.firestore.Timestamp.fromDate(new Date(data.enrollmentDate)) : FieldValue.serverTimestamp(),
        status: 'active' as const,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      const studentProfileRef = admin.firestore().collection('students').doc(); 
      batch.set(studentProfileRef, studentProfileData);
      studentProfileId = studentProfileRef.id;

      finalUserData.studentId = studentProfileId; // Link to Student document
      finalUserData.studentDetails = { // Denormalized details on User doc
        groupId: data.groupId || null,
        studentId: studentCardId, 
      };
      if (data.groupId) { // Ensure top-level groupId is also set on user doc if provided
        finalUserData.groupId = data.groupId;
      }


      if (data.groupId) {
        const groupRef = admin.firestore().collection('groups').doc(data.groupId);
        batch.update(groupRef, {
          studentCount: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    } else if (data.role === 'teacher') {
      const teacherProfileRef = admin.firestore().collection('teachers').doc();
      teacherProfileId = teacherProfileRef.id;

      const teacherProfileData = {
        userId: userRecord.uid,
        specialization: data.specialization || null,
        academicDegree: data.academicDegree || null,
        subjects: [], 
        groups: [],   
        experience: 0, 
        education: "", 
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        middleName: data.middleName || '',
        phone: data.phone || null, 
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      batch.set(teacherProfileRef, teacherProfileData);

      finalUserData.teacherId = teacherProfileId; // Link to Teacher document
      finalUserData.teacherDetails = { // Denormalized details on User doc
        department: data.specialization || null, 
        qualification: data.academicDegree || null,
      };
      // Top-level specialization and academicDegree are removed from finalUserData for teachers
      // as they are now in teacherDetails and the teacher profile.
      delete finalUserData.specialization;
      delete finalUserData.academicDegree;
    }
    
    // Set the final user data (including role-specific links/details if any)
    batch.set(userRef, finalUserData);

    await batch.commit(); 

    return {
      uid: userRecord.uid,
      ...finalUserData, 
    };
  } catch (error) {
    console.error('Error creating user:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Ошибка при создании пользователя'
    );
  }
});

interface UpdateUserData {
  userId: string;
  // All fields from CreateUserData are optional here, except for userId
  email?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  iin?: string;
  role?: 'student' | 'teacher' | 'admin';
  enrollmentDate?: string;
  birthDate?: string;
  phone?: string;
  address?: string;
  specialization?: string; // for teachers
  academicDegree?: string; // for teachers
  groupId?: string; // for students
  studentId?: string; // Student Card ID, if provided for update
}

export const updateUser = functions.https.onCall(async (request: functions.https.CallableRequest<UpdateUserData>) => {
  const { data } = request;
  const { userId, ...updateData } = data;

  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }

  const adminUserDoc = await admin.firestore().collection('users').doc(request.auth.uid).get();
  if (!adminUserDoc.exists || adminUserDoc.data()?.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin privileges required.');
  }

  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'User ID is required.');
  }

  const userRef = admin.firestore().collection('users').doc(userId);
  const batch = admin.firestore().batch();

  try {
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found.');
    }
    const oldUserData = userDoc.data() as any; // Cast to any for easier field access

    // Update Firebase Auth email if necessary
    if (updateData.email && updateData.email !== oldUserData.email) {
      try {
        await admin.auth().updateUser(userId, { email: updateData.email });
      } catch (authError: any) {
        console.error('Error updating Firebase Auth email:', authError);
        throw new functions.https.HttpsError('internal', `Failed to update email: ${authError.message}`);
      }
    }
    // Consider updating displayName in Auth if name fields change
    if (updateData.firstName || updateData.lastName || updateData.middleName) {
        const newDisplayName = `${updateData.lastName || oldUserData.lastName} ${updateData.firstName || oldUserData.firstName} ${updateData.middleName || oldUserData.middleName || ''}`.trim();
        const oldDisplayName = `${oldUserData.lastName} ${oldUserData.firstName} ${oldUserData.middleName || ''}`.trim();
        if (newDisplayName !== oldDisplayName) {
            try {
                await admin.auth().updateUser(userId, { displayName: newDisplayName });
            } catch (authError: any) {
                console.warn('Warning: Failed to update display name in Auth:', authError.message);
                // Non-critical, so we don't throw an error
            }
        }
    }


    const firestoreUpdatePayload: { [key: string]: any } = {
      ...updateData,
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Consolidate role-specific fields
    if (updateData.role === 'student') {
      firestoreUpdatePayload.groupId = updateData.groupId !== undefined ? updateData.groupId : oldUserData.groupId;
      // Nullify teacher fields if switching to student
      firestoreUpdatePayload.specialization = null;
      firestoreUpdatePayload.academicDegree = null;
    } else if (updateData.role === 'teacher') {
      firestoreUpdatePayload.specialization = updateData.specialization !== undefined ? updateData.specialization : oldUserData.specialization;
      firestoreUpdatePayload.academicDegree = updateData.academicDegree !== undefined ? updateData.academicDegree : oldUserData.academicDegree;
      // Nullify student fields if switching to teacher
      firestoreUpdatePayload.groupId = null;
      firestoreUpdatePayload.enrollmentDate = null; // Assuming enrollmentDate is student-specific
    } else if (updateData.role === 'admin') {
      // Nullify both student and teacher specific fields
      firestoreUpdatePayload.groupId = null;
      firestoreUpdatePayload.enrollmentDate = null;
      firestoreUpdatePayload.specialization = null;
      firestoreUpdatePayload.academicDegree = null;
    }
    
    // Student count logic
    const newRole = updateData.role || oldUserData.role;
    const oldRole = oldUserData.role;
    const newGroupId = updateData.groupId !== undefined ? updateData.groupId : oldUserData.groupId; // Use new groupId if provided, else old
    const oldGroupId = oldUserData.groupId;

    // Case 1: Role changes from student
    if (oldRole === 'student' && newRole !== 'student' && oldGroupId) {
      const oldGroupRef = admin.firestore().collection('groups').doc(oldGroupId);
      batch.update(oldGroupRef, { studentCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
    }

    // Case 2: Role changes to student
    if (newRole === 'student' && oldRole !== 'student' && newGroupId) {
      const newGroupRef = admin.firestore().collection('groups').doc(newGroupId);
      batch.update(newGroupRef, { studentCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    }

    // Case 3: Student moves between groups
    if (newRole === 'student' && oldRole === 'student' && newGroupId !== oldGroupId) {
      if (oldGroupId) {
        const oldGroupRef = admin.firestore().collection('groups').doc(oldGroupId);
        batch.update(oldGroupRef, { studentCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
      }
      if (newGroupId) {
        const newGroupRef = admin.firestore().collection('groups').doc(newGroupId);
        batch.update(newGroupRef, { studentCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
      }
    }
    
    // Case 4: Student's group is unset (becomes null/undefined but role is still student)
    if (newRole === 'student' && oldRole === 'student' && oldGroupId && !newGroupId) {
        const oldGroupRef = admin.firestore().collection('groups').doc(oldGroupId);
        batch.update(oldGroupRef, { studentCount: FieldValue.increment(-1), updatedAt: FieldValue.serverTimestamp() });
    }
    
    // Case 5: Student is assigned a group (was student but no group, now has group)
    if (newRole === 'student' && oldRole === 'student' && !oldGroupId && newGroupId) {
        const newGroupRef = admin.firestore().collection('groups').doc(newGroupId);
        batch.update(newGroupRef, { studentCount: FieldValue.increment(1), updatedAt: FieldValue.serverTimestamp() });
    }

    // Update student profile if the user is a student and studentId (profile doc ID) exists
    if (newRole === 'student' && oldUserData.studentId) {
      const studentProfileRef = admin.firestore().collection('students').doc(oldUserData.studentId);
      const updatedStudentProfileData: { [key: string]: any } = {
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (updateData.groupId !== undefined) { // Check if groupId is explicitly passed for update
        updatedStudentProfileData.groupId = updateData.groupId || null;
      }
      if (updateData.firstName) updatedStudentProfileData.firstName = updateData.firstName;
      if (updateData.lastName) updatedStudentProfileData.lastName = updateData.lastName;
      if (updateData.email) updatedStudentProfileData.email = updateData.email;
      if (updateData.studentId) updatedStudentProfileData.studentCardId = updateData.studentId; // updateData.studentId is the student card ID from form

      // Also update studentDetails on the user document if relevant fields changed
      if (updateData.groupId !== undefined || updateData.studentId !== undefined) {
        firestoreUpdatePayload.studentDetails = {
          groupId: updateData.groupId !== undefined ? (updateData.groupId || null) : oldUserData.studentDetails?.groupId,
          studentId: updateData.studentId || oldUserData.studentDetails?.studentId, // student card ID
        };
      }


      // Check if there are any actual fields to update in student profile beyond timestamp
      const studentProfileFieldsToUpdate = Object.keys(updatedStudentProfileData).filter(k => k !== 'updatedAt');
      if (studentProfileFieldsToUpdate.length > 0) {
        batch.update(studentProfileRef, updatedStudentProfileData);
      }
    }
    // Logic for creating/updating/deleting student profile (as implemented before)
    // ... (This part remains unchanged from the previous student profile implementation)

    // --- Teacher Profile Synchronization ---
    if (oldRole === 'teacher' && newRole !== 'teacher' && oldUserData.teacherId) {
      // Role changed FROM teacher: Delete old teacher profile
      const oldTeacherProfileRef = admin.firestore().collection('teachers').doc(oldUserData.teacherId);
      batch.delete(oldTeacherProfileRef);
      firestoreUpdatePayload.teacherId = null;
      firestoreUpdatePayload.teacherDetails = null;
    } else if (newRole === 'teacher') {
      if (oldRole !== 'teacher' || !oldUserData.teacherId) {
        // Role changed TO teacher (and no previous teacher profile) OR User is teacher but somehow missing teacherId: Create new teacher profile
        const teacherProfileRef = admin.firestore().collection('teachers').doc();
        const newTeacherProfileData = {
          userId: userId,
          specialization: updateData.specialization || oldUserData.specialization || null,
          academicDegree: updateData.academicDegree || oldUserData.academicDegree || null,
          subjects: [],
          groups: [],
          experience: 0,
          education: "",
          firstName: updateData.firstName || oldUserData.firstName,
          lastName: updateData.lastName || oldUserData.lastName,
          email: updateData.email || oldUserData.email,
          middleName: updateData.middleName || oldUserData.middleName || '',
          phone: updateData.phone || oldUserData.phone || null,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        batch.set(teacherProfileRef, newTeacherProfileData);
        firestoreUpdatePayload.teacherId = teacherProfileRef.id;
        firestoreUpdatePayload.teacherDetails = {
          department: newTeacherProfileData.specialization,
          qualification: newTeacherProfileData.academicDegree,
        };
      } else if (oldUserData.teacherId) {
        // Role IS teacher and profile exists: Update existing teacher profile
        const teacherProfileRef = admin.firestore().collection('teachers').doc(oldUserData.teacherId);
        const updatedTeacherProfileData: { [key: string]: any } = {
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (updateData.specialization !== undefined) updatedTeacherProfileData.specialization = updateData.specialization || null;
        if (updateData.academicDegree !== undefined) updatedTeacherProfileData.academicDegree = updateData.academicDegree || null;
        if (updateData.firstName) updatedTeacherProfileData.firstName = updateData.firstName;
        if (updateData.lastName) updatedTeacherProfileData.lastName = updateData.lastName;
        if (updateData.email) updatedTeacherProfileData.email = updateData.email;
        if (updateData.middleName !== undefined) updatedTeacherProfileData.middleName = updateData.middleName || '';
        if (updateData.phone !== undefined) updatedTeacherProfileData.phone = updateData.phone || null;
        
        const teacherProfileFieldsToUpdate = Object.keys(updatedTeacherProfileData).filter(k => k !== 'updatedAt');
        if (teacherProfileFieldsToUpdate.length > 0) {
          batch.update(teacherProfileRef, updatedTeacherProfileData);
        }
        // Update teacherDetails on user document
        if (updateData.specialization !== undefined || updateData.academicDegree !== undefined) {
            firestoreUpdatePayload.teacherDetails = {
                department: updateData.specialization !== undefined ? (updateData.specialization || null) : oldUserData.teacherDetails?.department,
                qualification: updateData.academicDegree !== undefined ? (updateData.academicDegree || null) : oldUserData.teacherDetails?.qualification,
            };
        } else if (oldUserData.teacherDetails) { // Ensure teacherDetails is preserved if not changing spec/degree
            firestoreUpdatePayload.teacherDetails = oldUserData.teacherDetails;
        }
      }
    }
     // --- End of Teacher Profile Synchronization ---


    batch.update(userRef, firestoreUpdatePayload);
    await batch.commit();

    return { success: true, message: 'User updated successfully.' };
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error instanceof functions.https.HttpsError) { // Re-throw HttpsError
        throw error;
    }
    throw new functions.https.HttpsError('internal', `Failed to update user: ${error.message}`);
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
    const userRef = admin.firestore().collection('users').doc(data.userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Пользователь не найден');
    }
    const userData = userDoc.data() as any; // Use 'as any' for easier access or define a proper type

    const batch = admin.firestore().batch();

    // If student, decrement studentCount from their group and delete student profile
    if (userData?.role === 'student') {
      if (userData.groupId) {
        const groupRef = admin.firestore().collection('groups').doc(userData.groupId);
        batch.update(groupRef, {
          studentCount: FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      if (userData.studentId) { // studentId is the ID of the student profile document
        const studentProfileRef = admin.firestore().collection('students').doc(userData.studentId);
        batch.delete(studentProfileRef);
      }
    } else if (userData?.role === 'teacher' && userData?.teacherId) {
      // If teacher, delete their teacher profile
      const teacherProfileRef = admin.firestore().collection('teachers').doc(userData.teacherId);
      batch.delete(teacherProfileRef);
    }

    // Delete the user document from Firestore
    batch.delete(userRef);

    // Commit Firestore changes
    await batch.commit();

    // Delete user from Firebase Auth (after Firestore operations are successful)
    await admin.auth().deleteUser(data.userId);

    return { success: true, message: 'Пользователь успешно удален.' };
  } catch (error) {
    console.error('Error deleting user:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Ошибка при удалении пользователя'
    );
  }
}); 