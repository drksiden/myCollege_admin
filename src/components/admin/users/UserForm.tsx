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
  // Password is not part of the form for editing, only for creation which is removed.
  // If password change is needed, it should be a separate form/process.
  role: z.enum(['student', 'teacher', 'admin'], { required_error: "Роль обязательна." }),
  // Flattened fields
  department: z.string().optional(), // For teachers
  qualification: z.string().optional(), // For teachers
  groupId: z.string().optional(), // For students
  studentId: z.string().optional(), // For students (student's specific ID, e.g. student card number)
}).refine(data => {
  if (data.role === 'teacher') {
    return !!data.department && !!data.qualification;
  }
  if (data.role === 'student') {
    return !!data.groupId && !!data.studentId;
  }
  return true;
}, {
  message: "Для преподавателя и студента должны быть заполнены все обязательные поля (кафедра/квалификация или ID группы/ID студента).",
  path: ["role"], // This path might need adjustment or more specific paths for refined errors
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
      role: undefined,
      department: '',
      qualification: '',
      groupId: '',
      studentId: '',
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
        role: initialData.role,
        // Map from potentially nested initialData to flat form fields
        department: initialData.teacherDetails?.department || '',
        qualification: initialData.teacherDetails?.qualification || '',
        groupId: initialData.studentDetails?.groupId || '',
        studentId: initialData.studentDetails?.studentId || '',
      });
    } else {
      // Reset to default if no initial data (e.g. dialog closed and reopened without initialData)
      form.reset({
        firstName: '',
        lastName: '',
        patronymic: '',
        email: '',
        role: undefined,
        department: '',
        qualification: '',
        groupId: '',
        studentId: '',
      });
    }
  }, [initialData, form]);

  const onSubmit = async (values: UserFormValues) => {
    if (!initialData) {
      // This case should ideally not be reached if create logic is removed
      toast.error("Cannot submit form without initial data for editing.");
      return;
    }

    setIsLoading(true);
    try {
      // Prepare payload for the updateUser cloud function
      // Values from the form are already flat.
      // We just need to map form field names to cloud function expected field names if they differ.
      const payload: any = {
        email: values.email,
        firstName: values.firstName,
        lastName: values.lastName,
        patronymic: values.patronymic,
        role: values.role,
      };

      if (values.role === 'student') {
        payload.groupId = values.groupId;
        // payload.studentId = values.studentId; // This field is part of User.studentDetails, not directly on User
                                                // The updateUser cloud function expects it within studentDetails or similar if needed.
                                                // For now, assuming studentId (student card ID) is not directly updatable via this general user form's main fields.
                                                // Or, if it is, the cloud function needs to handle `studentId` at the top level.
                                                // The current `updateUser` function doesn't explicitly handle top-level `studentId`.
                                                // It's usually part of the `users` collection document.
      } else if (values.role === 'teacher') {
        payload.specialization = values.department; // Map form's `department` to `specialization`
        payload.academicDegree = values.qualification; // Map form's `qualification` to `academicDegree`
      }
      // Add other fields like iin, birthDate, phone, address if they are part of the form and updatable.
      // Currently, they are not in UserForm.tsx's form fields.

      const updateUserFunction = httpsCallable(functions, 'updateUser');
      const result = await updateUserFunction({ userId: initialData.id, ...payload });
      const resultData = result.data as { success: boolean; message: string };

      if (resultData.success) {
        toast.success(resultData.message || 'Пользователь успешно обновлен.');
        onUserSubmitSuccess();
        onOpenChange(false);
      } else {
        throw new Error(resultData.message || 'Не удалось обновить пользователя.');
      }
    } catch (error: unknown) {
      console.error('Ошибка при обновлении пользователя:', error);
      const errorMessage = error instanceof Error ? error.message : 'Произошла ошибка при обновлении пользователя.';
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
            {/* Password field is removed as this form is now only for editing */}
            {/* If password change is needed, it should be a separate feature */}
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
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Кафедра (для преподавателя)</FormLabel>
                      <FormControl>
                        <Input placeholder="Название кафедры" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="qualification"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Квалификация (для преподавателя)</FormLabel>
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
                  name="groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Группы (для студента)</FormLabel>
                      <FormControl>
                        <Input placeholder="ID группы" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="studentId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Студента (карты) (для студента)</FormLabel>
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
                {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}