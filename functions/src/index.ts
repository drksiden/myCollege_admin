import * as admin from 'firebase-admin';
import {
  onCall,
  HttpsError,
  CallableRequest,
} from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import { createUserOnServer, listUsers } from './userHandlers';

if (admin.apps.length === 0) {
  admin.initializeApp();
}
const db = admin.firestore();

setGlobalOptions({ region: 'europe-west1' }); // Используйте ваш регион

interface SubjectData {
  subjectName: string;
  teacherId: string;
  teacherName: string;
}

interface CreateGroupData {
  // Данные от клиента
  name: string;
  course: number;
  specialty: string;
  curatorId?: string | null;
  curatorName?: string;
  subjects?: Array<SubjectData>;
}

// Тип для данных, как они хранятся/возвращаются после создания (с Timestamp)
interface GroupDetails {
  name: string;
  course: number;
  specialty: string;
  curatorId: string | null;
  curatorName: string;
  subjects: Array<SubjectData>;
  studentCount: number;
  // При чтении из Firestore это будут Timestamp объекты
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
}

// Тип для объекта, который мы ПИШЕМ в Firestore (может содержать FieldValue)
interface GroupFirestoreWriteData {
  name: string;
  course: number;
  specialty: string;
  curatorId: string | null;
  curatorName: string;
  subjects: Array<SubjectData>;
  studentCount: number;
  createdAt: FirebaseFirestore.FieldValue; // Разрешаем FieldValue
  updatedAt: FirebaseFirestore.FieldValue; // Разрешаем FieldValue
}

export const createGroup = onCall(
  async (
    request: CallableRequest<CreateGroupData>
  ): Promise<{
    message: string;
    groupId: string;
    data: Partial<GroupDetails>;
  }> => {
    // ^ Возвращаемое data будет Partial<GroupDetails>, так как Timestamp'ы
    //   не будут доступны сразу без повторного чтения.

    if (!request.auth) {
      throw new HttpsError(
        'unauthenticated',
        'Пользователь не аутентифицирован.'
      );
    }

    const adminUserDocRef = db.collection('users').doc(request.auth.uid);
    try {
      const adminUserDoc = await adminUserDocRef.get();
      const adminUserData = adminUserDoc.data();
      if (
        !adminUserDoc.exists ||
        !adminUserData ||
        adminUserData.role !== 'admin'
      ) {
        throw new HttpsError('permission-denied', 'Нет прав администратора.');
      }
    } catch (error) {
      console.error('Ошибка проверки прав (createGroup):', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Ошибка проверки прав (createGroup).');
    }

    const data = request.data;

    if (!data.name || !data.course || !data.specialty) {
      throw new HttpsError(
        'invalid-argument',
        'Поля name, course, specialty обязательны.'
      );
    }

    try {
      // Используем GroupFirestoreWriteData для объекта, передаваемого в .add()
      const newGroupDataForWrite: GroupFirestoreWriteData = {
        name: data.name,
        course: Number(data.course),
        specialty: data.specialty,
        curatorId: data.curatorId || null,
        curatorName: data.curatorName || '',
        subjects: data.subjects || [],
        studentCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(), // Теперь тип совпадает
        updatedAt: admin.firestore.FieldValue.serverTimestamp(), // Теперь тип совпадает
      };

      // TODO: Валидация curatorId
      // TODO: Валидация subjects

      const groupRef = await db.collection('groups').add(newGroupDataForWrite);

      // Для возврата клиенту, мы не имеем реальных Timestamp'ов без чтения.
      // Поэтому вернем то, что есть, но тип data в Promise сделаем Partial<GroupDetails>
      // или создадим объект без createdAt/updatedAt если они обязательны в GroupDetails
      const returnedData = {
        ...newGroupDataForWrite,
        // createdAt и updatedAt здесь все еще FieldValue, а не Timestamp.
        // Чтобы вернуть реальные Timestamp, нужно было бы сделать:
        // const docSnapshot = await groupRef.get();
        // const createdData = docSnapshot.data() as GroupDetails;
        // Но это дополнительный запрос.
      };

      return {
        message: 'Группа успешно создана!',
        groupId: groupRef.id,
        data: returnedData as unknown as Partial<GroupDetails>, // Указываем, что это частичное соответствие
      };
    } catch (error) {
      console.error('Ошибка при создании группы:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('unknown', 'Произошла ошибка при создании группы.');
    }
  }
);

export { createUserOnServer, listUsers };
