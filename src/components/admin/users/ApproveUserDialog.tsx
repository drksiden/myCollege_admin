import React, { useState, useEffect } from 'react';
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
import { getGroups } from '@/lib/firebaseService/groupService';
import type { AppUser, Group } from '@/types/index';

const formSchema = z.object({
  role: z.enum(['student', 'teacher'], {
    required_error: 'Роль обязательна',
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

type ApproveUserFormValues = z.infer<typeof formSchema>;

interface ApproveUserDialogProps {
  user: AppUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved: () => void;
}

const ApproveUserDialog: React.FC<ApproveUserDialogProps> = ({
  user,
  open,
  onOpenChange,
  onApproved,
}) => {
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

    if (open) {
      fetchGroups();
    }
  }, [open]);

  const form = useForm<ApproveUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: undefined,
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

  const selectedRole = form.watch('role');

  const onSubmit = async (values: ApproveUserFormValues) => {
    setIsLoading(true);
    try {
      await updateUser(user.uid, {
        ...user,
        role: values.role,
        status: 'active',
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
      toast.success('Пользователь успешно одобрен');
      onApproved();
      onOpenChange(false);
    } catch (error) {
      console.error('Ошибка при одобрении пользователя:', error);
      toast.error('Не удалось одобрить пользователя');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Одобрение пользователя</DialogTitle>
          <DialogDescription>
            Выберите роль и заполните необходимые поля для {user.firstName} {user.lastName}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {selectedRole === 'student' && (
              <>
                <FormField
                  control={form.control}
                  name="studentDetails.groupId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Группа</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Выберите группу" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px] overflow-y-auto">
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
            
            {selectedRole === 'teacher' && (
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

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isLoading}>
                  Отмена
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Одобрение...' : 'Одобрить'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveUserDialog; 