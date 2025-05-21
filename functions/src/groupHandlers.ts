import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore(); // db можно получить здесь, admin уже инициализирован

// ... (интерфейсы SubjectData, CreateGroupData, GroupDetails, GroupFirestoreWriteData как были) ...
interface SubjectData {
  subjectName: string;
  teacherId: string;
  teacherName: string;
}

interface CreateGroupData {
  name: string;
  course: number;
  specialty: string;
  specialtyCode: string;
  curatorId?: string | null;
  curatorName?: string;
  subjects?: Array<SubjectData>;
}

interface GroupDetails {
  name: string;
  course: number;
  specialty: string;
  specialtyCode: string;
  curatorId: string | null;
  curatorName: string;
  subjects: Array<SubjectData>;
  studentCount: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface GroupFirestoreWriteData {
  name: string;
  course: number;
  specialty: string;
  specialtyCode: string;
  curatorId: string | null;
  curatorName: string;
  subjects: Array<SubjectData>;
  studentCount: number;
  createdAt: FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.FieldValue;
}

interface GroupData {
  id: string;
  name: string;
  course: number;
  specialty: string;
  specialtyCode: string;
  curatorId: string | null;
  curatorName: string;
  subjects: Array<SubjectData>;
  studentCount: number;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface UpdateGroupData {
  name?: string;
  course?: number;
  specialty?: string;
  specialtyCode?: string;
  curatorId?: string | null;
  curatorName?: string;
  subjects?: Array<SubjectData>;
}

export const createGroup = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<CreateGroupData>): Promise<{
  message: string;
  groupId: string;
  data: Partial<GroupDetails>;
}> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const adminUserDocRef = db.collection("users").doc(request.auth.uid);
  try {
    const adminUserDoc = await adminUserDocRef.get();
    const adminUserData = adminUserDoc.data();
    if (!adminUserDoc.exists || !adminUserData || adminUserData.role !== "admin") {
      throw new HttpsError("permission-denied", "Нет прав администратора.");
    }
  } catch (error) {
    console.error("Ошибка проверки прав (createGroup):", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка проверки прав (createGroup).");
  }

  const data = request.data;
  if (!data.name || !data.course || !data.specialty || !data.specialtyCode) {
    throw new HttpsError("invalid-argument", "Поля name, course, specialty, specialtyCode обязательны.");
  }

  try {
    const newGroupDataForWrite: GroupFirestoreWriteData = {
      name: data.name,
      course: Number(data.course),
      specialty: data.specialty,
      specialtyCode: data.specialtyCode,
      curatorId: data.curatorId || null,
      curatorName: data.curatorName || "",
      subjects: data.subjects || [],
      studentCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const groupRef = await db.collection("groups").add(newGroupDataForWrite);
    const returnedData = { ...newGroupDataForWrite };

    return {
      message: "Группа успешно создана!",
      groupId: groupRef.id,
      data: returnedData as unknown as Partial<GroupDetails>,
    };
  } catch (error) {
    console.error("Ошибка при создании группы:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("unknown", "Произошла ошибка при создании группы.");
  }
});

export const listGroups = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<unknown>): Promise<{ success: boolean; groups: GroupData[]; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  try {
    const groupsSnapshot = await db.collection("groups").orderBy("name").get();
    const groupsList: GroupData[] = [];
    
    groupsSnapshot.forEach((doc) => {
      const groupData = doc.data();
      groupsList.push({
        id: doc.id,
        ...groupData
      } as GroupData);
    });

    return { success: true, groups: groupsList };
  } catch (error) {
    console.error("Ошибка при получении списка групп:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка получения списка групп.");
  }
});

