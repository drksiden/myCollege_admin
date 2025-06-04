import type { Timestamp } from 'firebase/firestore'; // Keep this import

// --------------------
// ВСПОМОГАТЕЛЬНЫЕ ТИПЫ
// --------------------
export type UserRole = 'student' | 'teacher' | 'admin' | 'pending_approval';
export type UserStatus = 'active' | 'pending_approval' | 'suspended';
export type LessonType = 'lecture' | 'seminar' | 'lab' | 'exam';
export type WeekType = 'all' | 'odd' | 'even';
export type SemesterStatus = 'planning' | 'active' | 'archived';
export type GradeValue = '5' | '4' | '3' | '2' | 'н/а' | 'зачет' | 'незачет';
export type GradeType = 'current' | 'midterm' | 'exam' | 'final';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

// Re-export Timestamp for use in other modules
export type { Timestamp };

// --------------------
// ОСНОВНЫЕ СУЩНОСТИ
// --------------------

// 1. Пользователь (AppUser и его составляющие)
// Базовый интерфейс с общими полями для всех пользователей
export interface BaseUser {
  uid: string; // ID из Firebase Authentication
  email: string | null;
  lastName: string | null;
  firstName: string | null;
  middleName?: string | null; // Отчество (опционально)
  iin?: string | null; // ИИН (опционально)
  role: UserRole; // Дискриминирующее поле
  status: UserStatus;
  photoURL?: string; // Аватарка (опционально)
  phone?: string | null; // Телефон (опционально)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Специфичные данные для Администратора
export interface AdminUser extends BaseUser {
  role: 'admin';
  // department?: string; // Пример специфичного поля для админа
}

// Специфичные данные для Преподавателя
export interface TeacherUser extends BaseUser {
  role: 'teacher';
  specialization?: string;
  education?: string;
  experience?: number;
  // Поле `subjects: string[]` здесь не нужно, т.к. связь "Преподаватель-Предмет"
  // определяется через расписание (Lesson/ScheduleEntry).
}

// Специфичные данные для Студента
export interface StudentUser extends BaseUser {
  role: 'student';
  groupId: string | null; // ID группы, к которой приписан студент
  studentIdNumber?: string; // Номер студенческого билета (опционально)
  enrollmentDate?: Timestamp; // Дата зачисления (опционально)
  dateOfBirth?: Timestamp; // Дата рождения (опционально)
  // Поле `specialization` здесь не нужно, оно относится к группе.
}

// Данные для пользователя, ожидающего одобрения
export interface PendingUser extends BaseUser {
  role: 'pending_approval';
}

// Тип AppUser как дискриминирующее объединение
export type AppUser = AdminUser | TeacherUser | StudentUser | PendingUser;

// 2. Семестр
export interface Semester {
  id: string;
  name: string;
  academicYear: string;
  startDate: Timestamp;
  endDate: Timestamp;
  status: SemesterStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 3. Предмет
export interface Subject {
  id: string;
  name: string;
  description?: string;
  code?: string;
  hoursPerWeek?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 4. Группа
export interface Group {
  id: string;
  name: string;
  description?: string;
  year?: number;
  course?: number;
  specialization?: string;
  curatorId?: string; // uid преподавателя-куратора из коллекции users
  subjectIds: string[]; // Массив ID предметов, которые изучает эта группа
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 5. Занятие (Элемент расписания)
export interface Lesson {
  id: string;
  semesterId: string;
  groupId: string;
  subjectId: string;
  teacherId: string | null;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  type: LessonType;
  weekType: WeekType;
  topic?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 6. Журнал (Метаданные/Обложка)
export interface Journal {
  id: string;
  semesterId: string;
  groupId: string;
  subjectId: string;
  teacherId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 7. Запись в журнале (Модель А: одна запись на студента на одном занятии)
export interface JournalEntry {
  id: string;
  journalId: string;
  lessonId: string;
  studentId: string;
  date: Timestamp;
  present: boolean;
  attendanceStatus?: AttendanceStatus;
  grade?: GradeValue;
  gradeType?: GradeType;
  comment?: string;
  topicCovered?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 8. Расписание (Метаданные)
export interface Schedule {
  id: string;
  groupId: string;
  semesterId: string;
  groupName: string;
  semester: number;
  year: number;
  lessons: Lesson[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 9. Чат и Сообщения
export interface Chat {
  id: string;
  name?: string; // Если это групповой чат
  type: 'private' | 'group';
  participantIds: string[]; // Массив uid пользователей
  lastMessageText?: string; // Текст последнего сообщения для превью
  lastMessageSenderId?: string;
  lastMessageTimestamp?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string; // uid отправителя
  text: string;
  imageUrl?: string;
  createdAt: Timestamp;
  // readBy?: string[]; // Массив uid пользователей, прочитавших сообщение (может быть сложным в реализации)
}

// 10. Уведомление
export interface Notification {
  id: string;
  recipientId: string; // uid получателя
  type: string; // Например, 'new_grade', 'schedule_change', 'new_message', 'group_update'
  title: string;
  body: string;
  link?: string; // Ссылка на связанный ресурс (например, на страницу с оценкой)
  isRead: boolean;
  createdAt: Timestamp;
}

// 11. Комментарий
export interface Comment {
  id: string;
  parentId: string; // ID сущности, к которой относится комментарий
  parentType: string; // Тип родительской сущности ('news', 'journal_entry', 'subject_discussion')
  authorId: string; // uid автора
  text: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
export interface News {
  id: string;
  title: string;
  content: string;
  authorId: string; // uid автора (вероятно, админа)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isPublished: boolean;
  publishedAt?: Timestamp | null; // Дата публикации
  images?: { url: string; alt?: string; order?: number }[]; // Массив изображений
  tags?: string[]; // Теги для категоризации
}

export interface Grade {
  id: string;
  studentId: string;    // uid студента
  subjectId: string;    // ID предмета
  lessonId?: string;    // ID конкретного занятия (если оценка за занятие)
  value: GradeValue;    // Оценка (строго типизированное значение)
  type: GradeType;      // Тип оценки (текущая, рубежная, экзамен, итоговая)
  date: Timestamp;      // Дата выставления
  teacherId: string;    // uid преподавателя
  comment?: string;     // Комментарий преподавателя
  semesterId: string;   // ID семестра (для группировки оценок)
  isPublished: boolean; // Опубликована ли оценка (видна ли студенту)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 12. Шаблон расписания
export interface ScheduleTemplate {
  id: string;
  name: string;
  description?: string;
  lessons: Partial<Omit<Lesson, 'id' | 'semesterId' | 'groupId' | 'createdAt' | 'updatedAt'>>[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// 13. Запись посещаемости
export interface AttendanceEntry {
  id: string;
  lessonId: string;    // Ссылка на Lesson.id из расписания
  studentId: string;   // uid студента
  date: Timestamp;     // Фактическая дата занятия
  status: AttendanceStatus;
  comment?: string;    // Комментарий преподавателя
  recordedBy: string;  // uid того, кто отметил (преподаватель/админ)
  createdAt: Timestamp;
  updatedAt: Timestamp;
} 