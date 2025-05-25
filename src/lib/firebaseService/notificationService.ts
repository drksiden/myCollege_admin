import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, updateDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Notification } from '@/types';

export async function createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) {
  const notificationsRef = collection(db, 'notifications');
  const notificationData = {
    ...data,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  return addDoc(notificationsRef, notificationData);
}

export async function getNotifications(userId: string) {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Notification[];
}

export async function getUnreadNotifications(userId: string) {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Notification[];
}

export async function markNotificationAsRead(notificationId: string) {
  const notificationRef = doc(db, 'notifications', notificationId);
  await updateDoc(notificationRef, {
    read: true,
    updatedAt: Timestamp.now(),
  });
}

export async function markAllNotificationsAsRead(userId: string) {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const snapshot = await getDocs(q);
  const batch = writeBatch(db);
  snapshot.docs.forEach(doc => {
    batch.update(doc.ref, {
      read: true,
      updatedAt: Timestamp.now(),
    });
  });
  await batch.commit();
} 