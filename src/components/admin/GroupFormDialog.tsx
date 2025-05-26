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
import type { Group, Teacher, User } from '@/types';
import { createGroup, updateGroup } from '@/lib/firebaseService/groupService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import { getUsersByRole } from '@/lib/firebaseService/userService';
import { db } from '@/lib/firebase';
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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    console.log('=== Эффект открытия диалога ===');
    console.log('open:', open);
    console.log('Текущие преподаватели:', teachers);
    console.log('Текущие пользователи:', users);
    
    const fetchTeachers = async () => {
      try {
        console.log('=== Начало загрузки данных ===');
        const fetchedTeachers = await getAllTeachers();
        console.log('Полученные преподаватели:', fetchedTeachers);
        console.log('Количество преподавателей:', fetchedTeachers.length);
        setTeachers(fetchedTeachers);
        
        const fetchedUsers = await getUsersByRole(db, 'teacher');
        console.log('Полученные пользователи:', fetchedUsers);
        console.log('Количество пользователей:', fetchedUsers.length);
        console.log('Пример пользователя:', fetchedUsers[0]);
        setUsers(fetchedUsers);
        
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
    
    const teacher = teachers.find(t => t.id === teacherId);
    console.log('Найденный преподаватель:', teacher);
    console.log('userId преподавателя:', teacher?.userId);
    
    if (!teacher) {
      console.log('Преподаватель не найден');
      return 'Неизвестный преподаватель';
    }
    
    const user = users.find(u => u.uid === teacher.userId);
    console.log('Найденный пользователь:', user);
    console.log('Данные пользователя:', {
      uid: user?.uid,
      firstName: user?.firstName,
      lastName: user?.lastName
    });
    
    if (!user) {
      console.log('Пользователь не найден');
      return 'Неизвестный преподаватель';
    }
    
    const fullName = [
      user.lastName,
      user.firstName
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
        await updateGroup(group.id, {
          name: values.name,
          year: values.year,
          specialization: values.specialization,
          curatorId: values.curatorId,
        });
        toast.success('Group updated successfully');
      } else {
        await createGroup({
          name: values.name,
          year: values.year,
          specialization: values.specialization,
          curatorId: values.curatorId,
        });
        toast.success('Group created successfully');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Failed to save group');
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
                      console.log('Текущие пользователи:', users);
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
                        const name = getTeacherName(teacher.id);
                        console.log('Имя преподавателя:', name);
                        return (
                          <SelectItem key={teacher.id} value={teacher.id}>
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