import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { Chat, Message } from '@/types';

// Chat functions
export async function createChat(participants: string[]) {
  const chatsRef = collection(db, 'chats');
  const chatData = {
    participants,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  return addDoc(chatsRef, chatData);
}

export async function getUserChats(userId: string) {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Chat[];
}

export async function deleteChat(chatId: string) {
  const chatRef = doc(db, 'chats', chatId);
  await deleteDoc(chatRef);
}

// Message functions
export async function sendMessage(chatId: string, senderId: string, content: string) {
  const messagesRef = collection(db, 'messages');
  const messageData = {
    chatId,
    senderId,
    content,
    isDeleted: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const messageRef = await addDoc(messagesRef, messageData);

  // Update chat's last message
  const chatRef = doc(db, 'chats', chatId);
  await updateDoc(chatRef, {
    lastMessage: {
      content,
      senderId,
      timestamp: Timestamp.now(),
    },
    updatedAt: Timestamp.now(),
  });

  return messageRef;
}

export async function getChatMessages(chatId: string) {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('chatId', '==', chatId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'asc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as Message[];
}

export async function deleteMessage(messageId: string) {
  const messageRef = doc(db, 'messages', messageId);
  await updateDoc(messageRef, {
    isDeleted: true,
    updatedAt: Timestamp.now(),
  });
}

// Real-time listeners
export function subscribeToChatMessages(chatId: string, callback: (messages: Message[]) => void) {
  const messagesRef = collection(db, 'messages');
  const q = query(
    messagesRef,
    where('chatId', '==', chatId),
    where('isDeleted', '==', false),
    orderBy('createdAt', 'asc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
    callback(messages);
  });
}

export function subscribeToUserChats(userId: string, callback: (chats: Chat[]) => void) {
  const chatsRef = collection(db, 'chats');
  const q = query(
    chatsRef,
    where('participants', 'array-contains', userId),
    orderBy('updatedAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Chat[];
    callback(chats);
  });
} 