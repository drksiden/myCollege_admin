import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, updateDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Notification } from '@/types';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app } from '../firebase';

// FCM setup
const messaging = getMessaging(app);

export async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      return token;
    }
    throw new Error('Notification permission denied');
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    throw error;
  }
}

export function onMessageListener() {
  return new Promise((resolve) => {
    onMessage(messaging, (payload) => {
      resolve(payload);
    });
  });
}

// Chat notification functions
export async function sendChatNotification({
  userId,
  title,
  message,
  chatId,
  senderId,
  senderName
}: {
  userId: string;
  title: string;
  message: string;
  chatId: string;
  senderId: string;
  senderName: string;
}) {
  const notificationsRef = collection(db, 'notifications');
  const notificationData = {
    userId,
    title,
    message,
    type: 'chat',
    read: false,
    data: {
      chatId,
      senderId,
      senderName
    },
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  return addDoc(notificationsRef, notificationData);
}

export async function sendMassChatNotification({
  userIds,
  title,
  message,
  chatId,
  senderId,
  senderName
}: {
  userIds: string[];
  title: string;
  message: string;
  chatId: string;
  senderId: string;
  senderName: string;
}) {
  const batch = writeBatch(db);
  const notificationsRef = collection(db, 'notifications');

  userIds.forEach(userId => {
    const notificationRef = doc(notificationsRef);
    batch.set(notificationRef, {
      userId,
      title,
      message,
      type: 'chat',
      read: false,
      data: {
        chatId,
        senderId,
        senderName
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();
}

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