import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getSubject, createSubject, updateSubject } from '@/lib/firebaseService/subjectService';

const subjectSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  hoursPerWeek: z.number().min(0, 'Количество часов должно быть положительным'),
});

type SubjectFormData = z.infer<typeof subjectSchema>;

interface SubjectFormProps {
  mode: 'create' | 'edit';
  subjectId?: string;
  onFormSubmitSuccess: () => void;
  onCancel: () => void;
}

export default function SubjectForm({ mode, subjectId, onFormSubmitSuccess, onCancel }: SubjectFormProps) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<SubjectFormData>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
      hoursPerWeek: 0,
    },
  });

  useEffect(() => {
    if (mode === 'edit' && subjectId) {
      const fetchSubject = async () => {
        try {
          const subject = await getSubject(subjectId);
          if (subject) {
            reset({
              name: subject.name,
              description: subject.description,
              hoursPerWeek: subject.hoursPerWeek,
            });
          }
        } catch (error) {
          console.error('Error fetching subject:', error);
          toast.error('Не удалось загрузить данные предмета');
        }
      };
      fetchSubject();
    }
  }, [mode, subjectId, reset]);

  const onSubmit = async (data: SubjectFormData) => {
    try {
      setLoading(true);
      if (mode === 'edit' && subjectId) {
        await updateSubject(subjectId, data);
        toast.success('Предмет успешно обновлен');
      } else {
        await createSubject(data);
        toast.success('Предмет успешно создан');
      }
      onFormSubmitSuccess();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить предмет');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Название
        </label>
        <Input
          id="name"
          {...register('name')}
          placeholder="Введите название предмета"
        />
        {errors.name && (
          <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Описание
        </label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Введите описание предмета"
        />
        {errors.description && (
          <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
        )}
      </div>

      <div>
        <label htmlFor="hoursPerWeek" className="block text-sm font-medium mb-1">
          Часов в неделю
        </label>
        <Input
          id="hoursPerWeek"
          type="number"
          {...register('hoursPerWeek', { valueAsNumber: true })}
          placeholder="Введите количество часов в неделю"
        />
        {errors.hoursPerWeek && (
          <p className="text-sm text-red-500 mt-1">{errors.hoursPerWeek.message}</p>
        )}
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Сохранение...' : mode === 'edit' ? 'Сохранить' : 'Создать'}
        </Button>
      </div>
    </form>
  );
}