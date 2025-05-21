import * as admin from "firebase-admin"; // Глобальный admin, инициализированный в index.ts
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

// Получаем db из глобально инициализированного admin
// Это гарантирует, что мы используем тот же инстанс, что и в index.ts
const db = admin.firestore();

// ... (интерфейсы UserData, CreateUserDataClient (переименовал в CreateUserDataClient), UserFirestoreRecord как были) ...
interface UserData { // Для listUsers
    id: string;
    firstName?: string;
    lastName?: string;
    patronymic?: string;
    email?: string;
    role?: "student" | "teacher" | "admin";
    groupId?: string | null;
    groupName?: string;
}

interface CreateUserDataClient { // Данные от клиента
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    patronymic?: string;
    role: "student" | "teacher" | "admin";
    groupId?: string | null;
    groupName?: string;
    teacherDetails?: {
        department?: string;
        qualification?: string;
    };
}

interface UserFirestoreRecord { // Для записи в Firestore
    firstName: string;
    lastName: string;
    patronymic: string;
    email: string;
    role: "student" | "teacher" | "admin";
    profilePictureUrl: string | null;
    createdAt: FirebaseFirestore.FieldValue;
    updatedAt: FirebaseFirestore.FieldValue;
    groupId?: string | null;
    groupName?: string;
    teacherDetails?: {
        department?: string;
        qualification?: string;
    };
}

interface StudentData {
  id: string;
  user: {
    uid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    createdAt: any;
    updatedAt: any;
  };
  groupId: string | null;
  groupName: string;
  status: string;
  group?: {
    id: string;
    name: string;
  };
}

export const listUsers = onCall({
  region: "us-central1",
  cors: true
}, async (
  request: CallableRequest<unknown>
): Promise<{ success: boolean; users: UserData[]; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }
  const userDocRef = db.collection("users").doc(request.auth.uid);
  try {
    const userDoc = await userDocRef.get();
    const userDataFromDb = userDoc.data();
    if (!userDoc.exists || !userDataFromDb || userDataFromDb.role !== "admin") {
      throw new HttpsError("permission-denied", "Нет прав администратора.");
    }
  } catch (error) {
    console.error("Ошибка проверки прав (listUsers):", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка проверки прав (listUsers).");
  }
  try {
    const usersSnapshot = await db.collection("users").orderBy("lastName").get();
    const usersList: UserData[] = [];
    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      usersList.push({
        id: doc.id,
        firstName: userData.firstName,
        lastName: userData.lastName,
        patronymic: userData.patronymic || "",
        email: userData.email,
        role: userData.role,
        groupId: userData.groupId || null,
        groupName: userData.groupName || "",
      });
    });
    return { success: true, users: usersList };
  } catch (error) {
    console.error("Ошибка при получении списка пользователей:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка получения списка пользователей.");
  }
});

