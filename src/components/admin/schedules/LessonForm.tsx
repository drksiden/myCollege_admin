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
import type { Lesson, Subject } from '@/types';
import {
  addLesson,
  updateLesson,
} from '@/lib/firebaseService/scheduleService';
import { canAddLesson } from '@/lib/utils/scheduleValidation';
import { useWatch } from 'react-hook-form';
import { addMinutes, format } from 'date-fns';
import TimePicker24 from '@/components/ui/TimePicker24';

// Zod schema for the form
const lessonSchema = z.object({
  type: z.enum(['lecture', 'practice', 'laboratory'], {
    required_error: 'Тип занятия обязателен',
  }),
  dayOfWeek: z.number().min(1, 'День недели обязателен (1-7)').max(7, 'День недели должен быть от 1 до 7'),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Неверный формат времени (ЧЧ:ММ)'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Неверный формат времени (ЧЧ:ММ)'),
  subjectId: z.string().min(1, 'Предмет обязателен'),
  room: z.string().min(1, 'Аудитория обязательна').max(50, 'Название аудитории слишком длинное'),
  duration: z.number().min(1, 'Длительность должна быть больше 0'),
  weekType: z.enum(['all', 'odd', 'even']).optional(),
  isFloating: z.boolean().optional(),
}).refine(data => data.startTime < data.endTime, {
  message: "Время окончания должно быть позже времени начала",
  path: ["endTime"],
});

type LessonFormValues = z.infer<typeof lessonSchema>;

interface LessonFormProps {
  mode: 'create' | 'edit';
  scheduleId: string;
  lessonId?: string;
  subjects: Subject[];
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
  onRemoveLesson?: () => void;
  groupName: string;
  year: number;
  semester: number;
}

const LessonForm: React.FC<LessonFormProps> = ({
  mode,
  scheduleId,
  lessonId,
  subjects,
  onFormSubmitSuccess,
  onCancel,
  onRemoveLesson,
  groupName,
  year,
  semester,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [existingLessons, setExistingLessons] = useState<Lesson[]>([]);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      type: 'lecture',
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '10:30',
      subjectId: '',
      room: '',
      duration: 90,
      weekType: 'all',
      isFloating: false,
    },
  });

  const startTime = useWatch({ control: form.control, name: 'startTime' });
  const duration = useWatch({ control: form.control, name: 'duration' });
  const startTimeValue = useWatch({ control: form.control, name: 'startTime' });
  const endTimeValue = useWatch({ control: form.control, name: 'endTime' });

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

  useEffect(() => {
    if (mode === 'create' && existingLessons.length > 0) {
      const selectedDay = form.getValues('dayOfWeek');
      const lessonsOfDay = existingLessons.filter(l => l.dayOfWeek === selectedDay);
      if (lessonsOfDay.length > 0) {
        // Найти последнюю по времени пару
        const lastLesson = lessonsOfDay.reduce((a, b) => (a.endTime > b.endTime ? a : b));
        let nextStart;
        if (lastLesson.endTime === '12:55') {
          // Большая перемена
          nextStart = new Date(2000, 0, 1, 13, 25);
        } else {
          const [h, m] = lastLesson.endTime.split(':').map(Number);
          const lastEnd = new Date(2000, 0, 1, h, m);
          nextStart = addMinutes(lastEnd, 10);
        }
        const nextStartStr = format(nextStart, 'HH:mm');
        form.setValue('startTime', nextStartStr);
        // duration уже есть, endTime пересчитается автоматически
      }
    }
  }, [mode, existingLessons, form]);

  const onSubmit = async (data: LessonFormValues) => {
    setIsLoading(true);
    try {
      console.log('Starting lesson submission with data:', data);
      
      const subject = subjects.find(s => s.id === data.subjectId);
      console.log('Found subject:', subject);
      
      const newLesson: Omit<Lesson, 'id'> = {
        ...data,
        teacherId: subject?.teacherId || '',
      };
      console.log('Created new lesson object:', newLesson);

      if (mode === 'create') {
        console.log('Mode is create, fetching current schedule...');
        const currentSchedule = await getAllSchedules(db).then(schedules => 
          schedules.find(s => s.id === scheduleId)
        );
        console.log('Current schedule:', currentSchedule);
        
        if (!currentSchedule) {
          console.error('Schedule not found');
          toast.error('Расписание не найдено');
          return;
        }

        console.log('Checking if lesson can be added...');
        if (!canAddLesson(newLesson as Lesson, currentSchedule)) {
          console.error('Cannot add lesson: schedule conflict');
          toast.error('Невозможно добавить занятие: конфликт с существующим расписанием');
          return;
        }

        console.log('Adding lesson to schedule...');
        await addLesson(db, scheduleId, newLesson);
        console.log('Lesson added successfully');
        toast.success('Занятие успешно добавлено');
      } else {
        console.log('Mode is edit, updating lesson...');
        await updateLesson(db, scheduleId, lessonId!, newLesson);
        console.log('Lesson updated successfully');
        toast.success('Занятие успешно обновлено');
      }

      console.log('Calling onFormSubmitSuccess...');
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

        <div className="text-sm text-muted-foreground mb-2">
          Расписание: {groupName} ({year} г., Семестр {semester})
        </div>

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

        <FormField
          control={form.control}
          name="duration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Длительность (минут)</FormLabel>
              <FormControl>
                <Input type="number" min={1} max={300} step={1} {...field} />
              </FormControl>
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
                    min="08:00"
                    max="21:00"
                    step={5}
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
                    min="08:00"
                    max="21:00"
                    step={5}
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
                <Input type="text" placeholder="Например: 101, Онлайн" {...field} disabled={isLoading} />
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

        <FormField
          control={form.control}
          name="isFloating"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isFloating" checked={field.value} onChange={e => field.onChange(e.target.checked)} />
                <FormLabel htmlFor="isFloating">Скользящее время</FormLabel>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Отмена
          </Button>
          {mode === 'edit' && onRemoveLesson && (
            <Button type="button" variant="destructive" onClick={onRemoveLesson} disabled={isLoading}>
              Удалить занятие
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {mode === 'create' ? 'Добавить занятие' : 'Сохранить изменения'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LessonForm;
