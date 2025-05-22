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
import { db } from '@/lib/firebase';
import { updateUserInFirestore } from '@/lib/firebaseService/userService';
import type { User } from '@/types';

const formSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  email: z.string().email('Неверный формат email'),
  role: z.enum(['student', 'teacher', 'admin'], {
    required_error: 'Роль обязательна',
  }),
});

type EditUserFormValues = z.infer<typeof formSchema>;

interface EditUserDialogProps {
  user: User | null;
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
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: undefined,
    },
  });

  useEffect(() => {
    if (user && open) {
      form.reset({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      });
    } else if (!open) {
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        role: undefined,
      });
    }
  }, [user, open, form]);

  const onSubmit = async (values: EditUserFormValues) => {
    if (!user) {
      toast.error('Пользователь не выбран для редактирования');
      return;
    }
    setIsLoading(true);
    try {
      const dataToUpdate = {
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role as User['role'],
      };
      await updateUserInFirestore(db, user.uid, dataToUpdate);
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
            Изменение пароля не поддерживается в этой форме.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Имя</FormLabel>
                  <FormControl>
                    <Input placeholder="Иван" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Фамилия</FormLabel>
                  <FormControl>
                    <Input placeholder="Иванов" {...field} disabled={isLoading} />
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
                  <FormLabel>Email (только для чтения)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} readOnly disabled />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Роль</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isLoading}
                  >
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
