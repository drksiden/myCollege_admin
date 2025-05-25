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
  FormDescription,
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
import {
  createSubject,
  updateSubject,
  getSubject,
} from '@/lib/firebaseService/subjectService';
import { getUsersByRole } from '@/lib/firebaseService/userService';
import type { Subject } from '@/types';
import { serverTimestamp } from 'firebase/firestore';

// Обновленная Zod-схема для SubjectForm
const subjectSchema = z.object({
  name: z.string().min(1, 'Название предмета обязательно'),
  description: z.string().min(1, 'Описание предмета обязательно'),
  hoursPerWeek: z.number().min(1, 'Количество часов должно быть положительным числом'),
  teacherId: z.string().min(1, 'Преподаватель обязателен'),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;

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
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);
  const [availableTeachers, setAvailableTeachers] = useState<Array<{ id: string; firstName: string; lastName: string; middleName?: string }>>([]);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
      hoursPerWeek: 0,
      teacherId: undefined,
    },
  });

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const teachers = await getUsersByRole(db, 'teacher');
        setAvailableTeachers(teachers.map(teacher => ({
          id: teacher.uid,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          middleName: teacher.patronymic,
        })));
      } catch (error) {
        console.error('Error loading teachers:', error);
        toast.error('Failed to load teachers');
      }
    };

    loadTeachers();
  }, []);

  useEffect(() => {
    if (mode === 'create') {
      form.reset({
        name: '',
        description: '',
        hoursPerWeek: 0,
        teacherId: undefined,
      });
    } else if (mode === 'edit' && subjectId) {
      const fetchSubjectData = async () => {
        setInitialDataLoading(true);
        try {
          const subject = await getSubject(db, subjectId);
          if (subject) {
            form.reset({
              name: subject.name,
              description: subject.description,
              hoursPerWeek: subject.hoursPerWeek,
              teacherId: subject.teacherId,
            });
          } else {
            toast.error('Subject not found.');
            if (onCancel) onCancel();
          }
        } catch (error) {
          console.error('Error fetching subject:', error);
          toast.error('Failed to load subject details.');
          if (onCancel) onCancel();
        } finally {
          setInitialDataLoading(false);
        }
      };
      fetchSubjectData();
    }
  }, [mode, subjectId, form, onCancel]);

  const onSubmit = async (values: SubjectFormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        const subjectData = {
          name: values.name,
          description: values.description,
          hoursPerWeek: values.hoursPerWeek,
          teacherId: values.teacherId || null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await createSubject(db, subjectData);
        toast.success('Предмет успешно создан');
      } else if (mode === 'edit' && subjectId) {
        const subjectData = {
          name: values.name,
          description: values.description,
          hoursPerWeek: values.hoursPerWeek,
          teacherId: values.teacherId || null,
          updatedAt: serverTimestamp(),
        };
        await updateSubject(db, subjectId, subjectData);
        toast.success('Предмет успешно обновлен');
      }
      onFormSubmitSuccess();
      if (mode === 'create') form.reset();
    } catch (error: unknown) {
      console.error('Error submitting subject form:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка при сохранении предмета');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialDataLoading && mode === 'edit') {
    return <p className="text-center p-4">Загрузка данных предмета...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название предмета</FormLabel>
              <FormControl>
                <Input placeholder="Введите название предмета" {...field} disabled={isLoading} />
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
                  {...field} 
                  disabled={isLoading}
                  className="min-h-[100px]"
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
              <FormLabel>Количество часов в неделю</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  min="1"
                  placeholder="Введите количество часов" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  disabled={isLoading} 
                />
              </FormControl>
              <FormDescription>
                Укажите, сколько часов в неделю отводится на этот предмет
              </FormDescription>
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
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {`${teacher.lastName} ${teacher.firstName} ${teacher.middleName || ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                Выберите преподавателя для этого предмета
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SubjectForm;