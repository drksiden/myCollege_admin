import * as admin from "firebase-admin";
import { onCall, HttpsError, CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

interface ScheduleItem {
  id: string;
  groupId: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

interface CreateScheduleItemData {
  groupId: string;
  subject: string;
  teacherId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
}

interface UpdateScheduleItemData {
  subject?: string;
  teacherId?: string;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  room?: string;
}

export const createScheduleItem = onCall({
  region: "us-central1"
}, async (request: CallableRequest<CreateScheduleItemData>): Promise<{ success: boolean; scheduleId: string; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { groupId, subject, teacherId, dayOfWeek, startTime, endTime, room } = request.data;

  // Проверяем права доступа
  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (!userDoc.exists || !userData || (userData.role !== "admin" && userData.role !== "teacher")) {
    throw new HttpsError("permission-denied", "Нет прав для создания расписания.");
  }

  try {
    // Получаем данные преподавателя
    const teacherDoc = await db.collection("users").doc(teacherId).get();
    const teacherData = teacherDoc.data();
    if (!teacherDoc.exists || !teacherData) {
      throw new HttpsError("not-found", "Преподаватель не найден.");
    }

    const teacherName = `${teacherData.lastName} ${teacherData.firstName} ${teacherData.patronymic || ''}`.trim();

    // Создаем элемент расписания
    const scheduleData: Omit<ScheduleItem, 'id'> = {
      groupId,
      subject,
      teacherId,
      teacherName,
      dayOfWeek,
      startTime,
      endTime,
      room,
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now()
    };

    const docRef = await db.collection("schedule").add(scheduleData);

    return {
      success: true,
      scheduleId: docRef.id,
      message: "Элемент расписания успешно создан."
    };
  } catch (error) {
    console.error("Ошибка при создании элемента расписания:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка создания элемента расписания.");
  }
});

export const updateScheduleItem = onCall({
  region: "us-central1"
}, async (request: CallableRequest<{ scheduleId: string; data: UpdateScheduleItemData }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { scheduleId, data } = request.data;

  // Проверяем права доступа
  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (!userDoc.exists || !userData || (userData.role !== "admin" && userData.role !== "teacher")) {
    throw new HttpsError("permission-denied", "Нет прав для обновления расписания.");
  }

  try {
    const updateData: any = {
      ...data,
      updatedAt: admin.firestore.Timestamp.now()
    };

    // Если обновляется преподаватель, обновляем его имя
    if (data.teacherId) {
      const teacherDoc = await db.collection("users").doc(data.teacherId).get();
      const teacherData = teacherDoc.data();
      if (!teacherDoc.exists || !teacherData) {
        throw new HttpsError("not-found", "Преподаватель не найден.");
      }
      updateData.teacherName = `${teacherData.lastName} ${teacherData.firstName} ${teacherData.patronymic || ''}`.trim();
    }

    await db.collection("schedule").doc(scheduleId).update(updateData);

    return {
      success: true,
      message: "Элемент расписания успешно обновлен."
    };
  } catch (error) {
    console.error("Ошибка при обновлении элемента расписания:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка обновления элемента расписания.");
  }
});

export const deleteScheduleItem = onCall({
  region: "us-central1"
}, async (request: CallableRequest<{ scheduleId: string }>): Promise<{ success: boolean; message: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { scheduleId } = request.data;

  // Проверяем права доступа
  const userDoc = await db.collection("users").doc(request.auth.uid).get();
  const userData = userDoc.data();
  if (!userDoc.exists || !userData || (userData.role !== "admin" && userData.role !== "teacher")) {
    throw new HttpsError("permission-denied", "Нет прав для удаления расписания.");
  }

  try {
    await db.collection("schedule").doc(scheduleId).delete();

    return {
      success: true,
      message: "Элемент расписания успешно удален."
    };
  } catch (error) {
    console.error("Ошибка при удалении элемента расписания:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка удаления элемента расписания.");
  }
});

export const getSchedule = onCall({
  region: "us-central1"
}, async (request: CallableRequest<{ groupId: string }>): Promise<{ success: boolean; schedule: ScheduleItem[]; message?: string }> => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Пользователь не аутентифицирован.");
  }

  const { groupId } = request.data;

  try {
    const scheduleSnapshot = await db.collection("schedule")
      .where("groupId", "==", groupId)
      .orderBy("dayOfWeek")
      .orderBy("startTime")
      .get();

    const schedule: ScheduleItem[] = [];
    scheduleSnapshot.forEach((doc) => {
      schedule.push({
        id: doc.id,
        ...doc.data()
      } as ScheduleItem);
    });

    return {
      success: true,
      schedule
    };
  } catch (error) {
    console.error("Ошибка при получении расписания:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Ошибка получения расписания.");
  }
}); 