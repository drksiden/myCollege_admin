import type { Lesson, Schedule } from '@/types';

interface TimeSlot {
  start: string; // HH:mm
  end: string; // HH:mm
}

interface ValidationError {
  type: 'time_conflict' | 'room_conflict' | 'teacher_conflict' | 'invalid_time';
  message: string;
  lessonId?: string;
}

/**
 * Конвертирует время в минуты для удобства сравнения
 */
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Проверяет, пересекаются ли два временных интервала
 */
const doTimeSlotsOverlap = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  const start1 = timeToMinutes(slot1.start);
  const end1 = timeToMinutes(slot1.end);
  const start2 = timeToMinutes(slot2.start);
  const end2 = timeToMinutes(slot2.end);

  return (start1 < end2 && end1 > start2);
};

/**
 * Проверяет, совместимы ли типы недель
 */
const areWeekTypesCompatible = (type1?: string, type2?: string): boolean => {
  if (!type1 || !type2) return true;
  if (type1 === 'all' || type2 === 'all') return true;
  return type1 !== type2;
};

/**
 * Проверяет корректность времени урока
 */
const validateLessonTime = (lesson: Lesson): ValidationError | null => {
  const start = timeToMinutes(lesson.startTime);
  const end = timeToMinutes(lesson.endTime);

  if (start >= end) {
    return {
      type: 'invalid_time',
      message: 'End time must be after start time',
      lessonId: lesson.id,
    };
  }

  // Проверка на допустимое время (например, с 8:00 до 20:00)
  const minTime = 8 * 60; // 8:00
  const maxTime = 20 * 60; // 20:00

  if (start < minTime || end > maxTime) {
    return {
      type: 'invalid_time',
      message: 'Lesson time must be between 8:00 and 20:00',
      lessonId: lesson.id,
    };
  }

  return null;
};

/**
 * Проверяет расписание на конфликты
 */
export const validateSchedule = (
  schedule: Schedule,
  existingSchedules: Schedule[] = []
): ValidationError[] => {
  const errors: ValidationError[] = [];
  const lessons = schedule.lessons;

  // Проверка каждого урока
  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];

    // Проверка корректности времени
    const timeError = validateLessonTime(lesson);
    if (timeError) {
      errors.push(timeError);
      continue;
    }

    // Проверка конфликтов с другими уроками в том же расписании
    for (let j = i + 1; j < lessons.length; j++) {
      const otherLesson = lessons[j];

      // Проверяем только если это тот же день недели
      if (lesson.dayOfWeek === otherLesson.dayOfWeek) {
        // Проверяем совместимость типов недель
        if (areWeekTypesCompatible(lesson.weekType, otherLesson.weekType)) {
          // Проверка конфликта времени
          if (doTimeSlotsOverlap(
            { start: lesson.startTime, end: lesson.endTime },
            { start: otherLesson.startTime, end: otherLesson.endTime }
          )) {
            // Проверка конфликта аудитории
            if (lesson.room === otherLesson.room) {
              errors.push({
                type: 'room_conflict',
                message: `Room conflict: ${lesson.room} is already booked at this time`,
                lessonId: lesson.id,
              });
            }

            // Проверка конфликта преподавателя
            if (lesson.teacherId === otherLesson.teacherId) {
              errors.push({
                type: 'teacher_conflict',
                message: 'Teacher is already scheduled for another lesson at this time',
                lessonId: lesson.id,
              });
            }
          }
        }
      }
    }

    // Проверка конфликтов с другими расписаниями
    for (const otherSchedule of existingSchedules) {
      if (otherSchedule.id === schedule.id) continue;

      for (const otherLesson of otherSchedule.lessons) {
        if (lesson.dayOfWeek === otherLesson.dayOfWeek) {
          if (areWeekTypesCompatible(lesson.weekType, otherLesson.weekType)) {
            if (doTimeSlotsOverlap(
              { start: lesson.startTime, end: lesson.endTime },
              { start: otherLesson.startTime, end: otherLesson.endTime }
            )) {
              // Проверка конфликта аудитории
              if (lesson.room === otherLesson.room) {
                errors.push({
                  type: 'room_conflict',
                  message: `Room conflict with another schedule: ${lesson.room} is already booked`,
                  lessonId: lesson.id,
                });
              }

              // Проверка конфликта преподавателя
              if (lesson.teacherId === otherLesson.teacherId) {
                errors.push({
                  type: 'teacher_conflict',
                  message: 'Teacher is already scheduled in another group at this time',
                  lessonId: lesson.id,
                });
              }
            }
          }
        }
      }
    }
  }

  return errors;
};

/**
 * Проверяет, можно ли добавить новый урок в расписание
 */
export const canAddLesson = (
  newLesson: Lesson,
  schedule: Schedule,
  existingSchedules: Schedule[] = []
): ValidationError[] => {
  const tempSchedule: Schedule = {
    ...schedule,
    lessons: [...schedule.lessons, newLesson],
  };

  return validateSchedule(tempSchedule, existingSchedules);
}; 