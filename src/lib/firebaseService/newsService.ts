import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc, getDoc, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import type { News } from '@/types';

// News functions
export async function createNews(data: Omit<News, 'id' | 'createdAt' | 'updatedAt'>) {
  const newsRef = collection(db, 'news');
  const newsData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  return addDoc(newsRef, newsData);
}

export async function updateNews(id: string, data: Partial<Omit<News, 'id' | 'createdAt' | 'updatedAt'>>) {
  const newsRef = doc(db, 'news', id);
  await updateDoc(newsRef, {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteNews(id: string) {
  const newsRef = doc(db, 'news', id);
  const newsDoc = await getDoc(newsRef);
  
  if (!newsDoc.exists()) {
    throw new Error('News not found');
  }

  const news = newsDoc.data() as News;
  
  // Delete associated images
  for (const image of news.images) {
    try {
      const imageRef = ref(storage, image.url);
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
    }
  }

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

// Image upload functions
export async function uploadNewsImage(file: File, newsId: string, order: number) {
  const fileExtension = file.name.split('.').pop();
  const fileName = `${newsId}/${Date.now()}.${fileExtension}`;
  const storageRef = ref(storage, `news/${fileName}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const url = await getDownloadURL(snapshot.ref);
    
    return {
      url,
      alt: file.name,
      order,
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function deleteNewsImage(imageUrl: string) {
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
} 