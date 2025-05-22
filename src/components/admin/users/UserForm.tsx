// src/components/admin/users/UserForm.tsx
import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
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
import { functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'sonner';
import type { User } from '@/types';
import { motion } from 'framer-motion';

const formSchema = z.object({
  firstName: z.string().min(2, { message: "Имя должно содержать не менее 2 символов." }),
  lastName: z.string().min(2, { message: "Фамилия должна содержать не менее 2 символов." }),
  patronymic: z.string().optional(),
  email: z.string().email({ message: "Некорректный email адрес." }),
  password: z.string().min(6, { message: "Пароль должен содержать не менее 6 символов." }).optional().or(z.literal('')),
  role: z.enum(['student', 'teacher', 'admin'], { required_error: "Роль обязательна." }),
  teacherDetails: z.object({
    department: z.string().min(1, { message: "Кафедра обязательна." }),
    qualification: z.string().min(1, { message: "Квалификация обязательна." }),
  }).optional(),
  studentDetails: z.object({
    groupId: z.string().min(1, { message: "ID группы обязателен." }),
    studentId: z.string().min(1, { message: "ID студента обязателен." }),
  }).optional(),
}).refine(data => {
  if (data.role === 'teacher') {
    return !!data.teacherDetails?.department && !!data.teacherDetails?.qualification;
  }
  if (data.role === 'student') {
    return !!data.studentDetails?.groupId && !!data.studentDetails?.studentId;
  }
  return true;
}, {
  message: "Для преподавателя и студента должны быть заполнены все обязательные поля.",
  path: ["role"],
});

type UserFormValues = z.infer<typeof formSchema>;

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserSubmitSuccess: () => void;
  initialData?: User;
}

export function UserFormDialog({
  open,
  onOpenChange,
  onUserSubmitSuccess,
  initialData,
}: UserFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      patronymic: '',
      email: '',
      password: '',
      role: undefined,
      teacherDetails: undefined,
      studentDetails: undefined,
    },
  });

  const selectedRole = form.watch('role');

  useEffect(() => {
    if (initialData) {
      form.reset({
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        patronymic: initialData.patronymic || '',
        email: initialData.email,
        password: '',
        role: initialData.role,
        teacherDetails: initialData.teacherDetails,
        studentDetails: initialData.studentDetails,
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: UserFormValues) => {
    setIsLoading(true);
    try {
      if (initialData) {
        const updateUserFunction = httpsCallable(functions, 'updateUser');
        const result = await updateUserFunction({
          userId: initialData.id,
          data: values,
        });
        const resultData = result.data as { success: boolean; message: string };

        if (resultData.success) {
          toast.success(resultData.message);
          onUserSubmitSuccess();
          onOpenChange(false);
        } else {
          throw new Error(resultData.message);
        }
      } else {
        const createUserFunction = httpsCallable(functions, 'createUserOnServer');
        const result = await createUserFunction({
          ...values,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        const resultData = result.data as {
          success: boolean;
          uid?: string;
          message: string;
        };

        if (resultData.success) {
          toast.success(resultData.message);
          onUserSubmitSuccess();
          onOpenChange(false);
          form.reset();
        } else {
          throw new Error(resultData.message);
        }
      }
    } catch (error: unknown) {
      console.error('Ошибка при сохранении пользователя:', error);
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при сохранении пользователя.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Редактировать пользователя' : 'Создать нового пользователя'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Внесите изменения в информацию о пользователе'
              : 'Заполните данные для нового пользователя. Пароль можно оставить пустым, тогда пользователь сможет установить его при первом входе.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Фамилия</FormLabel>
                    <FormControl>
                      <Input placeholder="Иванов" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl>
                      <Input placeholder="Иван" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="patronymic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Отчество (если есть)</FormLabel>
                  <FormControl>
                    <Input placeholder="Иванович" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="user@example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!initialData && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Пароль (мин. 6 символов, необязательно)</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Роль</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите роль" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="student">Студент</SelectItem>
                      <SelectItem value="teacher">Преподаватель</SelectItem>
                      <SelectItem value="admin">Администратор</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedRole === 'teacher' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="teacherDetails.department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Кафедра</FormLabel>
                      <FormControl>
                        <Input placeholder="Название кафедры" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="teacherDetails.qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Квалификация</FormLabel>
                      <FormControl>
                        <Input placeholder="Квалификация" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {selectedRole === 'student' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="studentDetails.groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Группы</FormLabel>
                      <FormControl>
                        <Input placeholder="ID группы" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="studentDetails.studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Студента</FormLabel>
                      <FormControl>
                        <Input placeholder="ID студента" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Отмена
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Сохранение...' : initialData ? 'Сохранить' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}