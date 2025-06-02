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
import type { Semester } from '@/types';
import { Timestamp } from 'firebase/firestore';

const semesterSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  academicYear: z.string().min(1, 'Учебный год обязателен'),
  startDate: z.string().min(1, 'Дата начала обязательна'),
  endDate: z.string().min(1, 'Дата окончания обязательна'),
  status: z.enum(['planning', 'active', 'archived'] as const),
});

type SemesterFormValues = z.infer<typeof semesterSchema>;

interface SemesterFormProps {
  semester?: Semester | null;
  onSubmit: (data: Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onCancel: () => void;
}

export default function SemesterForm({ semester, onSubmit, onCancel }: SemesterFormProps) {
  const form = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: {
      name: semester?.name || '',
      academicYear: semester?.academicYear || '',
      startDate: semester?.startDate ? new Date(semester.startDate.seconds * 1000).toISOString().split('T')[0] : '',
      endDate: semester?.endDate ? new Date(semester.endDate.seconds * 1000).toISOString().split('T')[0] : '',
      status: semester?.status || 'planning',
    },
  });

  const handleSubmit = async (data: SemesterFormValues) => {
    await onSubmit({
      ...data,
      startDate: Timestamp.fromDate(new Date(data.startDate)),
      endDate: Timestamp.fromDate(new Date(data.endDate)),
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input placeholder="Например: Осенний семестр 2024-2025" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="academicYear"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Учебный год</FormLabel>
              <FormControl>
                <Input placeholder="Например: 2024-2025" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Дата начала</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Дата окончания</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите статус" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="planning">Планируется</SelectItem>
                  <SelectItem value="active">Активный</SelectItem>
                  <SelectItem value="archived">Архивный</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit">
            {semester ? 'Сохранить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Form>
  );
} 