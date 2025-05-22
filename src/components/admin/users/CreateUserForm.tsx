import React, { useState } from 'react';
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
import { createUserInAuth } from '@/lib/firebaseService/userService';
import type { User } from '@/types';

const formSchema = z.object({
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  role: z.enum(['student', 'teacher', 'admin'], {
    required_error: 'Роль обязательна',
  }),
});

type CreateUserFormValues = z.infer<typeof formSchema>;

interface CreateUserFormProps {
  onUserCreated?: () => void;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onUserCreated }) => {
  const [isLoading, setIsLoading] = useState(false);
  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: undefined,
    },
  });

  const onSubmit = async (values: CreateUserFormValues) => {
    setIsLoading(true);
    try {
      await createUserInAuth({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        role: values.role as User['role'],
      });

      toast.success(`Пользователь ${values.email} успешно создан!`);
      form.reset();
      if (onUserCreated) {
        onUserCreated();
      }
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error);
      let errorMessage = 'Не удалось создать пользователя.';
      if (error instanceof Error) {
        if ('code' in error) {
          const firebaseError = error as { code: string };
          if (firebaseError.code === 'auth/email-already-in-use') {
            errorMessage = 'Этот email уже используется.';
          } else if (firebaseError.code === 'auth/weak-password') {
            errorMessage = 'Пароль слишком простой.';
          }
        } else {
          errorMessage = error.message;
        }
      }
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-w-md">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@example.com" {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Пароль</FormLabel>
              <FormControl>
                <Input type="password" placeholder="••••••••" {...field} disabled={isLoading} />
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
                defaultValue={field.value}
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
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Создание пользователя...' : 'Создать пользователя'}
        </Button>
      </form>
    </Form>
  );
};

export default CreateUserForm;