export const getGroup = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ groupId: string }>): Promise<{ success: boolean; group: GroupData; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { groupId } = request.data;
  if (!groupId) {
    throw new HttpsError("invalid-argument", "Отсутствует ID группы.");
  }

  try {
    const groupDoc = await db.collection("groups").doc(groupId).get();
    
    if (!groupDoc.exists) {
      throw new HttpsError("not-found", "Группа не найдена.");
    }

    const groupData = groupDoc.data();
    return {
      success: true,
      group: {
        id: groupDoc.id,
        ...groupData
      } as GroupData
    };
  } catch (error) {
    console.error(`Ошибка при получении группы ${groupId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка получения данных группы.");
  }
});

export const updateGroup = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ groupId: string; data: UpdateGroupData }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { groupId, data } = request.data;
  if (!groupId) {
    throw new HttpsError("invalid-argument", "Отсутствует ID группы.");
  }

  try {
    const updateData: any = {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("groups").doc(groupId).update(updateData);

    return {
      success: true,
      message: "Группа успешно обновлена."
    };
  } catch (error) {
    console.error(`Ошибка при обновлении группы ${groupId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка обновления группы.");
  }
});

export const deleteGroup = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ groupId: string }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { groupId } = request.data;
  if (!groupId) {
    throw new HttpsError("invalid-argument", "Отсутствует ID группы.");
  }

  try {
    // Проверяем, есть ли студенты в группе
    const studentsSnapshot = await db.collection("users")
      .where("groupId", "==", groupId)
      .get();

    if (!studentsSnapshot.empty) {
      throw new HttpsError("failed-precondition", "Невозможно удалить группу, в которой есть студенты.");
    }

    await db.collection("groups").doc(groupId).delete();

    return {
      success: true,
      message: "Группа успешно удалена."
    };
  } catch (error) {
    console.error(`Ошибка при удалении группы ${groupId}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка удаления группы.");
  }
});

export const addStudentToGroup = onCall(
  async (request: CallableRequest<{ groupId: string; studentId: string }>): Promise<{ success: boolean; message: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
    }

    const { groupId, studentId } = request.data;
    if (!groupId || !studentId) {
      throw new HttpsError("invalid-argument", "Отсутствует ID группы или студента.");
    }

    try {
      // Проверяем существование группы
      const groupDoc = await db.collection("groups").doc(groupId).get();
      if (!groupDoc.exists) {
        throw new HttpsError("not-found", "Группа не найдена.");
      }

      // Проверяем существование студента
      const studentDoc = await db.collection("users").doc(studentId).get();
      if (!studentDoc.exists) {
        throw new HttpsError("not-found", "Студент не найден.");
      }

      const studentData = studentDoc.data();
      if (studentData?.role !== "student") {
        throw new HttpsError("invalid-argument", "Пользователь не является студентом.");
      }

      // Обновляем данные студента
      await db.collection("users").doc(studentId).update({
        groupId,
        groupName: groupDoc.data()?.name,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Увеличиваем счетчик студентов в группе
      await db.collection("groups").doc(groupId).update({
        studentCount: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: "Студент успешно добавлен в группу."
      };
    } catch (error) {
      console.error(`Ошибка при добавлении студента в группу:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Ошибка добавления студента в группу.");
    }
  }
);

export const removeStudentFromGroup = onCall(
  async (request: CallableRequest<{ groupId: string; studentId: string }>): Promise<{ success: boolean; message: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
    }

    const { groupId, studentId } = request.data;
    if (!groupId || !studentId) {
      throw new HttpsError("invalid-argument", "Отсутствует ID группы или студента.");
    }

    try {
      // Проверяем существование группы
      const groupDoc = await db.collection("groups").doc(groupId).get();
      if (!groupDoc.exists) {
        throw new HttpsError("not-found", "Группа не найдена.");
      }

      // Проверяем существование студента
      const studentDoc = await db.collection("users").doc(studentId).get();
      if (!studentDoc.exists) {
        throw new HttpsError("not-found", "Студент не найден.");
      }

      const studentData = studentDoc.data();
      if (studentData?.groupId !== groupId) {
        throw new HttpsError("invalid-argument", "Студент не находится в указанной группе.");
      }

      // Обновляем данные студента
      await db.collection("users").doc(studentId).update({
        groupId: null,
        groupName: null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Уменьшаем счетчик студентов в группе
      await db.collection("groups").doc(groupId).update({
        studentCount: admin.firestore.FieldValue.increment(-1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: "Студент успешно удален из группы."
      };
    } catch (error) {
      console.error(`Ошибка при удалении студента из группы:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Ошибка удаления студента из группы.");
    }
  }
);