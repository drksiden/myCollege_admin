import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createGroup, updateGroup } from '@/lib/firebaseService/groupService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import type { Group, AppUser, Subject } from '@/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const groupFormSchema = z.object({
  name: z.string().min(1, 'Название группы обязательно'),
  description: z.string().optional(),
  year: z.coerce.number().min(1, 'Год обучения обязателен'),
  specialization: z.string().min(1, 'Специализация обязательна'),
  curatorId: z.string().optional(),
  subjectIds: z.array(z.string()),
});

type GroupFormValues = z.infer<typeof groupFormSchema>;

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group;
  onSuccess?: () => void;
}

export function GroupFormDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: GroupFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<AppUser[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: {
      name: '',
      description: '',
      year: 1,
      specialization: '',
      curatorId: '',
      subjectIds: [],
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        // Загружаем преподавателей и предметы
        const [teachersResponse, subjectsData] = await Promise.all([
          getUsers({ role: 'teacher' }),
          getAllSubjects(),
        ]);
        setTeachers(teachersResponse.users);
        setSubjects(subjectsData);

        if (group) {
          form.reset({
            name: group.name,
            description: group.description,
            year: group.year,
            specialization: group.specialization,
            curatorId: group.curatorId,
            subjectIds: group.subjectIds || [],
          });
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Ошибка при загрузке данных');
      }
    };

    if (open) {
      loadData();
    }
  }, [open, group, form]);

  const onSubmit = async (data: GroupFormValues) => {
    try {
      setLoading(true);
      if (group) {
        await updateGroup(group.id, data);
        toast.success('Группа успешно обновлена');
      } else {
        await createGroup(data);
        toast.success('Группа успешно создана');
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Ошибка при сохранении группы');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {group ? 'Редактировать группу' : 'Создать группу'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название группы</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Textarea {...field} />
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
                  <FormLabel>Год обучения</FormLabel>
                  <FormControl>
                    <Input type="number" min={1} max={4} {...field} />
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
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите куратора" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.uid} value={teacher.uid}>
                          {teacher.firstName} {teacher.lastName}
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
              name="subjectIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Предметы</FormLabel>
                  <select
                    multiple
                    value={field.value}
                    onChange={e => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      field.onChange(selected);
                    }}
                    className="w-full h-40 border rounded p-2 bg-background"
                    style={{ maxHeight: 200, overflowY: 'auto' }}
                  >
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={loading}>
                {loading ? 'Сохранение...' : group ? 'Обновить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 