import React, { useEffect, useState } from 'react';
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
  DialogDescription,
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
import { toast } from 'sonner';
import { updateUser } from '@/lib/firebaseService/userService';
import type { AppUser } from '@/types/index';

const baseSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  middleName: z.string().optional(),
  email: z.string().email('Неверный формат email'),
  role: z.enum(['student', 'teacher', 'admin', 'pending_approval']),
  status: z.enum(['active', 'suspended', 'pending_approval']),
});

const studentSchema = baseSchema.extend({
  role: z.literal('student'),
  groupId: z.string().min(1, 'Группа обязательна'),
  specialization: z.string().optional(),
});

const teacherSchema = baseSchema.extend({
  role: z.literal('teacher'),
  specialization: z.string().min(1, 'Специализация обязательна'),
  education: z.string().optional(),
  experience: z.coerce.number().optional(),
});

const adminSchema = baseSchema.extend({
  role: z.literal('admin'),
});

const pendingSchema = baseSchema.extend({
  role: z.literal('pending_approval'),
});

const formSchema = z.discriminatedUnion('role', [
  studentSchema,
  teacherSchema,
  adminSchema,
  pendingSchema,
]);

type EditUserFormValues = z.infer<typeof formSchema>;

interface EditUserDialogProps {
  user: AppUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUserUpdated: () => void;
}

const EditUserDialog: React.FC<EditUserDialogProps> = ({
  user,
  open,
  onOpenChange,
  onUserUpdated,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  // Type guards for role-specific fields
  const getStudentFields = (u: AppUser) => u.role === 'student' ? { groupId: u.groupId, specialization: u.specialization } : {};
  const getTeacherFields = (u: AppUser) => u.role === 'teacher' ? { specialization: u.specialization, education: u.education, experience: u.experience } : {};

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: user
      ? {
          ...user,
          ...getStudentFields(user),
          ...getTeacherFields(user),
        }
      : undefined,
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        ...user,
        ...getStudentFields(user),
        ...getTeacherFields(user),
      });
    } else if (!open) {
      form.reset();
    }
  }, [user, open, form]);

  const selectedRole = form.watch('role');

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) {
      toast.error('Пользователь не выбран для редактирования');
      return;
    }
    setIsLoading(true);
    try {
      await updateUser(user.uid, values);
      toast.success(`Пользователь ${user.email} успешно обновлен`);
      onUserUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Ошибка при обновлении пользователя:', error);
      toast.error('Не удалось обновить пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Редактирование пользователя</DialogTitle>
          <DialogDescription>
            Обновите данные для {user.firstName} {user.lastName}. Email нельзя изменить.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            {/* Общие поля */}
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel>Фамилия</FormLabel>
                <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel>Имя</FormLabel>
                <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="middleName" render={({ field }) => (
              <FormItem>
                <FormLabel>Отчество</FormLabel>
                <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} readOnly disabled /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem>
                <FormLabel>Роль</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите роль" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="student">Студент</SelectItem>
                    <SelectItem value="teacher">Преподаватель</SelectItem>
                    <SelectItem value="admin">Администратор</SelectItem>
                    <SelectItem value="pending_approval">На одобрении</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {/* Условные поля */}
            {selectedRole === 'student' && (
              <FormField control={form.control} name="groupId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Группа</FormLabel>
                  <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}
            {selectedRole === 'teacher' && (
              <>
                <FormField control={form.control} name="specialization" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Специализация</FormLabel>
                    <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="education" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Образование</FormLabel>
                    <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="experience" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Опыт (лет)</FormLabel>
                    <FormControl><Input type="number" {...field} disabled={isLoading} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
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
};

export default EditUserDialog;
