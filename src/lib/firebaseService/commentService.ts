import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { Comment } from '@/types';

export async function createComment(data: Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>) {
  const commentsRef = collection(db, 'comments');
  const commentData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  return addDoc(commentsRef, commentData);
}

export async function getComments(gradeId: string) {
  const commentsRef = collection(db, 'comments');
  const q = query(
    commentsRef,
    where('gradeId', '==', gradeId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Comment[];
}

export async function deleteComment(id: string) {
  const docRef = doc(db, 'comments', id);
  await deleteDoc(docRef);
}

export async function updateComment(commentId: string, data: Partial<Omit<Comment, 'id' | 'createdAt' | 'updatedAt'>>) {
  const commentRef = doc(db, 'comments', commentId);
  const updateData = {
    ...data,
    updatedAt: Timestamp.now(),
  };
  await updateDoc(commentRef, updateData);
} 