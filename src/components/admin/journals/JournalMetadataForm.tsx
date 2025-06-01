import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import { getJournal, createJournal, updateJournal } from '@/lib/firebaseService/journalService';
import type { Group, Subject, TeacherUser, Journal } from '@/types';
import { toast } from 'sonner';

const formSchema = z.object({
  groupId: z.string().min(1, 'Выберите группу'),
  subjectId: z.string().min(1, 'Выберите предмет'),
  teacherId: z.string().min(1, 'Выберите преподавателя'),
  semester: z.coerce.number().min(1, 'Выберите семестр').max(8, 'Семестр должен быть от 1 до 8'),
  year: z.coerce.number().min(2000, 'Год должен быть не меньше 2000').max(2100, 'Год должен быть не больше 2100'),
});

type FormValues = z.infer<typeof formSchema>;

interface JournalMetadataFormProps {
  journalId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function JournalMetadataForm({ journalId, onSuccess, onCancel }: JournalMetadataFormProps) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupId: '',
      subjectId: '',
      teacherId: '',
      semester: 1,
      year: new Date().getFullYear(),
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, subjectsData, teachersData] = await Promise.all([
        getAllGroups(),
        getAllSubjects(),
        getUsers({ role: 'teacher' }),
      ]);

      setGroups(groupsData);
      setSubjects(subjectsData);
      setTeachers(teachersData.users as TeacherUser[]);

      if (journalId) {
        const journal = await getJournal(journalId);
        if (journal) {
          form.reset({
            groupId: journal.groupId,
            subjectId: journal.subjectId,
            teacherId: journal.teacherId,
            semester: journal.semester,
            year: journal.year,
          });
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      const journalData: Pick<Journal, 'groupId' | 'subjectId' | 'teacherId' | 'semester' | 'year'> = {
        groupId: values.groupId,
        subjectId: values.subjectId,
        teacherId: values.teacherId,
        semester: values.semester,
        year: values.year,
      };

      if (journalId) {
        await updateJournal(journalId, journalData);
        toast.success('Журнал обновлен');
      } else {
        await createJournal(journalData);
        toast.success('Журнал создан');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving journal:', error);
      toast.error('Не удалось сохранить журнал');
    } finally {
      setLoading(false);
    }
  };

  return (
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
                disabled={loading}
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
                disabled={loading}
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
          name="teacherId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Преподаватель</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={loading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.uid} value={teacher.uid}>
                      {`${teacher.lastName || ''} ${teacher.firstName || ''} ${teacher.middleName || ''}`.trim() || 'Безымянный преподаватель'}
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
          name="semester"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Семестр</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={8}
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Год</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={2000}
                  max={2100}
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            Отмена
          </Button>
          <Button type="submit" disabled={loading}>
            {journalId ? 'Обновить' : 'Создать'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
