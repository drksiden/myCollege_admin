import { collection, addDoc, getDocs, query, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { News } from '@/types';

export async function createNews(data: Omit<News, 'id' | 'createdAt' | 'updatedAt'>) {
  const newsRef = collection(db, 'news');
  const newsData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  return addDoc(newsRef, newsData);
}

export async function getNews() {
  const newsRef = collection(db, 'news');
  const q = query(newsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as News[];
}

export async function updateNews(newsId: string, data: Partial<Omit<News, 'id' | 'createdAt' | 'updatedAt'>>) {
  const newsRef = doc(db, 'news', newsId);
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  await updateDoc(newsRef, updateData);
}

export async function deleteNews(newsId: string) {
  const newsRef = doc(db, 'news', newsId);
  await deleteDoc(newsRef);
} 