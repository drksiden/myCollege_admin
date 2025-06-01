import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Group, TeacherUser } from '@/types';
import { createGroup, updateGroup } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  year: z.coerce.number().min(2000).max(2100),
  specialization: z.string().min(1, 'Specialization is required'),
  curatorId: z.string().min(1, 'Curator ID is required'),
});

type GroupFormValues = z.infer<typeof formSchema>;

interface GroupFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: Group;
}

export default function GroupFormDialog({
  open,
  onClose,
  onSuccess,
  group,
}: GroupFormDialogProps) {
  console.log('=== Рендер GroupFormDialog ===');
  console.log('open:', open);
  console.log('group:', group);
  
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);

  useEffect(() => {
    console.log('=== Эффект открытия диалога ===');
    console.log('open:', open);
    console.log('Текущие преподаватели:', teachers);
    
    const fetchTeachers = async () => {
      try {
        console.log('=== Начало загрузки данных ===');
        const { users } = await getUsers();
        const teachersData = users.filter(user => user.role === 'teacher') as TeacherUser[];
        console.log('Полученные преподаватели:', teachersData);
        console.log('Количество преподавателей:', teachersData.length);
        setTeachers(teachersData);
        
        console.log('=== Загрузка данных завершена ===');
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        toast.error('Не удалось загрузить список преподавателей');
      }
    };

    if (open) {
      console.log('Диалог открыт, начинаем загрузку...');
      fetchTeachers();
    }
  }, [open]);

  const getTeacherName = (teacherId: string) => {
    console.log('=== Получение имени преподавателя ===');
    console.log('ID преподавателя:', teacherId);
    
    const teacher = teachers.find(t => t.uid === teacherId);
    console.log('Найденный преподаватель:', teacher);
    console.log('userId преподавателя:', teacher?.uid);
    
    if (!teacher) {
      console.log('Преподаватель не найден');
      return 'Неизвестный преподаватель';
    }
    
    const fullName = [
      teacher.lastName,
      teacher.firstName
    ].filter(Boolean).join(' ');
    
    console.log('Сформированное полное имя:', fullName);
    console.log('=== Завершение получения имени ===');
    return fullName || 'Неизвестный преподаватель';
  };

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group?.name || '',
      year: group?.year || new Date().getFullYear(),
      specialization: group?.specialization || '',
      curatorId: group?.curatorId || '',
    },
  });

  const onSubmit = async (values: GroupFormValues) => {
    try {
      setLoading(true);
      if (group) {
        await updateGroup(group.id, values);
      } else {
        await createGroup({
          name: values.name,
          year: values.year,
          specialization: values.specialization,
          curatorId: values.curatorId,
          subjectIds: [],
        });
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Ошибка при сохранении группы');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {group ? 'Edit Group' : 'Add New Group'}
          </DialogTitle>
          <DialogDescription>
            Fill in the group information below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                  <FormLabel>Specialization</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <Select
                    onValueChange={(value) => {
                      console.log('=== Изменение значения куратора ===');
                      console.log('Новое значение:', value);
                      console.log('Текущие преподаватели:', teachers);
                      field.onChange(value);
                    }}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите куратора">
                          {field.value ? getTeacherName(field.value) : "Выберите куратора"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher) => {
                        console.log('Рендер преподавателя:', teacher);
                        const name = getTeacherName(teacher.uid);
                        console.log('Имя преподавателя:', name);
                        return (
                          <SelectItem key={teacher.uid} value={teacher.uid}>
                            {name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 