export const createUserOnServer = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<CreateUserDataClient>): Promise<{ success: boolean; uid?: string; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const adminUserDocRef = db.collection("users").doc(request.auth.uid); // Используем db
  try {
    const adminUserDoc = await adminUserDocRef.get();
    const adminUserData = adminUserDoc.data();
    if (!adminUserDoc.exists || !adminUserData || adminUserData.role !== "admin") {
      throw new HttpsError("permission-denied", "Нет прав администратора.");
    }
  } catch (error) {
    console.error("Ошибка проверки прав (createUser):", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка проверки прав (createUser).");
  }

  const data = request.data;

  if (!data.email || !data.firstName || !data.lastName || !data.role) {
    throw new HttpsError("invalid-argument", "Отсутствуют email, firstName, lastName, role.");
  }
  if (data.role === "student" && (!data.groupId || !data.groupName)) {
    throw new HttpsError("invalid-argument", "Для студента нужны groupId и groupName.");
  }
  if (data.password && data.password.length < 6) {
      throw new HttpsError("invalid-argument", "Пароль должен быть не менее 6 символов.");
  }

  let newUserRecord;
  try {
    console.log("--- Debugging createUserOnServer ---");
    console.log("Is admin initialized?", admin.apps.length > 0);
    console.log("FieldValue from top-level const:", admin.firestore.FieldValue); // Проверяем нашу константу
    if (!admin.firestore.FieldValue || !admin.firestore.FieldValue.serverTimestamp) {
      console.error("CRITICAL: FieldValue or FieldValue.serverTimestamp is not available!");
      throw new HttpsError("internal", "Server timestamp functionality is not available (FieldValue issue).");
    }
    
    const userCreationRequest: admin.auth.CreateRequest = {
      email: data.email,
      emailVerified: true,
      displayName: `${data.lastName} ${data.firstName}`,
    };
    if (data.password) {
      userCreationRequest.password = data.password;
    }
    newUserRecord = await admin.auth().createUser(userCreationRequest); // admin.auth() использует глобальный admin

    const userFirestoreData: UserFirestoreRecord = {
      firstName: data.firstName,
      lastName: data.lastName,
      patronymic: data.patronymic || "",
      email: data.email,
      role: data.role,
      profilePictureUrl: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Используем глобальный admin
      updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Используем глобальный admin
    };

    if (data.role === "student") {
      userFirestoreData.groupId = data.groupId;
      userFirestoreData.groupName = data.groupName;
    } else if (data.role === "teacher" && data.teacherDetails) {
      userFirestoreData.teacherDetails = data.teacherDetails;
    }

    await db.collection("users").doc(newUserRecord.uid).set(userFirestoreData); // Используем db

    return {
      success: true,
      uid: newUserRecord.uid,
      message: `Пользователь ${data.role} успешно создан.`,
    };
  } catch (error: any) {
    console.error("Ошибка при создании пользователя:", error);
    if (newUserRecord && newUserRecord.uid) {
      try {
        await admin.auth().deleteUser(newUserRecord.uid);
        console.log(`Пользователь ${newUserRecord.uid} удален из Auth из-за ошибки Firestore.`);
      } catch (deleteError) {
        console.error(`Критическая ошибка: не удалось удалить ${newUserRecord.uid} из Auth:`, deleteError);
      }
    }
    if (error instanceof HttpsError) throw error;
    if (error.code === "auth/email-already-exists") {
      throw new HttpsError("already-exists", "Email уже используется.");
    }
    if (error.code === "auth/invalid-password") {
      throw new HttpsError("invalid-argument", "Некорректный пароль (мин. 6 символов).");
    }
    throw new HttpsError("internal", error.message || "Неизвестная ошибка создания пользователя.");
  }
});

interface UpdateUserDataClient {
  uid: string; // ID пользователя, которого обновляем
  firstName?: string;
  lastName?: string;
  patronymic?: string;
  // Email обычно не меняют через такие формы или это более сложный процесс с верификацией
  // password?: string; // Смена пароля - отдельная функция или через Firebase Auth UI клиента
  role?: "student" | "teacher" | "admin";
  groupId?: string | null;
  groupName?: string;
  teacherDetails?: {
    department?: string;
    qualification?: string;
  };
  // Другие поля, которые можно обновлять
}

export const getUser = onCall(
  async (request: CallableRequest<{ userId: string }>): Promise<{ success: boolean; user: UserData; message?: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
    }

    const { userId } = request.data;
    if (!userId) {
      throw new HttpsError("invalid-argument", "Отсутствует ID пользователя.");
    }

    try {
      const userDoc = await db.collection("users").doc(userId).get();
      
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Пользователь не найден.");
      }

      const userData = userDoc.data();
      return {
        success: true,
        user: {
          id: userDoc.id,
          ...userData
        } as UserData
      };
    } catch (error) {
      console.error(`Ошибка при получении пользователя ${userId}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Ошибка получения данных пользователя.");
    }
  }
);

export const deleteUser = onCall(
  async (request: CallableRequest<{ userId: string }>): Promise<{ success: boolean; message: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
    }

    const { userId } = request.data;
    if (!userId) {
      throw new HttpsError("invalid-argument", "Отсутствует ID пользователя.");
    }

    try {
      // Проверяем, не пытается ли пользователь удалить сам себя
      if (request.auth.uid === userId) {
        throw new HttpsError("invalid-argument", "Невозможно удалить свой собственный аккаунт.");
      }

      // Получаем данные пользователя
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Пользователь не найден.");
      }

      const userData = userDoc.data();
      
      // Если это студент, обновляем счетчик в группе
      if (userData?.role === "student" && userData?.groupId) {
        await db.collection("groups").doc(userData.groupId).update({
          studentCount: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      // Удаляем пользователя из Authentication
      await admin.auth().deleteUser(userId);

      // Удаляем данные пользователя из Firestore
      await db.collection("users").doc(userId).delete();

      return {
        success: true,
        message: "Пользователь успешно удален."
      };
    } catch (error) {
      console.error(`Ошибка при удалении пользователя ${userId}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Ошибка удаления пользователя.");
    }
  }
);

