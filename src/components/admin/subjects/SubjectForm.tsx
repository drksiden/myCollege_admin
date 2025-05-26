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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { createSubject, updateSubject, getSubject } from '@/lib/firebaseService/subjectService';
import { getAllTeachers, assignTeacherToGroup, removeTeacherFromGroup } from '@/lib/firebaseService/teacherService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import type { Subject, Teacher, Group } from '@/types';

const subjectFormSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Описание обязательно'),
  hoursPerWeek: z.number().min(0, 'Часов в неделю должно быть положительным числом'),
  type: z.enum(['lecture', 'practice', 'laboratory']),
  teacherId: z.string().optional(),
  groups: z.array(z.string()),
  hoursPerSemester: z.number(),
  credits: z.number(),
  hours: z.number(),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

interface SubjectFormProps {
  mode: 'create' | 'edit';
  subjectId?: string;
  onFormSubmitSuccess: (data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
}

const SubjectForm: React.FC<SubjectFormProps> = ({
  mode,
  subjectId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      hoursPerWeek: 0,
      type: 'lecture' as const,
      teacherId: 'none',
      groups: [] as string[],
      hoursPerSemester: 0,
      credits: 0,
      hours: 0,
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [teacherProfiles, allUsers, allGroups] = await Promise.all([
          getAllTeachers(),
          getUsersFromFirestore(),
          getAllGroups(),
        ]);

        // Map teacher profiles to include user names
        const userMap = new Map(allUsers.map(u => [u.uid, u]));
        const teachersWithNames = teacherProfiles.map(t => ({
          ...t,
          firstName: userMap.get(t.userId)?.firstName || '',
          lastName: userMap.get(t.userId)?.lastName || '',
          middleName: userMap.get(t.userId)?.middleName,
        }));
        setTeachers(teachersWithNames);
        setGroups(allGroups);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Не удалось загрузить данные');
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && subjectId) {
      const fetchSubjectData = async () => {
        setInitialDataLoading(true);
        try {
          const subject = await getSubject(db, subjectId);
          if (subject) {
            form.reset({
              name: subject.name,
              description: subject.description,
              hoursPerWeek: subject.hoursPerWeek,
              type: subject.type,
              teacherId: subject.teacherId || 'none',
              groups: subject.groups,
              hoursPerSemester: subject.hoursPerSemester,
              credits: subject.credits,
              hours: subject.hours,
            });
          } else {
            toast.error('Предмет не найден');
            if (onCancel) onCancel();
          }
        } catch (error) {
          console.error('Error fetching subject:', error);
          toast.error('Не удалось загрузить данные предмета');
          if (onCancel) onCancel();
        } finally {
          setInitialDataLoading(false);
        }
      };
      fetchSubjectData();
    }
  }, [mode, subjectId, form, onCancel]);

  const onSubmit = async (data: SubjectFormValues) => {
    setIsLoading(true);
    try {
      const subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        description: data.description,
        hoursPerWeek: data.hoursPerWeek,
        type: data.type,
        teacherId: data.teacherId === 'none' ? undefined : data.teacherId,
        hoursPerSemester: data.hoursPerWeek * 16, // Примерный расчет на семестр
        credits: Math.ceil(data.hoursPerWeek * 16 / 36), // Примерный расчет кредитов
        hours: data.hoursPerWeek * 16, // Общее количество часов
        groups: data.groups,
      };

      if (mode === 'edit' && subjectId) {
        // Получаем старый предмет для сравнения групп
        const oldSubject = await getSubject(db, subjectId);
        if (oldSubject) {
          // Удаляем старые группы у преподавателя
          if (oldSubject.teacherId) {
            for (const groupId of oldSubject.groups) {
              await removeTeacherFromGroup(oldSubject.teacherId, groupId);
            }
          }
        }
        await updateSubject(db, subjectId, subjectData);
        toast.success('Предмет успешно обновлен');
      } else {
        await createSubject(db, subjectData);
        toast.success('Предмет успешно создан');
      }

      // Добавляем новые группы преподавателю
      if (subjectData.teacherId) {
        for (const groupId of subjectData.groups) {
          await assignTeacherToGroup(subjectData.teacherId, groupId);
        }
      }

      onFormSubmitSuccess(subjectData);
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error('Не удалось сохранить предмет');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialDataLoading) {
    return <div>Загрузка...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input placeholder="Введите название предмета" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Введите описание предмета"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hoursPerWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Часов в неделю</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="Введите количество часов в неделю"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
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
              <FormLabel>Тип занятий</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип занятий" />
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
          name="teacherId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Преподаватель</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                defaultValue={field.value || ''}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Не выбрано</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {`${teacher.lastName} ${teacher.firstName}${teacher.middleName ? ` ${teacher.middleName}` : ''}`}
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
          name="groups"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Группы</FormLabel>
              <Select 
                onValueChange={(value) => {
                  const currentGroups = field.value || [];
                  if (!currentGroups.includes(value)) {
                    field.onChange([...currentGroups, value]);
                  }
                }}
                value=""
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группы" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {`${group.name} (${group.specialization} - ${group.year})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="mt-2 space-y-2">
                {field.value?.map((groupId) => {
                  const group = groups.find(g => g.id === groupId);
                  return group ? (
                    <div key={groupId} className="flex items-center justify-between bg-secondary p-2 rounded-md">
                      <span>{`${group.name} (${group.specialization} - ${group.year})`}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          field.onChange(field.value?.filter(id => id !== groupId));
                        }}
                      >
                        Удалить
                      </Button>
                    </div>
                  ) : null;
                })}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Отмена
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SubjectForm;