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
import { createGroup, updateGroup } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Group, TeacherUser } from '@/types';

// Zod schema for the form
const groupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  year: z.number().min(1, 'Year is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  curatorId: z.string().min(1, 'Curator is required'),
  subjectIds: z.array(z.string()),
});

type GroupFormValues = z.infer<typeof groupSchema>;

interface GroupFormProps {
  mode: 'create' | 'edit';
  groupId?: string;
  onFormSubmitSuccess: () => void;
  onCancel?: () => void;
  group?: Group;
}

const GroupForm: React.FC<GroupFormProps> = ({
  mode,
  groupId,
  onFormSubmitSuccess,
  onCancel,
  group,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: group?.name || '',
      year: typeof group?.year === 'number' ? group.year : new Date().getFullYear(),
      specialization: group?.specialization || '',
      curatorId: group?.curatorId || '',
      subjectIds: group?.subjectIds || [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const { users } = await getUsers({ role: 'teacher' });
        setTeachers(users as TeacherUser[]);
      } catch (error) {
        console.error('Error loading teachers:', error);
        toast.error('Failed to load teachers');
      }
    };
    loadData();
  }, []);

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.uid === teacherId);
    if (!teacher) return 'Неизвестный преподаватель';
    return `${teacher.lastName} ${teacher.firstName}`;
  };

  const onSubmit = async (values: GroupFormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createGroup(values);
        toast.success('Группа успешно создана');
      } else if (mode === 'edit' && groupId) {
        await updateGroup(groupId, values);
        toast.success('Группа успешно обновлена');
      }
      onFormSubmitSuccess();
    } catch (error) {
      console.error('Error submitting group:', error);
      toast.error('Не удалось сохранить группу');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название группы</FormLabel>
              <FormControl>
                <Input placeholder="например, ПИ-101, 1 курс" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Год поступления</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="например, 2023" 
                  {...field} 
                  disabled={isLoading} 
                  onChange={e => field.onChange(Number(e.target.value))}
                  value={field.value}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="specialization"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Специализация</FormLabel>
              <FormControl>
                <Input placeholder="например, Информатика, Машиностроение" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="curatorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Куратор</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите куратора">
                    {field.value ? getTeacherName(field.value) : "Выберите куратора"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.uid} value={teacher.uid}>
                      {getTeacherName(teacher.uid)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Отмена
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : (mode === 'create' ? 'Создать группу' : 'Сохранить изменения')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default GroupForm;