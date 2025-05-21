import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

interface Subject {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  teacherName: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface CreateSubjectData {
  name: string;
  description: string;
  teacherId: string;
}

interface UpdateSubjectData extends CreateSubjectData {
  id: string;
}

// Получение списка предметов
export const getSubjects = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest): Promise<{ success: boolean; subjects: Subject[]; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  try {
    const subjectsSnapshot = await db.collection("subjects").orderBy("name").get();
    const subjects: Subject[] = [];
    
    subjectsSnapshot.forEach((doc) => {
      subjects.push({
        id: doc.id,
        ...doc.data()
      } as Subject);
    });

    return { success: true, subjects };
  } catch (error) {
    console.error("Ошибка при получении списка предметов:", error);
    throw new HttpsError("internal", "Ошибка получения списка предметов.");
  }
});

// Создание нового предмета
export const createSubject = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<CreateSubjectData>): Promise<{ success: boolean; subject: Subject; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { name, description, teacherId } = request.data;

  if (!name || !description || !teacherId) {
    throw new HttpsError("invalid-argument", "Необходимо указать название, описание и преподавателя.");
  }

  try {
    // Получаем данные преподавателя
    const teacherDoc = await db.collection("users").doc(teacherId).get();
    if (!teacherDoc.exists) {
      throw new HttpsError("not-found", "Преподаватель не найден.");
    }

    const teacherData = teacherDoc.data();
    const teacherName = `${teacherData?.lastName} ${teacherData?.firstName} ${teacherData?.patronymic || ''}`.trim();

    // Создаем предмет
    const subjectData = {
      name,
      description,
      teacherId,
      teacherName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await db.collection("subjects").add(subjectData);
    const newSubject = {
      id: docRef.id,
      ...subjectData
    } as Subject;

    return {
      success: true,
      subject: newSubject,
      message: "Предмет успешно создан."
    };
  } catch (error) {
    console.error("Ошибка при создании предмета:", error);
    throw new HttpsError("internal", "Ошибка создания предмета.");
  }
});

// Обновление предмета
export const updateSubject = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<UpdateSubjectData>): Promise<{ success: boolean; subject: Subject; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { id, name, description, teacherId } = request.data;

  if (!id || !name || !description || !teacherId) {
    throw new HttpsError("invalid-argument", "Необходимо указать ID, название, описание и преподавателя.");
  }

  try {
    // Проверяем существование предмета
    const subjectDoc = await db.collection("subjects").doc(id).get();
    if (!subjectDoc.exists) {
      throw new HttpsError("not-found", "Предмет не найден.");
    }

    // Получаем данные преподавателя
    const teacherDoc = await db.collection("users").doc(teacherId).get();
    if (!teacherDoc.exists) {
      throw new HttpsError("not-found", "Преподаватель не найден.");
    }

    const teacherData = teacherDoc.data();
    const teacherName = `${teacherData?.lastName} ${teacherData?.firstName} ${teacherData?.patronymic || ''}`.trim();

    // Обновляем предмет
    const updateData = {
      name,
      description,
      teacherId,
      teacherName,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("subjects").doc(id).update(updateData);

    const updatedSubject = {
      id,
      ...updateData
    } as Subject;

    return {
      success: true,
      subject: updatedSubject,
      message: "Предмет успешно обновлен."
    };
  } catch (error) {
    console.error("Ошибка при обновлении предмета:", error);
    throw new HttpsError("internal", "Ошибка обновления предмета.");
  }
});

// Удаление предмета
export const deleteSubject = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ id: string }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { id } = request.data;

  if (!id) {
    throw new HttpsError("invalid-argument", "Необходимо указать ID предмета.");
  }

  try {
    // Проверяем существование предмета
    const subjectDoc = await db.collection("subjects").doc(id).get();
    if (!subjectDoc.exists) {
      throw new HttpsError("not-found", "Предмет не найден.");
    }

    // Удаляем предмет
    await db.collection("subjects").doc(id).delete();

    return {
      success: true,
      message: "Предмет успешно удален."
    };
  } catch (error) {
    console.error("Ошибка при удалении предмета:", error);
    throw new HttpsError("internal", "Ошибка удаления предмета.");
  }
}); 