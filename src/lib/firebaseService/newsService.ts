import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc, getDoc, limit } from 'firebase/firestore';
import { db } from '../firebase';
import type { News } from '@/types';

// News functions
export async function createNews(data: Omit<News, 'id' | 'createdAt' | 'updatedAt'>) {
  const newsRef = collection(db, 'news');
  const newsData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(newsRef, newsData);
  
  return {
    id: docRef.id,
    ...newsData
  };
}

export async function updateNews(id: string, data: Partial<Omit<News, 'id' | 'createdAt' | 'updatedAt'>>) {
  const newsRef = doc(db, 'news', id);
  await updateDoc(newsRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteNews(id: string) {
  // Get news to check if it exists
  const newsRef = doc(db, 'news', id);
  const newsDoc = await getDoc(newsRef);
  
  if (!newsDoc.exists()) {
    throw new Error('News not found');
  }
  
  // Delete news document
  await deleteDoc(newsRef);
}

export async function publishNews(id: string) {
  const newsRef = doc(db, 'news', id);
  await updateDoc(newsRef, {
    isPublished: true,
    publishedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
}

export async function unpublishNews(id: string) {
  const newsRef = doc(db, 'news', id);
  await updateDoc(newsRef, {
    isPublished: false,
    publishedAt: null,
    updatedAt: Timestamp.now(),
  });
}

export async function getNews(options: {
  publishedOnly?: boolean;
  limit?: number;
  tags?: string[];
} = {}) {
  const { publishedOnly = false, limit: limitCount, tags } = options;
  
  let q = query(
    collection(db, 'news'),
    orderBy('createdAt', 'desc')
  );

  if (publishedOnly) {
    q = query(q, where('isPublished', '==', true));
  }

  if (tags && tags.length > 0) {
    q = query(q, where('tags', 'array-contains-any', tags));
  }

  if (limitCount) {
    q = query(q, limit(limitCount));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as News[];
}

export async function getNewsById(id: string) {
  const newsRef = doc(db, 'news', id);
  const newsDoc = await getDoc(newsRef);
  
  if (!newsDoc.exists()) {
    return null;
  }

  return {
    id: newsDoc.id,
    ...newsDoc.data(),
  } as News;
}

// Функция для валидации URL изображений
export function validateImageUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

// Функция для получения превью изображения
export function getImagePreview(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = url;
  });
}

// Экспорт всех функций
export default {
  createNews,
  updateNews,
  deleteNews,
  publishNews,
  unpublishNews,
  getNews,
  getNewsById,
  validateImageUrl,
  getImagePreview
};