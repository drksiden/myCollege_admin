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
import type { Subject } from '@/types';

const subjectFormSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Описание обязательно'),
  hoursPerWeek: z.number().min(0, 'Часов в неделю должно быть положительным числом'),
  type: z.enum(['lecture', 'practice', 'laboratory']),
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
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      hoursPerWeek: 0,
      type: 'lecture' as const,
      hoursPerSemester: 0,
      credits: 0,
      hours: 0,
    },
  });

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
        hoursPerSemester: data.hoursPerWeek * 16, // Примерный расчет на семестр
        credits: Math.ceil(data.hoursPerWeek * 16 / 36), // Примерный расчет кредитов
        hours: data.hoursPerWeek * 16, // Общее количество часов
      };

      if (mode === 'edit' && subjectId) {
        await updateSubject(db, subjectId, subjectData);
        toast.success('Предмет успешно обновлен');
      } else {
        await createSubject(db, subjectData);
        toast.success('Предмет успешно создан');
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
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
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

        <div className="flex justify-end gap-4">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Отмена
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : mode === 'edit' ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SubjectForm;