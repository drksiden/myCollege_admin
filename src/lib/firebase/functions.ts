import { getFunctions, httpsCallable } from "firebase/functions";
import type { Group } from "@/pages/admin/GroupsPage";
import type { User } from "@/pages/admin/UsersPage";
import { db } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";

const functions = getFunctions();

export const getTeachers = async () => {
  const getTeachersFn = httpsCallable(functions, "getTeachers");
  const result = await getTeachersFn();
  return (result.data as { teachers: User[] }).teachers;
};

export const getGroups = async () => {
  const getGroupsFn = httpsCallable(functions, "getGroups");
  const result = await getGroupsFn();
  return (result.data as { groups: Group[] }).groups;
};

export const createGroup = async (data: {
  name: string;
  course: string;
  specialty: string;
  qualification: string;
  curatorId?: string;
  curatorName?: string;
  subjects: string[];
}) => {
  const createGroupFn = httpsCallable(functions, "createGroup");
  const result = await createGroupFn(data);
  return result.data;
};

export const updateGroup = async (data: {
  id: string;
  name: string;
  course: string;
  specialty: string;
  qualification: string;
  curatorId?: string;
  curatorName?: string;
  subjects: string[];
}) => {
  const updateGroupFn = httpsCallable(functions, "updateGroup");
  const result = await updateGroupFn(data);
  return result.data;
};

export const deleteGroup = async (groupId: string) => {
  const deleteGroupFn = httpsCallable(functions, "deleteGroup");
  const result = await deleteGroupFn({ groupId });
  return result.data;
};

export const getGroupStudents = async (groupId: string) => {
  const getGroupStudentsFn = httpsCallable(functions, "getGroupStudents");
  const result = await getGroupStudentsFn({ groupId });
  return (result.data as { students: User[] }).students;
};

export const addStudentToGroup = async (data: {
  groupId: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  studentId: string;
}) => {
  const addStudentToGroupFn = httpsCallable(functions, "addStudentToGroup");
  const result = await addStudentToGroupFn(data);
  return result.data;
};

export const removeStudentFromGroup = async (groupId: string, studentId: string) => {
  const removeStudentFromGroupFn = httpsCallable(functions, "removeStudentFromGroup");
  const result = await removeStudentFromGroupFn({ groupId, studentId });
  return result.data;
};

// Получить расписание группы
export const getGroupSchedule = async (groupId: string) => {
  const scheduleRef = collection(db, `groups/${groupId}/schedule`);
  const snapshot = await getDocs(scheduleRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Сохранить расписание группы (batch write)
export const saveGroupSchedule = async (groupId: string, schedule: any[]) => {
  const batch = writeBatch(db);
  const scheduleRef = collection(db, `groups/${groupId}/schedule`);

  // Удаляем все существующие документы (можно оптимизировать под diff)
  const existing = await getDocs(scheduleRef);
  existing.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });

  // Добавляем новые
  schedule.forEach((entry) => {
    const entryRef = doc(scheduleRef, entry.id);
    batch.set(entryRef, entry);
  });

  await batch.commit();
};

// Удалить отдельное занятие
export const deleteScheduleEntry = async (groupId: string, entryId: string) => {
  const entryRef = doc(db, `groups/${groupId}/schedule/${entryId}`);
  await deleteDoc(entryRef);
}; 