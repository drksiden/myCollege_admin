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
import { toast } from 'sonner';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { getGroups } from '@/lib/firebaseService/groupService';
import type { Group } from '@/lib/firebaseService/groupService';

const createUserSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  firstName: z.string().min(1, 'Имя обязательно'),
  lastName: z.string().min(1, 'Фамилия обязательна'),
  middleName: z.string().optional(),
  iin: z.string().min(1, 'ИИН обязателен'),
  phone: z.string().optional(),
  status: z.enum(['active', 'inactive']),
  role: z.enum(['student', 'teacher', 'admin'], {
    required_error: 'Выберите роль',
  }),
  studentDetails: z.object({
    groupId: z.string().min(1, 'Группа обязательна для студента'),
    studentIdNumber: z.string().optional(),
    enrollmentDate: z.date().optional(),
    dateOfBirth: z.date().optional(),
  }).optional(),
  teacherDetails: z.object({
    specialization: z.string().min(1, 'Специализация обязательна для преподавателя'),
    education: z.string().min(1, 'Образование обязательно для преподавателя'),
    experience: z.number().min(0, 'Опыт не может быть отрицательным').optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'student' && !data.studentDetails?.groupId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Группа обязательна для студента',
      path: ['studentDetails', 'groupId'],
    });
  }
  if (data.role === 'teacher' && !data.teacherDetails?.specialization) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Специализация обязательна для преподавателя',
      path: ['teacherDetails', 'specialization'],
    });
  }
  if (data.role === 'teacher' && !data.teacherDetails?.education) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Образование обязательно для преподавателя',
      path: ['teacherDetails', 'education'],
    });
  }
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

interface CreateUserFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateUserForm: React.FC<CreateUserFormProps> = ({ onSuccess, onCancel }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupsList = await getGroups();
        setGroups(groupsList);
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast.error('Не удалось загрузить список групп');
      }
    };

    fetchGroups();
  }, []);

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      middleName: '',
      iin: '',
      phone: '',
      status: 'active',
      role: 'student',
      studentDetails: {
        groupId: '',
        studentIdNumber: '',
      },
      teacherDetails: {
        specialization: '',
        education: '',
        experience: 0,
      },
    },
  });

  // Очищаем детали при смене роли
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'role') {
        if (value.role !== 'student') {
          form.setValue('studentDetails', undefined);
        }
        if (value.role !== 'teacher') {
          form.setValue('teacherDetails', undefined);
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  const onSubmit = async (values: CreateUserFormValues) => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const createUserFn = httpsCallable(functions, 'createUser');
      const result = await createUserFn({
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        middleName: values.middleName,
        iin: values.iin,
        phone: values.phone,
        status: values.status,
        role: values.role,
        ...(values.role === 'student' ? {
          groupId: values.studentDetails?.groupId,
          studentIdNumber: values.studentDetails?.studentIdNumber,
          enrollmentDate: values.studentDetails?.enrollmentDate,
          dateOfBirth: values.studentDetails?.dateOfBirth,
        } : {}),
        ...(values.role === 'teacher' ? {
          specialization: values.teacherDetails?.specialization,
          education: values.teacherDetails?.education,
          experience: values.teacherDetails?.experience,
        } : {}),
      });
      
      console.log('Create user result:', result);
      const data = result.data as { success: boolean; message: string; data: unknown };
      if (data.success) {
        toast.success(data.message);
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
      } else {
        throw new Error(data.message || 'Ошибка при создании пользователя');
      }
    } catch (error) {
      console.error('Ошибка при создании пользователя:', error);
      
      // Обработка различных типов ошибок
      if (error && typeof error === 'object') {
        const errorObj = error as { code?: string; details?: string; message?: string };
        
        // Ошибка уже существующего email
        if (errorObj.code === 'functions/already-exists' || errorObj.details === 'Пользователь с таким email уже существует.') {
          form.setError('email', { message: 'Пользователь с таким email уже существует.' });
          return;
        }
        
        // Ошибка некорректного пароля
        if (errorObj.code === 'functions/invalid-argument' && errorObj.details?.includes('пароль')) {
          form.setError('password', { message: 'Пароль слишком простой или некорректный.' });
          return;
        }
        
        // Ошибка некорректного email
        if (errorObj.code === 'functions/invalid-argument' && errorObj.details?.includes('email')) {
          form.setError('email', { message: 'Некорректный email.' });
          return;
        }
        
        // Ошибка прав доступа
        if (errorObj.code === 'functions/permission-denied') {
          toast.error('У вас нет прав для создания пользователей');
          return;
        }
        
        // Ошибка аутентификации
        if (errorObj.code === 'functions/unauthenticated') {
          toast.error('Требуется аутентификация');
          return;
        }
      }
      
      // Общая ошибка
      toast.error(error instanceof Error ? error.message : 'Не удалось создать пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4 max-w-xl w-full mx-auto bg-white dark:bg-zinc-900 p-6 rounded-lg shadow max-h-[80vh] overflow-auto"
        aria-describedby="create-user-form-description"
      >
        <div id="create-user-form-description" className="sr-only">
          Форма создания нового пользователя
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="Введите email" {...field} disabled={isLoading} />
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
                  <Input type="password" placeholder="Введите пароль" {...field} disabled={isLoading} />
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
                  <Input placeholder="Введите имя" {...field} disabled={isLoading} />
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
                  <Input placeholder="Введите фамилию" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="middleName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Отчество</FormLabel>
                <FormControl>
                  <Input placeholder="Введите отчество" {...field} disabled={isLoading} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="iin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ИИН</FormLabel>
                <FormControl>
                  <Input placeholder="Введите ИИН" {...field} disabled={isLoading} />
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
                <FormLabel>Телефон</FormLabel>
                <FormControl>
                  <Input placeholder="Введите телефон" {...field} disabled={isLoading} />
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
                <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите статус" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="active">Активен</SelectItem>
                    <SelectItem value="inactive">Неактивен</SelectItem>
                  </SelectContent>
                </Select>
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
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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

          {form.watch('role') === 'student' && (
            <>
              <FormField
                control={form.control}
                name="studentDetails.groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Группа</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
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
                name="studentDetails.studentIdNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Номер студенческого</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите номер студенческого" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studentDetails.enrollmentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата зачисления</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studentDetails.dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Дата рождения</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          {form.watch('role') === 'teacher' && (
            <>
              <FormField
                control={form.control}
                name="teacherDetails.specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Специализация</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите специализацию" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teacherDetails.education"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Образование</FormLabel>
                    <FormControl>
                      <Input placeholder="Введите образование" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="teacherDetails.experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Опыт (лет)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        placeholder="Введите опыт работы" 
                        {...field} 
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}
        </div>
        <div className="flex justify-end space-x-2 mt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Отмена
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Создание...' : 'Создать пользователя'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CreateUserForm;
