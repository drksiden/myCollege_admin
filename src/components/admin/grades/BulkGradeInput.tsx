import type { AppUser, Subject, Group, GradeValue, GradeType } from '@/types';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createGrade } from '@/lib/firebaseService/gradeService';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

const formSchema = z.object({
  value: z.number().min(2).max(5),
  date: z.string(),
  semesterId: z.string(),
  subjectId: z.string(),
  groupId: z.string(),
});

type BulkGradeFormValues = z.infer<typeof formSchema>;

interface BulkGradeInputProps {
  students: AppUser[];
  subjects: Subject[];
  groups: Group[];
  onSuccess?: () => void;
}

export function BulkGradeInput({ students, subjects, groups, onSuccess }: BulkGradeInputProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const form = useForm<BulkGradeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      value: 5,
      date: new Date().toISOString().split('T')[0],
      semesterId: '',
      subjectId: '',
      groupId: '',
    },
  });

  const onSubmit = async (values: BulkGradeFormValues) => {
    if (!user) return;

    try {
      const gradePromises = students.map(student => {
        const gradeData = {
          studentId: student.uid,
          value: String(values.value) as GradeValue,
          date: Timestamp.fromDate(new Date(values.date)),
          type: 'current' as GradeType,
          semesterId: values.semesterId,
          subjectId: values.subjectId,
          teacherId: user.uid,
          isPublished: true,
        };
        return createGrade(gradeData);
      });

      await Promise.all(gradePromises);
      toast.success('Оценки успешно добавлены');
      setIsDialogOpen(false);
      form.reset();
      onSuccess?.();
    } catch {
      toast.error('Ошибка при добавлении оценок');
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Добавить оценки</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить оценки</DialogTitle>
          <DialogDescription>
            Выберите группу и предмет для добавления оценок.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Группа</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
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
              name="subjectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Предмет</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите предмет" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
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
              name="value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Оценка</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={2}
                      max={5}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="semesterId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Семестр</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите семестр" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {/* Add semester options here */}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Сохранить</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 