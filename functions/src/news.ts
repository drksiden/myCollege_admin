import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface NewsData {
  title: string;
  content: string;
  imageUrl?: string;
  updatedAt?: FieldValue;
}

interface UpdateNewsData {
  id: string;
  title?: string;
  content?: string;
  imageUrl?: string;
}

// Создание новости
export const createNews = async (request: { data: NewsData; auth?: { uid: string } }) => {
  const { data } = request;

  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    throw new Error('Требуется аутентификация для создания новостей');
  }

  // Проверяем, что текущий пользователь - администратор
  const adminUser = await admin.firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  if (!adminUser.exists || adminUser.data()?.role !== 'admin') {
    throw new Error('Только администраторы могут создавать новости');
  }

  try {
    const newsData = {
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl || null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    };

    const newsRef = await admin.firestore().collection('news').add(newsData);
    return { id: newsRef.id, ...newsData };
  } catch (error) {
    console.error('Error creating news:', error);
    throw new Error('Ошибка при создании новости');
  }
};

// Обновление новости
export const updateNews = async (request: { data: UpdateNewsData; auth?: { uid: string } }) => {
  const { data } = request;

  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    throw new Error('Требуется аутентификация для обновления новостей');
  }

  // Проверяем, что текущий пользователь - администратор
  const adminUser = await admin.firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  if (!adminUser.exists || adminUser.data()?.role !== 'admin') {
    throw new Error('Только администраторы могут обновлять новости');
  }

  try {
    const newsRef = admin.firestore().collection('news').doc(data.id);
    const newsDoc = await newsRef.get();

    if (!newsDoc.exists) {
      throw new Error('Новость не найдена');
    }

    const updateData: Partial<NewsData> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;

    await newsRef.update(updateData);
    return { id: data.id, ...updateData };
  } catch (error) {
    console.error('Error updating news:', error);
    throw new Error('Ошибка при обновлении новости');
  }
};

// Удаление новости
export const deleteNews = async (request: { data: { id: string }; auth?: { uid: string } }) => {
  const { data } = request;

  // Проверяем, что запрос от аутентифицированного пользователя
  if (!request.auth) {
    throw new Error('Требуется аутентификация для удаления новостей');
  }

  // Проверяем, что текущий пользователь - администратор
  const adminUser = await admin.firestore()
    .collection('users')
    .doc(request.auth.uid)
    .get();

  if (!adminUser.exists || adminUser.data()?.role !== 'admin') {
    throw new Error('Только администраторы могут удалять новости');
  }

  try {
    const newsRef = admin.firestore().collection('news').doc(data.id);
    const newsDoc = await newsRef.get();

    if (!newsDoc.exists) {
      throw new Error('Новость не найдена');
    }

    await newsRef.delete();
    return { success: true };
  } catch (error) {
    console.error('Error deleting news:', error);
    throw new Error('Ошибка при удалении новости');
  }
}; 