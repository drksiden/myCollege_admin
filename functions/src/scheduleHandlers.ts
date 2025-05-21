import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";
import { CollectionReference, DocumentData } from "firebase-admin/firestore";

const db = admin.firestore();

interface Lesson {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  teacherId: string;
  room: string;
  type: string;
}

interface Schedule {
  id: string;
  groupId: string;
  lessons: Lesson[];
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface CreateScheduleData {
  groupId: string;
  lessons: Omit<Lesson, 'id'>[];
}

interface UpdateScheduleData {
  groupId?: string;
  lessons?: Omit<Lesson, 'id'>[];
}

export const createSchedule = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<CreateScheduleData>): Promise<{ success: boolean; scheduleId: string; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { groupId, lessons } = request.data;

  // Проверяем права доступа
  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (!userDoc.exists || !userData || userData.role !== "admin") {
    throw new HttpsError("permission-denied", "Нет прав для создания расписания.");
  }

  try {
    // Проверяем существование группы
    const groupDoc = await db.collection("groups").doc(groupId).get();
    if (!groupDoc.exists) {
      throw new HttpsError("not-found", "Группа не найдена.");
    }

    // Проверяем существование предметов и преподавателей
    for (const lesson of lessons) {
      const [subjectDoc, teacherDoc] = await Promise.all([
        db.collection("subjects").doc(lesson.subjectId).get(),
        db.collection("teachers").doc(lesson.teacherId).get()
      ]);

      if (!subjectDoc.exists) {
        throw new HttpsError("not-found", `Предмет с ID ${lesson.subjectId} не найден.`);
      }
      if (!teacherDoc.exists) {
        throw new HttpsError("not-found", `Преподаватель с ID ${lesson.teacherId} не найден.`);
      }
    }

    // Создаем расписание
    const scheduleData: Omit<Schedule, 'id'> = {
      groupId,
      lessons: lessons.map(lesson => ({
        ...lesson,
        id: crypto.randomUUID()
      })),
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    const docRef = await db.collection("schedules").add(scheduleData);

    return {
      success: true,
      scheduleId: docRef.id,
      message: "Расписание успешно создано."
    };
  } catch (error) {
    console.error("Ошибка при создании расписания:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка создания расписания.");
  }
});

export const updateSchedule = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ scheduleId: string; data: UpdateScheduleData }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { scheduleId, data } = request.data;

  // Проверяем права доступа
  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (!userDoc.exists || !userData || userData.role !== "admin") {
    throw new HttpsError("permission-denied", "Нет прав для обновления расписания.");
  }

  try {
    // Проверяем существование расписания
    const scheduleDoc = await db.collection("schedules").doc(scheduleId).get();
    if (!scheduleDoc.exists) {
      throw new HttpsError("not-found", "Расписание не найдено.");
    }

    // Если обновляется группа, проверяем её существование
    if (data.groupId) {
      const groupDoc = await db.collection("groups").doc(data.groupId).get();
      if (!groupDoc.exists) {
        throw new HttpsError("not-found", "Группа не найдена.");
      }
    }

    // Если обновляются занятия, проверяем предметы и преподавателей
    if (data.lessons) {
      for (const lesson of data.lessons) {
        const [subjectDoc, teacherDoc] = await Promise.all([
          db.collection("subjects").doc(lesson.subjectId).get(),
          db.collection("teachers").doc(lesson.teacherId).get()
        ]);

        if (!subjectDoc.exists) {
          throw new HttpsError("not-found", `Предмет с ID ${lesson.subjectId} не найден.`);
        }
        if (!teacherDoc.exists) {
          throw new HttpsError("not-found", `Преподаватель с ID ${lesson.teacherId} не найден.`);
        }
      }
    }

    const updateData: any = {
      ...data,
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Если обновляются занятия, добавляем ID для новых занятий
    if (data.lessons) {
      updateData.lessons = data.lessons.map(lesson => ({
        ...lesson,
        id: crypto.randomUUID()
      }));
    }

    await db.collection("schedules").doc(scheduleId).update(updateData);

    return {
      success: true,
      message: "Расписание успешно обновлено."
    };
  } catch (error) {
    console.error("Ошибка при обновлении расписания:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка обновления расписания.");
  }
});

export const deleteSchedule = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ scheduleId: string }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { scheduleId } = request.data;

  // Проверяем права доступа
  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (!userDoc.exists || !userData || userData.role !== "admin") {
    throw new HttpsError("permission-denied", "Нет прав для удаления расписания.");
  }

  try {
    await db.collection("schedules").doc(scheduleId).delete();

    return {
      success: true,
      message: "Расписание успешно удалено."
    };
  } catch (error) {
    console.error("Ошибка при удалении расписания:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка удаления расписания.");
  }
});

export const getSchedules = onCall({
  region: "us-central1",
  cors: true
}, async (request: CallableRequest<{ groupId?: string }>): Promise<{ success: boolean; schedules: Schedule[]; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { groupId } = request.data;

  try {
    let query: CollectionReference<DocumentData> = db.collection('schedules');
    if (groupId) {
      query = query.where("groupId", "==", groupId) as CollectionReference<DocumentData>;
    }

    const schedulesSnapshot = await query.get();

    const schedules: Schedule[] = [];
    schedulesSnapshot.forEach((doc) => {
      schedules.push({
        id: doc.id,
        ...doc.data()
      } as Schedule);
    });

    return {
      success: true,
      schedules
    };
  } catch (error) {
    console.error("Ошибка при получении расписаний:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка получения расписаний.");
  }
}); 