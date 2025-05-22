import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { createUserInAuth } from '@/lib/firebaseService/userService';
import { useGroups } from '@/hooks/useGroups';
import type { Group } from '@/hooks/useGroups';
import { format } from 'date-fns';

const today = new Date();

const formSchema = z.object({
  email: z.string().email('Неверный формат email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  middleName: z.string().optional(),
  iin: z.string()
    .min(12, 'ИИН должен содержать 12 цифр')
    .max(12, 'ИИН должен содержать 12 цифр')
    .regex(/^\d{12}$/, 'ИИН должен содержать только цифры'),
  role: z.enum(['student', 'teacher', 'admin']),
  birthDate: z.date().optional().refine(
    (date) => !date || date <= today,
    { message: 'Дата рождения не может быть в будущем' }
  ),
  phone: z.string().optional(),
  address: z.string().optional(),
  enrollmentDate: z.date().optional().refine(
    (date) => !date || date <= today,
    { message: 'Дата зачисления не может быть в будущем' }
  ),
  specialization: z.string().optional(),
  academicDegree: z.string().optional(),
  groupId: z.string().optional(),
}).refine((data) => {
  if (data.role === 'student') {
    return !!data.enrollmentDate;
  }
  return true;
}, {
  message: 'Дата зачисления обязательна для студентов',
  path: ['enrollmentDate'],
}).refine((data) => {
  if (data.role === 'teacher') {
    return !!data.specialization;
  }
  return true;
}, {
  message: 'Специализация обязательна для преподавателей',
  path: ['specialization'],
});

type FormData = z.infer<typeof formSchema>;

type CreateUserFormProps = {
  onUserCreated?: () => void;
};

export default function CreateUserForm({ onUserCreated }: CreateUserFormProps) {
  const { groups } = useGroups();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: 'student',
    },
  });

  const role = form.watch('role');

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    try {
      await createUserInAuth({
        ...data,
        enrollmentDate: data.enrollmentDate ? format(data.enrollmentDate, 'yyyy-MM-dd') : undefined,
        birthDate: data.birthDate ? format(data.birthDate, 'yyyy-MM-dd') : undefined,
      });
      
      toast.success('Пользователь успешно создан');
      form.reset();
      if (onUserCreated) onUserCreated();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error('Не удалось создать пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Создание пользователя</CardTitle>
        <CardDescription>
          Заполните форму для создания нового пользователя
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="lastName">Фамилия</Label>
              <Input
                id="lastName"
                {...form.register('lastName')}
                placeholder="Введите фамилию"
              />
              {form.formState.errors.lastName && (
                <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="firstName">Имя</Label>
              <Input
                id="firstName"
                {...form.register('firstName')}
                placeholder="Введите имя"
              />
              {form.formState.errors.firstName && (
                <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="middleName">Отчество</Label>
              <Input
                id="middleName"
                {...form.register('middleName')}
                placeholder="Введите отчество"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="iin">ИИН</Label>
              <Input
                id="iin"
                maxLength={12}
                {...form.register('iin')}
                placeholder="Введите ИИН"
              />
              {form.formState.errors.iin && (
                <p className="text-sm text-red-500">{form.formState.errors.iin.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="Введите email"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                {...form.register('password')}
                placeholder="Введите пароль"
              />
              {form.formState.errors.password && (
                <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select
                onValueChange={(value) => form.setValue('role', value as 'student' | 'teacher' | 'admin')}
                defaultValue={form.getValues('role')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите роль" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Студент</SelectItem>
                  <SelectItem value="teacher">Преподаватель</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate">Дата рождения</Label>
              <Input
                id="birthDate"
                type="date"
                {...form.register('birthDate', {
                  valueAsDate: true,
                })}
                placeholder="ГГГГ-ММ-ДД"
              />
              {form.formState.errors.birthDate && (
                <p className="text-sm text-red-500">{form.formState.errors.birthDate.message}</p>
              )}
            </div>

            {role === 'student' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="enrollmentDate">Дата зачисления</Label>
                  <Input
                    id="enrollmentDate"
                    type="date"
                    {...form.register('enrollmentDate', {
                      valueAsDate: true,
                    })}
                    placeholder="ГГГГ-ММ-ДД"
                  />
                  {form.formState.errors.enrollmentDate && (
                    <p className="text-sm text-red-500">{form.formState.errors.enrollmentDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groupId">Группа</Label>
                  <Select
                    onValueChange={(value) => form.setValue('groupId', value)}
                    value={form.getValues('groupId')}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите группу" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups.map((group: Group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {role === 'teacher' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="specialization">Специализация</Label>
                  <Input
                    id="specialization"
                    {...form.register('specialization')}
                    placeholder="Введите специализацию"
                  />
                  {form.formState.errors.specialization && (
                    <p className="text-sm text-red-500">{form.formState.errors.specialization.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="academicDegree">Ученая степень</Label>
                  <Input
                    id="academicDegree"
                    {...form.register('academicDegree')}
                    placeholder="Введите ученую степень"
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                {...form.register('phone')}
                placeholder="Введите номер телефона"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Адрес</Label>
              <Input
                id="address"
                {...form.register('address')}
                placeholder="Введите адрес"
              />
            </div>
          </div>

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Создание...' : 'Создать пользователя'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
