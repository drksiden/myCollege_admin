import type { Subject, Group, GradeValue, GradeType } from '@/types';
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
  grade: z.number().min(2).max(5),
  date: z.string(),
  semesterId: z.string(),
  journalId: z.string(),
  groupId: z.string(),
});

type BulkGradeFormValues = z.infer<typeof formSchema>;

interface BulkGradeInputProps {
  subjects: Subject[];
  groups: Group[];
  onSuccess?: () => void;
}

export function BulkGradeInput({ subjects, groups, onSuccess }: BulkGradeInputProps) {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<BulkGradeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      grade: 5,
      date: new Date().toISOString().split('T')[0],
      semesterId: '',
      journalId: '',
      groupId: '',
    },
  });

  const handleSubmit = async (values: BulkGradeFormValues) => {
    if (!user) {
      toast.error('Пользователь не авторизован');
      return;
    }

    try {
      setLoading(true);
      const gradeData = {
        studentId: values.groupId, // Временно используем groupId как studentId
        journalId: values.journalId,
        semesterId: values.semesterId,
        teacherId: user.uid,
        grade: values.grade.toString() as GradeValue,
        gradeType: 'current' as GradeType,
        date: Timestamp.now(),
        attendanceStatus: 'present',
        present: true,
        topicCovered: 'completed'
      };
      await createGrade(gradeData);
      toast.success('Оценка успешно добавлена');
      onSuccess?.();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error adding grade:', error);
      toast.error('Ошибка при добавлении оценки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button>Добавить оценку</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить оценку</DialogTitle>
          <DialogDescription>
            Выберите группу и предмет для добавления оценки.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
              name="journalId"
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
              name="grade"
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
                      <SelectItem value="current_semester">Текущий семестр</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={loading}>Сохранить</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 