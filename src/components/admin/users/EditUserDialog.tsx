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
import type { AppUser, StudentUser, TeacherUser } from '@/types/index';
import { Timestamp } from 'firebase/firestore';

const baseSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  middleName: z.string().optional(),
  email: z.string().email('Неверный формат email'),
  phone: z.string().optional(),
  iin: z.string().optional(),
  role: z.enum(['student', 'teacher', 'admin', 'pending_approval']),
  status: z.enum(['active', 'suspended', 'pending_approval']),
});

const studentSchema = baseSchema.extend({
  role: z.literal('student'),
  groupId: z.string().nullable(),
  studentIdNumber: z.string().optional(),
  enrollmentDate: z.instanceof(Timestamp).optional(),
  dateOfBirth: z.instanceof(Timestamp).optional(),
});

const teacherSchema = baseSchema.extend({
  role: z.literal('teacher'),
  specialization: z.string().optional(),
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

type FormValues = z.infer<typeof formSchema>;

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
  const getStudentFields = (u: AppUser): Partial<FormValues> => {
    if (u.role !== 'student') return {};
    const student = u as StudentUser;
    return {
      groupId: student.groupId,
      studentIdNumber: student.studentIdNumber,
      enrollmentDate: student.enrollmentDate,
      dateOfBirth: student.dateOfBirth,
    };
  };

  const getTeacherFields = (u: AppUser): Partial<FormValues> => {
    if (u.role !== 'teacher') return {};
    const teacher = u as TeacherUser;
    return {
      specialization: teacher.specialization,
      education: teacher.education,
      experience: teacher.experience,
    };
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: user
      ? {
          ...user,
          ...getStudentFields(user),
          ...getTeacherFields(user),
        } as FormValues
      : undefined,
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        ...user,
        ...getStudentFields(user),
        ...getTeacherFields(user),
      } as FormValues);
    } else if (!open) {
      form.reset();
    }
  }, [user, open, form]);

  const selectedRole = form.watch('role');

  const onSubmit = async (values: FormValues) => {
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
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Телефон</FormLabel>
                <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="iin" render={({ field }) => (
              <FormItem>
                <FormLabel>ИИН</FormLabel>
                <FormControl><Input {...field} disabled={isLoading} /></FormControl>
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
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Статус</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="suspended">Неактивен</SelectItem>
                    <SelectItem value="pending_approval">Ожидает подтверждения</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {/* Условные поля для студента */}
            {selectedRole === 'student' && (
              <>
                <FormField control={form.control} name="groupId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Группа</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''} 
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="studentIdNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер студенческого</FormLabel>
                    <FormControl><Input {...field} disabled={isLoading} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="enrollmentDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата зачисления</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value?.toDate().toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date ? Timestamp.fromDate(date) : null);
                        }}
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата рождения</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value?.toDate().toISOString().split('T')[0] || ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          field.onChange(date ? Timestamp.fromDate(date) : null);
                        }}
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}
            {/* Условные поля для преподавателя */}
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
