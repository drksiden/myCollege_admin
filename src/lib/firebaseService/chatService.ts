import { collection, addDoc, getDocs, query, where, orderBy, Timestamp, doc, updateDoc, deleteDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Chat, Message } from '@/types';
import { sendChatNotification, sendMassChatNotification } from './notificationService';
import { getUserById } from './userService';

// Define ChatType enum
export type ChatType = 'private' | 'group' | 'channel' | 'broadcast';

// Chat functions
export async function createChat(participants: string[], type: ChatType = 'private', name?: string) {
  const chatRef = collection(db, 'chats');
  const chatData = {
    type,
    name: type === 'group' ? name : undefined,
    participants,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  const docRef = await addDoc(chatRef, chatData);
  return {
    id: docRef.id,
    ...chatData,
  } as Chat;
}

export async function createGroupChat(name: string, participants: string[]) {
  return createChat(participants, 'group', name);
}

export async function createBroadcastChat(participants: string[]) {
  return createChat(participants, 'channel', 'Broadcast Message');
}

export async function addParticipantsToChat(chatId: string, newParticipants: string[]) {
  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);
  if (!chatDoc.exists()) throw new Error('Chat not found');
  
  const chat = chatDoc.data() as Chat;
  const updatedParticipants = [...new Set([...chat.participants, ...newParticipants])];
  
  await updateDoc(chatRef, {
    participants: updatedParticipants,
    updatedAt: Timestamp.now(),
  });
}

export async function removeParticipantFromChat(chatId: string, participantId: string) {
  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);
  if (!chatDoc.exists()) throw new Error('Chat not found');
  
  const chat = chatDoc.data() as Chat;
  const updatedParticipants = chat.participants.filter(id => id !== participantId);
  
  if (updatedParticipants.length === 0) {
    await deleteChat(chatId);
  } else {
    await updateDoc(chatRef, {
      participants: updatedParticipants,
      updatedAt: Timestamp.now(),
    });
  }
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

export async function getChat(chatId: string): Promise<Chat | null> {
  const chatRef = doc(db, 'chats', chatId);
  const chatDoc = await getDoc(chatRef);
  if (!chatDoc.exists()) return null;
  return { id: chatDoc.id, ...chatDoc.data() } as Chat;
}

// Message functions
export async function sendMessage(chatId: string, senderId: string, content: string) {
  const chat = await getChat(chatId);
  if (!chat) throw new Error('Chat not found');

  const sender = await getUserById(db, senderId);
  if (!sender) throw new Error('Sender not found');

  // For broadcast messages, we don't need to check if the sender is a participant
  if (chat.type === 'channel') {
    // Handle broadcast message
    return;
  }

  // For private and group chats, verify the sender is a participant
  if (!chat.participants.includes(senderId)) {
    throw new Error('Sender is not a participant in this chat');
  }

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
  const chatDoc = await getDoc(chatRef);
  if (!chatDoc.exists()) throw new Error('Chat not found');
  
  const chatData = chatDoc.data() as Chat;
  await updateDoc(chatRef, {
    lastMessage: {
      content,
      senderId,
      timestamp: Timestamp.now(),
    },
    updatedAt: Timestamp.now(),
  });

  // Send notifications to other participants
  const otherParticipants = chatData.participants.filter(id => id !== senderId);
  
  if (chatData.type === 'channel') {
    await sendMassChatNotification({
      userIds: otherParticipants,
      title: 'Broadcast Message',
      message: content,
      chatId,
      senderId,
      senderName: `${sender.firstName} ${sender.lastName}`
    });
  } else if (chatData.type === 'group') {
    await sendMassChatNotification({
      userIds: otherParticipants,
      title: `Новое сообщение в группе ${chatData.name}`,
      message: content,
      chatId,
      senderId,
      senderName: `${sender.firstName} ${sender.lastName}`
    });
  } else {
    for (const participantId of otherParticipants) {
      await sendChatNotification({
        userId: participantId,
        title: `Новое сообщение от ${sender.firstName} ${sender.lastName}`,
        message: content,
        chatId,
        senderId,
        senderName: `${sender.firstName} ${sender.lastName}`
      });
    }
  }

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

export async function sendMassMessage(senderId: string, content: string, recipientIds: string[]) {
  const messagesRef = collection(db, 'messages');
  
  // Create a broadcast chat if it doesn't exist
  const broadcastChat = await createBroadcastChat([senderId, ...recipientIds]);
  
  // Send message to all recipients
  const messageData = {
    chatId: broadcastChat.id,
    senderId,
    content,
    isDeleted: false,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const messageRef = await addDoc(messagesRef, messageData);
  
  // Update chat's last message
  const chatRef = doc(db, 'chats', broadcastChat.id);
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