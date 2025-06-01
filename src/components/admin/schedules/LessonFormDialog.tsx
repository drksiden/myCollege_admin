import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Lesson, Subject, TeacherUser } from '@/types';
import { getGroup } from '@/lib/firebaseService/groupService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import { createLesson, updateLesson } from '@/lib/firebaseService/scheduleService';

const formSchema = z.object({
  subjectId: z.string().min(1, 'Выберите предмет'),
  teacherId: z.string().min(1, 'Выберите преподавателя'),
  room: z.string().min(1, 'Укажите аудиторию'),
  type: z.enum(['lecture', 'seminar', 'lab', 'exam']),
  weekType: z.enum(['all', 'odd', 'even']),
  dayOfWeek: z.number().min(1).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Неверный формат времени'),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Неверный формат времени'),
}).refine(data => data.startTime < data.endTime, {
  message: "Время окончания должно быть позже времени начала",
  path: ["endTime"],
});

type FormValues = z.infer<typeof formSchema>;

interface LessonFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: Partial<Lesson>;
  onSave: (data: Lesson) => void;
}

const LessonFormDialog: React.FC<LessonFormDialogProps> = ({
  isOpen,
  onOpenChange,
  mode,
  initialData,
  onSave,
}) => {
  const [loading, setLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [groupSubjects, setGroupSubjects] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subjectId: initialData?.subjectId || '',
      teacherId: initialData?.teacherId || '',
      room: initialData?.room || '',
      type: initialData?.type || 'lecture',
      weekType: initialData?.weekType || 'all',
      dayOfWeek: initialData?.dayOfWeek || 1,
      startTime: initialData?.startTime || '08:30',
      endTime: initialData?.endTime || '10:00',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!initialData?.groupId) return;

      setLoading(true);
      try {
        // Получаем данные группы для фильтрации предметов
        const group = await getGroup(initialData.groupId);
        if (group) {
          setGroupSubjects(group.subjectIds);
        }

        // Получаем списки преподавателей и предметов
        const [teachersData, subjectsData] = await Promise.all([
          getUsers({ role: 'teacher' }),
          getSubjects(),
        ]);

        // Фильтруем только преподавателей
        const teacherUsers = teachersData.users.filter(user => user.role === 'teacher') as TeacherUser[];
        setTeachers(teacherUsers);
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error fetching form data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [isOpen, initialData?.groupId]);

  const onSubmit = async (data: FormValues) => {
    if (!initialData?.groupId || !initialData?.semesterId) return;

    setLoading(true);
    try {
      const lessonData: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'> = {
        ...data,
        groupId: initialData.groupId,
        semesterId: initialData.semesterId,
      };

      if (mode === 'create') {
        const newLesson = await createLesson(lessonData);
        onSave(newLesson);
      } else if (initialData.id) {
        const updatedLesson = await updateLesson(initialData.id, lessonData);
        onSave(updatedLesson);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving lesson:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Добавить занятие' : 'Редактировать занятие'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Предмет</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите предмет" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects
                        .filter(subject => groupSubjects.includes(subject.id))
                        .map((subject) => (
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
                    defaultValue={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.uid} value={teacher.uid}>
                          {`${teacher.lastName} ${teacher.firstName}`}
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
              name="room"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Аудитория</FormLabel>
                  <FormControl>
                    <Input {...field} disabled={loading} />
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип занятия" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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
              name="weekType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Тип недели</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите тип недели" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Каждую неделю</SelectItem>
                      <SelectItem value="odd">По нечетным</SelectItem>
                      <SelectItem value="even">По четным</SelectItem>
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
                    defaultValue={field.value.toString()}
                    disabled={loading}
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
                      <Input type="time" {...field} disabled={loading} />
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
                      <Input type="time" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Добавить' : 'Сохранить'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default LessonFormDialog; 