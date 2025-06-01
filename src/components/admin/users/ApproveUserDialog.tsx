import React, { useState } from 'react';
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

const formSchema = z.object({
  role: z.enum(['student', 'teacher'], {
    required_error: 'Роль обязательна',
  }),
  groupId: z.string().optional(),
  specialization: z.string().optional(),
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
  const form = useForm<ApproveUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: undefined,
      groupId: '',
      specialization: '',
    },
  });

  const selectedRole = form.watch('role');

  const onSubmit = async (values: ApproveUserFormValues) => {
    setIsLoading(true);
    try {
      await updateUser(user.uid, {
        ...user,
        ...values,
        status: 'active',
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
              <FormField
                control={form.control}
                name="groupId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Группа</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            {selectedRole === 'teacher' && (
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Специализация</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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