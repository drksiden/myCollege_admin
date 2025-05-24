import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { getAllSchedules } from '@/lib/firebaseService/scheduleService';
import type { Lesson, Subject, Teacher } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import {
  addLesson,
  updateLesson,
} from '@/lib/firebaseService/scheduleService';
import { canAddLesson } from '@/lib/utils/scheduleValidation';

// Zod schema for the form
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const lessonSchema = z.object({
  subjectId: z.string().min(1, 'Предмет обязателен'),
  teacherId: z.string().min(1, 'Преподаватель обязателен'),
  dayOfWeek: z.coerce.number().min(1, 'День недели обязателен (1-7)').max(7, 'День недели должен быть от 1 до 7'),
  startTime: z.string().regex(timeRegex, 'Неверный формат времени (ЧЧ:ММ)'),
  endTime: z.string().regex(timeRegex, 'Неверный формат времени (ЧЧ:ММ)'),
  room: z.string().min(1, 'Аудитория обязательна').max(50, 'Название аудитории слишком длинное'),
  type: z.enum(['lecture', 'practice', 'laboratory'], {
    required_error: 'Тип занятия обязателен',
  }),
  weekType: z.enum(['odd', 'even', 'all']).optional(),
}).refine(data => data.startTime < data.endTime, {
  message: "Время окончания должно быть позже времени начала",
  path: ["endTime"], 
});

export type LessonFormValues = z.infer<typeof lessonSchema>;

interface LessonFormProps {
  mode: 'create' | 'edit';
  scheduleId: string;
  lessonId?: string;
  subjects: Subject[];
  teachers: Teacher[];
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
}

const LessonForm: React.FC<LessonFormProps> = ({
  mode,
  scheduleId,
  lessonId,
  subjects,
  teachers,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [existingLessons, setExistingLessons] = useState<Lesson[]>([]);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      subjectId: '',
      teacherId: '',
      dayOfWeek: 1,
      startTime: '08:30',
      endTime: '10:00',
      room: '',
      type: 'lecture',
      weekType: 'all',
    },
  });

  useEffect(() => {
    const loadExistingLessons = async () => {
      try {
        const schedules = await getAllSchedules(db);
        const currentSchedule = schedules.find(s => s.id === scheduleId);
        if (currentSchedule) {
          setExistingLessons(currentSchedule.lessons);
        }
      } catch (error) {
        console.error('Failed to load existing lessons:', error);
        toast.error('Не удалось загрузить существующие занятия');
      }
    };

    loadExistingLessons();
  }, [scheduleId]);

  useEffect(() => {
    if (mode === 'edit' && lessonId) {
      const lesson = existingLessons.find(l => l.id === lessonId);
      if (lesson) {
        form.reset({
          subjectId: lesson.subjectId,
          teacherId: lesson.teacherId,
          dayOfWeek: lesson.dayOfWeek,
          startTime: lesson.startTime,
          endTime: lesson.endTime,
          room: lesson.room,
          type: lesson.type,
          weekType: lesson.weekType || 'all',
        });
      }
    }
  }, [mode, lessonId, existingLessons, form]);

  const onSubmit = async (data: LessonFormValues) => {
    setIsLoading(true);
    try {
      const newLesson: Lesson = {
        id: lessonId || uuidv4(),
        ...data,
      };

      if (mode === 'create') {
        const currentSchedule = await getAllSchedules(db).then(schedules => 
          schedules.find(s => s.id === scheduleId)
        );
        if (!currentSchedule) {
          toast.error('Расписание не найдено');
          return;
        }
        if (!canAddLesson(newLesson, currentSchedule)) {
          toast.error('Невозможно добавить занятие: конфликт с существующим расписанием');
          return;
        }
        await addLesson(db, scheduleId, newLesson);
        toast.success('Занятие успешно добавлено');
      } else {
        await updateLesson(db, scheduleId, lessonId!, newLesson);
        toast.success('Занятие успешно обновлено');
      }

      onFormSubmitSuccess();
    } catch (error) {
      console.error('Failed to save lesson:', error);
      toast.error('Не удалось сохранить занятие');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="subjectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Предмет</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите предмет" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="teacherId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Преподаватель</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="dayOfWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>День недели</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(parseInt(value))}
                value={field.value.toString()}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите день недели" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">Понедельник</SelectItem>
                  <SelectItem value="2">Вторник</SelectItem>
                  <SelectItem value="3">Среда</SelectItem>
                  <SelectItem value="4">Четверг</SelectItem>
                  <SelectItem value="5">Пятница</SelectItem>
                  <SelectItem value="6">Суббота</SelectItem>
                  <SelectItem value="7">Воскресенье</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Время начала</FormLabel>
                <FormControl>
                  <Input type="time" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Время окончания</FormLabel>
                <FormControl>
                  <Input type="time" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="room"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Аудитория</FormLabel>
              <FormControl>
                <Input placeholder="Например: Аудитория 101, Онлайн" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тип занятия</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="lecture">Лекция</SelectItem>
                  <SelectItem value="practice">Практика</SelectItem>
                  <SelectItem value="laboratory">Лабораторная работа</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="weekType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Тип недели</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип недели" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="all">Все недели</SelectItem>
                  <SelectItem value="odd">Нечетные недели</SelectItem>
                  <SelectItem value="even">Четные недели</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading}>
            {mode === 'create' ? 'Добавить занятие' : 'Сохранить изменения'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LessonForm;
