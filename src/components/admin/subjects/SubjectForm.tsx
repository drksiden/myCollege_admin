import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Subject {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  teacherName: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
}

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectSubmitSuccess: (data: Omit<Subject, 'id' | 'teacherName' | 'createdAt' | 'updatedAt'>) => void;
  initialData?: Subject;
  teachers: Teacher[];
}

const formSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Описание обязательно'),
  teacherId: z.string().min(1, 'Выберите преподавателя'),
});

export const SubjectFormDialog: React.FC<SubjectFormDialogProps> = ({
  open,
  onOpenChange,
  onSubjectSubmitSuccess,
  initialData,
  teachers,
}) => {
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      teacherId: initialData?.teacherId || '',
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      setIsLoading(true);
      onSubjectSubmitSuccess(data);
      onOpenChange(false);
      form.reset();
    } catch (error: unknown) {
      console.error('Error submitting form:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Произошла ошибка при сохранении предмета'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Редактировать предмет' : 'Добавить предмет'}
          </DialogTitle>
          <DialogDescription>
            Заполните форму для {initialData ? 'изменения' : 'создания'} предмета
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Название</FormLabel>
                  <FormControl>
                    <Input placeholder="Введите название предмета" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Описание</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Введите описание предмета"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="teacherId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Преподаватель</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите преподавателя" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {`${teacher.lastName} ${teacher.firstName} ${
                            teacher.patronymic || ''
                          }`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 