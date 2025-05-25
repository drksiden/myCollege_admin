import React, { useState, useEffect } from 'react';
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
import DatePicker from "@/components/date-picker/date-picker";
import SimpleDateInput from "@/components/date-picker/simple-date-input"
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  createStudentProfile,
  updateStudentProfile,
  getStudentProfile,
} from '@/lib/firebaseService/studentService';
import { updateUserInFirestore } from '@/lib/firebaseService/userService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import type { Student, Group } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Обновленная Zod-схема для StudentProfileForm
const studentProfileSchema = z.object({
  studentCardId: z.string().min(1, 'Номер студенческого билета обязателен'),
  groupId: z.string().min(1, 'Выберите группу'),
  enrollmentDate: z.date({
    required_error: 'Дата зачисления обязательна',
  }),
  dateOfBirth: z.date({
    required_error: 'Дата рождения обязательна',
  }),
  status: z.enum(['active', 'inactive', 'graduated'], {
    required_error: 'Выберите статус',
  }),
  address: z.string().min(1, 'Адрес обязателен'),
  phone: z.string().min(1, 'Номер телефона обязателен'),
});

export type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;

// Обновленный интерфейс StudentProfileFormProps
interface StudentProfileFormProps {
  mode: 'create' | 'edit';
  studentProfileId?: string;
  userId?: string;
  userName?: string;
  onFormSubmitSuccess?: () => void;
  onCancel?: () => void;
}

// Обновленный компонент StudentProfileForm
export default function StudentProfileForm({
  mode,
  studentProfileId,
  userId,
  userName,
  onFormSubmitSuccess,
  onCancel,
}: StudentProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const form = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      studentCardId: '',
      groupId: '',
      status: 'active',
      address: '',
      phone: '',
    },
  });

  // Загрузка групп при монтировании компонента
  useEffect(() => {
    const loadGroups = async () => {
      try {
        const groupsList = await getAllGroups();
        setGroups(groupsList);
      } catch (error) {
        console.error('Ошибка при загрузке групп:', error);
        toast.error('Не удалось загрузить список групп');
      }
    };

    loadGroups();
  }, []);

  // Загрузка данных профиля при редактировании
  useEffect(() => {
    const loadProfile = async () => {
      if (mode === 'edit' && studentProfileId) {
        try {
          const profile = await getStudentProfile(studentProfileId);
          if (profile) {
            form.reset({
              studentCardId: profile.studentCardId,
              groupId: profile.groupId,
              enrollmentDate: profile.enrollmentDate.toDate(),
              dateOfBirth: profile.dateOfBirth.toDate(),
              status: profile.status,
              address: profile.address || '',
              phone: profile.phone || '',
            });
          }
        } catch (error) {
          console.error('Ошибка при загрузке профиля:', error);
          toast.error('Не удалось загрузить данные профиля');
        }
      }
    };

    loadProfile();
  }, [mode, studentProfileId, form]);

  const onSubmit = async (values: StudentProfileFormValues) => {
    console.log('Отправка формы:', values);
    setIsLoading(true);
    try {
      if (mode === 'create' && !userId) {
        toast.error('Ошибка: не выбран пользователь');
        setIsLoading(false);
        return;
      }

      if (!userId) {
        throw new Error('ID пользователя не указан');
      }

      const profileData = {
        ...values,
        userId,
        enrollmentDate: Timestamp.fromDate(values.enrollmentDate),
        dateOfBirth: Timestamp.fromDate(values.dateOfBirth),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (mode === 'create') {
        console.log('Создание профиля:', profileData);
        await createStudentProfile(profileData);
        toast.success('Профиль студента успешно создан');
      } else if (mode === 'edit' && studentProfileId) {
        console.log('Обновление профиля:', { id: studentProfileId, ...profileData });
        await updateStudentProfile(studentProfileId, profileData);
        toast.success('Профиль студента успешно обновлен');
      }

      onFormSubmitSuccess?.();
      if (mode === 'create') form.reset();
    } catch (error) {
      console.error('Ошибка при сохранении профиля:', error);
      toast.error('Не удалось сохранить профиль студента');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {userName && (
          <div className="text-sm text-muted-foreground">
            Студент: <span className="font-medium">{userName}</span>
          </div>
        )}

        <FormField
          control={form.control}
          name="studentCardId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Номер студенческого билета</FormLabel>
              <FormControl>
                <Input placeholder="Введите номер студенческого билета" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="groupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Группа</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name}
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
          name="dateOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Дата рождения</FormLabel>
              <FormControl>
                <SimpleDateInput
                  date={field.value}
                  setDate={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="enrollmentDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Дата зачисления</FormLabel>
              <FormControl>
                <SimpleDateInput
                  date={field.value}
                  setDate={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Адрес</FormLabel>
              <FormControl>
                <Input placeholder="Введите адрес" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Номер телефона</FormLabel>
              <FormControl>
                <Input placeholder="Введите номер телефона" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Статус</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="inactive">Неактивный</SelectItem>
                  <SelectItem value="graduated">Выпускник</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Сохранение...' : mode === 'create' ? 'Создать' : 'Сохранить'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