// Обновляем существующую функцию updateUser для поддержки смены роли
export const updateUser = onCall(
  async (request: CallableRequest<UpdateUserDataClient>): Promise<{ success: boolean; message: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
    }

    const data = request.data;
    if (!data.uid) {
      throw new HttpsError("invalid-argument", "Отсутствует ID пользователя.");
    }

    try {
      // Получаем текущие данные пользователя
      const userDoc = await db.collection("users").doc(data.uid).get();
      if (!userDoc.exists) {
        throw new HttpsError("not-found", "Пользователь не найден.");
      }

      const currentUserData = userDoc.data();
      const updatePayloadAuth: admin.auth.UpdateRequest = {};
      const updatePayloadFirestore: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Обновляем базовые данные
      if (data.firstName || data.lastName) {
        const currentFirstName = data.firstName || currentUserData?.firstName || '';
        const currentLastName = data.lastName || currentUserData?.lastName || '';
        updatePayloadAuth.displayName = `${currentLastName} ${currentFirstName}`;
      }
      if (data.firstName) updatePayloadFirestore.firstName = data.firstName;
      if (data.lastName) updatePayloadFirestore.lastName = data.lastName;
      if (data.patronymic !== undefined) updatePayloadFirestore.patronymic = data.patronymic;

      // Обработка смены роли
      if (data.role && data.role !== currentUserData?.role) {
        updatePayloadFirestore.role = data.role;

        // Если меняем роль с student на другую
        if (currentUserData?.role === "student" && currentUserData?.groupId) {
          // Уменьшаем счетчик в старой группе
          await db.collection("groups").doc(currentUserData.groupId).update({
            studentCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          // Очищаем данные о группе
          updatePayloadFirestore.groupId = null;
          updatePayloadFirestore.groupName = null;
        }

        // Если меняем на роль student
        if (data.role === "student") {
          if (!data.groupId || !data.groupName) {
            throw new HttpsError("invalid-argument", "Для студента необходимо указать группу.");
          }
          updatePayloadFirestore.groupId = data.groupId;
          updatePayloadFirestore.groupName = data.groupName;
          // Увеличиваем счетчик в новой группе
          await db.collection("groups").doc(data.groupId).update({
            studentCount: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }

        // Обработка данных преподавателя
        if (data.role === "teacher") {
          if (data.teacherDetails) {
            updatePayloadFirestore.teacherDetails = data.teacherDetails;
          }
        } else {
          // Если меняем с роли teacher на другую
          updatePayloadFirestore.teacherDetails = admin.firestore.FieldValue.delete();
        }
      } else if (data.role === "student" && data.groupId && data.groupId !== currentUserData?.groupId) {
        // Если меняем группу студента
        if (currentUserData?.groupId) {
          // Уменьшаем счетчик в старой группе
          await db.collection("groups").doc(currentUserData.groupId).update({
            studentCount: admin.firestore.FieldValue.increment(-1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
        // Увеличиваем счетчик в новой группе
        await db.collection("groups").doc(data.groupId).update({
          studentCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        updatePayloadFirestore.groupId = data.groupId;
        updatePayloadFirestore.groupName = data.groupName;
      }

      // Обновляем данные в Authentication
      if (Object.keys(updatePayloadAuth).length > 0) {
        await admin.auth().updateUser(data.uid, updatePayloadAuth);
      }

      // Обновляем данные в Firestore
      await db.collection("users").doc(data.uid).update(updatePayloadFirestore);

      return {
        success: true,
        message: "Пользователь успешно обновлен."
      };
    } catch (error) {
      console.error(`Ошибка при обновлении пользователя ${data.uid}:`, error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError("internal", "Ошибка обновления пользователя.");
    }
  }
);

export const getStudents = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<unknown>): Promise<{ success: boolean; students: StudentData[]; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  try {
    const usersSnapshot = await db.collection("users")
      .where("role", "==", "student")
      .orderBy("lastName")
      .get();

    const studentsList: StudentData[] = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const studentData: StudentData = {
        id: doc.id,
        user: {
          uid: doc.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        },
        groupId: userData.groupId || null,
        groupName: userData.groupName || "",
        status: "active",
      };

      if (userData.groupId) {
        const groupDoc = await db.collection("groups").doc(userData.groupId).get();
        if (groupDoc.exists) {
          studentData.group = {
            id: groupDoc.id,
            name: groupDoc.data()?.name || "",
          };
        }
      }

      studentsList.push(studentData);
    }

    return { success: true, students: studentsList };
  } catch (error) {
    console.error("Ошибка при получении списка студентов:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка получения списка студентов.");
  }
});

export const getTeachers = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<unknown>): Promise<{ success: boolean; teachers: any[]; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  try {
    const usersSnapshot = await db.collection("users")
      .where("role", "==", "teacher")
      .orderBy("lastName")
      .get();

    const teachersList = [];
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      teachersList.push({
        id: doc.id,
        user: {
          uid: doc.id,
          email: userData.email,
          firstName: userData.firstName,
          lastName: userData.lastName,
          role: userData.role,
          createdAt: userData.createdAt,
          updatedAt: userData.updatedAt,
        },
        teacherDetails: userData.teacherDetails || {},
      });
    }

    return { success: true, teachers: teachersList };
  } catch (error) {
    console.error("Ошибка при получении списка преподавателей:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка получения списка преподавателей.");
  }
});

export const addStudentToGroup = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ studentId: string; groupId: string }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { studentId, groupId } = request.data;
  if (!studentId || !groupId) {
    throw new HttpsError("invalid-argument", "Отсутствует studentId или groupId.");
  }

  try {
    const [studentDoc, groupDoc] = await Promise.all([
      db.collection("users").doc(studentId).get(),
      db.collection("groups").doc(groupId).get(),
    ]);

    if (!studentDoc.exists) {
      throw new HttpsError("not-found", "Студент не найден.");
    }
    if (!groupDoc.exists) {
      throw new HttpsError("not-found", "Группа не найдена.");
    }

    const studentData = studentDoc.data();
    if (studentData?.role !== "student") {
      throw new HttpsError("invalid-argument", "Пользователь не является студентом.");
    }

    await db.collection("users").doc(studentId).update({
      groupId,
      groupName: groupDoc.data()?.name || "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Студент успешно добавлен в группу.",
    };
  } catch (error) {
    console.error("Ошибка при добавлении студента в группу:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка при добавлении студента в группу.");
  }
});

export const removeStudentFromGroup = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ studentId: string }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { studentId } = request.data;
  if (!studentId) {
    throw new HttpsError("invalid-argument", "Отсутствует studentId.");
  }

  try {
    const studentDoc = await db.collection("users").doc(studentId).get();
    if (!studentDoc.exists) {
      throw new HttpsError("not-found", "Студент не найден.");
    }

    const studentData = studentDoc.data();
    if (studentData?.role !== "student") {
      throw new HttpsError("invalid-argument", "Пользователь не является студентом.");
    }

    await db.collection("users").doc(studentId).update({
      groupId: null,
      groupName: "",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Студент успешно удален из группы.",
    };
  } catch (error) {
    console.error("Ошибка при удалении студента из группы:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка при удалении студента из группы.");
  }
});