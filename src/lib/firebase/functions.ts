import { getFunctions, httpsCallable } from "firebase/functions";
import type { Group, AppUser } from "@/types";

const functions = getFunctions();

export const getTeachers = async () => {
  const getTeachersFn = httpsCallable(functions, "getTeachers");
  const result = await getTeachersFn({ data: {} });
  return (result.data as { teachers: AppUser[] }).teachers;
};

export const getGroups = async () => {
  const getGroupsFn = httpsCallable(functions, "getGroups");
  const result = await getGroupsFn({ data: {} });
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
  const result = await createGroupFn({ data });
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
  const result = await updateGroupFn({ data });
  return result.data;
};

export const deleteGroup = async (groupId: string) => {
  const deleteGroupFn = httpsCallable(functions, "deleteGroup");
  const result = await deleteGroupFn({ data: { groupId } });
  return result.data;
};

export const getGroupStudents = async (groupId: string) => {
  const getGroupStudentsFn = httpsCallable(functions, "getGroupStudents");
  const result = await getGroupStudentsFn({ data: { groupId } });
  return (result.data as { students: AppUser[] }).students;
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
  const result = await addStudentToGroupFn({ data });
  return result.data;
};

export const removeStudentFromGroup = async (groupId: string, studentId: string) => {
  const removeStudentFromGroupFn = httpsCallable(functions, "removeStudentFromGroup");
  const result = await removeStudentFromGroupFn({ data: { groupId, studentId } });
  return result.data;
}; 