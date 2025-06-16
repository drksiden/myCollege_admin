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
import type { Lesson, Subject, TeacherUser, Group } from '@/types';
import { getGroupSchedule } from '@/lib/firebaseService/scheduleService';
import { canAddLesson } from '@/lib/utils/scheduleValidation';
import { useWatch } from 'react-hook-form';
import { addMinutes, format } from 'date-fns';
import TimePicker24 from '@/components/ui/TimePicker24';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Timestamp } from 'firebase/firestore';

// Zod schema for the form
const lessonSchema = z.object({
  type: z.enum(['lecture', 'seminar', 'lab', 'exam'] as const, {
    required_error: 'Тип занятия обязателен',
  }),
  dayOfWeek: z.number().min(1, 'День недели обязателен (1-7)').max(7, 'День недели должен быть от 1 до 7'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Неверный формат времени (ЧЧ:ММ)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Неверный формат времени (ЧЧ:ММ)'),
  subjectId: z.string().min(1, 'Предмет обязателен'),
  room: z.string().min(1, 'Аудитория обязательна').max(50, 'Название аудитории слишком длинное'),
  duration: z.number().min(1, 'Длительность должна быть больше 0'),
  weekType: z.enum(['all', 'odd', 'even'] as const),
  isFloating: z.boolean().optional(),
  teacherId: z.string().nullable(),
}).refine(data => data.startTime < data.endTime, {
  message: "Время окончания должно быть позже времени начала",
  path: ["endTime"],
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface LessonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onDelete: (id: string) => void;
  subjects: Subject[];
  teachers: TeacherUser[];
  groupId: string;
  semesterId: string;
  lesson: Lesson | null;
  groups: Group[];
}

const LessonForm: React.FC<LessonFormProps> = ({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  subjects,
  teachers,
  groupId,
  semesterId,
  lesson,
  groups,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [existingLessons, setExistingLessons] = useState<Lesson[]>([]);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      type: 'lecture',
      dayOfWeek: 1,
      startTime: '08:00',
      endTime: '09:30',
      subjectId: '',
      room: '',
      duration: 90,
      weekType: 'all',
      isFloating: false,
      teacherId: 'no_teacher',
    },
  });

  const startTime = useWatch({ control: form.control, name: 'startTime' });
  const duration = useWatch({ control: form.control, name: 'duration' });
  const startTimeValue = useWatch({ control: form.control, name: 'startTime' });
  const endTimeValue = useWatch({ control: form.control, name: 'endTime' });

  useEffect(() => {
    if (lesson) {
      const allowedTypes = ['lecture', 'seminar', 'lab', 'exam'];
      const safeType = allowedTypes.includes(lesson.type) ? lesson.type : 'lecture';
      form.reset({
        type: safeType,
        dayOfWeek: lesson.dayOfWeek,
        startTime: lesson.startTime,
        endTime: lesson.endTime,
        subjectId: lesson.subjectId,
        room: lesson.room,
        duration: 90, // TODO: Calculate from start and end time
        weekType: lesson.weekType,
        isFloating: false,
        teacherId: lesson.teacherId,
      });
    } else {
      form.reset({
        type: 'lecture',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:30',
        subjectId: '',
        room: '',
        duration: 90,
        weekType: 'all',
        isFloating: false,
        teacherId: 'no_teacher',
      });
    }
  }, [lesson, form]);

  useEffect(() => {
    if (startTime && duration) {
      const [h, m] = startTime.split(':').map(Number);
      const startDate = new Date(2000, 0, 1, h, m);
      const endDate = addMinutes(startDate, Number(duration));
      const endTimeStr = format(endDate, 'HH:mm');
      form.setValue('endTime', endTimeStr);
    }
  }, [startTime, duration, form]);

  useEffect(() => {
    if (form.getValues('startTime') && form.getValues('endTime')) {
      const [sh, sm] = form.getValues('startTime').split(':').map(Number);
      const [eh, em] = form.getValues('endTime').split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const start = sh * 60 + sm;
        const end = eh * 60 + em;
        const diff = end - start;
        if (diff > 0) form.setValue('duration', diff);
      }
    }
  }, [startTimeValue, endTimeValue, form]);

  useEffect(() => {
    const loadExistingLessons = async () => {
      try {
        const lessons = await getGroupSchedule({ 
          groupId,
          semesterId
        });
        setExistingLessons(lessons || []);
      } catch (error) {
        console.error('Failed to load existing lessons:', error);
        toast.error('Не удалось загрузить существующие занятия');
      }
    };

    loadExistingLessons();
  }, [groupId, semesterId]);

  const handleSubmit = async (data: LessonFormValues) => {
    setIsLoading(true);
    try {
      const subject = subjects.find(s => s.id === data.subjectId);
      if (!subject) {
        toast.error('Предмет не найден');
        return;
      }

      const newLesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        teacherId: data.teacherId === 'no_teacher' ? null : data.teacherId,
        groupId,
        semesterId,
      };

      const schedule = {
        id: `${semesterId}_${groupId}`,
        semesterId,
        groupId,
        groupName: group?.name || 'Unknown Group',
        lessons: existingLessons,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        semester: 1, // TODO: заменить на актуальное значение
        year: 2024,  // TODO: заменить на актуальное значение
      };

      const validationErrors = canAddLesson(newLesson as Lesson, schedule);
      if (validationErrors.length > 0) {
        console.log('Validation errors:', validationErrors, newLesson, existingLessons);
        toast.error(`Невозможно добавить занятие: ${validationErrors[0].message}`);
        return;
      }

      await onSubmit(newLesson);
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Failed to save lesson:', error);
      toast.error('Не удалось сохранить занятие');
    } finally {
      setIsLoading(false);
    }
  };

  // Получаем только предметы, привязанные к группе
  const group = groups?.find(g => g.id === groupId);
  const groupSubjects = subjects.filter(subject => group?.subjectIds.includes(subject.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить занятие</DialogTitle>
          <DialogDescription>
            Заполните форму для добавления нового занятия в расписание
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Предмет</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите предмет" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      {groupSubjects.map(subject => (
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
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ''} 
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="no_teacher">Нет преподавателя</SelectItem>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.uid} value={teacher.uid}>
                          {`${teacher.lastName} ${teacher.firstName} ${teacher.middleName || ''}`}
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип занятия</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип занятия" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="lecture">Лекция</SelectItem>
                      <SelectItem value="seminar">Семинар</SelectItem>
                      <SelectItem value="lab">Лабораторная</SelectItem>
                      <SelectItem value="exam">Экзамен</SelectItem>
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
                  <Select onValueChange={(value) => field.onChange(Number(value))} value={field.value.toString()} disabled={isLoading}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите день недели" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="1">Понедельник</SelectItem>
                      <SelectItem value="2">Вторник</SelectItem>
                      <SelectItem value="3">Среда</SelectItem>
                      <SelectItem value="4">Четверг</SelectItem>
                      <SelectItem value="5">Пятница</SelectItem>
                      <SelectItem value="6">Суббота</SelectItem>
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
                      <TimePicker24
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
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
                      <TimePicker24
                        value={field.value}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
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
                    <Input {...field} disabled={isLoading} />
                  </FormControl>
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
                    <SelectContent className="max-h-60 overflow-y-auto">
                      <SelectItem value="all">Каждую неделю</SelectItem>
                      <SelectItem value="odd">По нечетным</SelectItem>
                      <SelectItem value="even">По четным</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Сохранение...' : lesson ? 'Сохранить' : 'Добавить'}
              </Button>
              {lesson && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => {
                    onDelete(lesson.id);
                    onOpenChange(false);
                  }}
                >
                  Удалить
                </Button>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LessonForm;
