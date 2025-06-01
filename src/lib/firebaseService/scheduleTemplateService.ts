import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Lesson } from '@/types';

export interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  lessons: Lesson[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export const saveScheduleTemplate = async (template: { name: string; description: string; lessons: Lesson[] }): Promise<void> => {
  const templatesRef = collection(db, 'scheduleTemplates');
  await addDoc(templatesRef, {
    ...template,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
};

export const getAllScheduleTemplates = async (): Promise<ScheduleTemplate[]> => {
  const templatesRef = collection(db, 'scheduleTemplates');
  const q = query(templatesRef, orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as ScheduleTemplate[];
};

export const deleteScheduleTemplate = async (templateId: string): Promise<void> => {
  const templateRef = doc(db, 'scheduleTemplates', templateId);
  await deleteDoc(templateRef);
};

export const updateScheduleTemplate = async (
  templateId: string,
  template: { name: string; description: string; lessons: Lesson[] }
): Promise<void> => {
  const templateRef = doc(db, 'scheduleTemplates', templateId);
  await updateDoc(templateRef, {
    ...template,
    updatedAt: Timestamp.now(),
  });
}; 