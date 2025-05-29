import { useEffect, useState } from 'react';
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
import { toast } from 'sonner';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import { getJournal, createJournal, updateJournal } from '@/lib/firebaseService/journalService';
import { getUsersFromFirestoreByIds } from '@/lib/firebaseService/userService';
import type { Group, Subject, Teacher, User } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const formSchema = z.object({
  groupId: z.string().min(1, 'Please select a group'),
  subjectId: z.string().min(1, 'Please select a subject'),
  teacherId: z.string().min(1, 'Please select a teacher'),
  semester: z.coerce.number().min(1).max(8),
  year: z.coerce.number().min(2000).max(2100),
});

type FormValues = z.infer<typeof formSchema>;

interface JournalMetadataFormProps {
  mode: 'create' | 'edit';
  journalId?: string;
  onFormSubmitSuccess: (journalId: string) => void;
  onCancel: () => void;
}

export const JournalMetadataForm: React.FC<JournalMetadataFormProps> = ({
  mode,
  journalId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<User[]>([]);

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
    const loadData = async () => {
      try {
        const [fetchedGroups, fetchedSubjects, fetchedTeachers] = await Promise.all([
          getAllGroups(),
          getAllSubjects(),
          getAllTeachers(),
        ]);

        setGroups(fetchedGroups);
        setSubjects(fetchedSubjects);
        setTeachers(fetchedTeachers);

        // Получаем информацию о пользователях для преподавателей
        const teacherUserIds = fetchedTeachers.map(teacher => teacher.userId);
        const fetchedUsers = await getUsersFromFirestoreByIds(teacherUserIds);
        setUsers(fetchedUsers);

        if (mode === 'edit' && journalId) {
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
        console.error('Error loading form data:', error);
        toast.error('Failed to load form data');
      }
    };

    loadData();
  }, [mode, journalId, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (mode === 'create') {
        const newJournalId = await createJournal({
          groupId: values.groupId,
          subjectId: values.subjectId,
          teacherId: values.teacherId,
          semester: values.semester,
          year: values.year,
        });
        onFormSubmitSuccess(newJournalId);
      } else if (mode === 'edit' && journalId) {
        await updateJournal(journalId, {
          groupId: values.groupId,
          subjectId: values.subjectId,
          teacherId: values.teacherId,
          semester: values.semester,
          year: values.year,
        });
        onFormSubmitSuccess(journalId);
      }
    } catch (error) {
      console.error('Error saving journal:', error);
      toast.error('Failed to save journal');
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {`${group.name} (${group.specialization}, ${group.year} год)`}
                      </SelectItem>
                    ))}
                  </ScrollArea>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите предмет" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите преподавателя" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <ScrollArea className="h-[200px]">
                    {teachers.map((teacher) => {
                      const user = users.find(u => u.uid === teacher.userId);
                      return (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {user ? `${user.lastName} ${user.firstName}${user.middleName ? ` ${user.middleName}` : ''}` : 'N/A'}
                        </SelectItem>
                      );
                    })}
                  </ScrollArea>
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
              <FormLabel>Semester</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a semester" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                    <SelectItem key={sem} value={sem.toString()}>
                      {sem}
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
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value.toString()}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a year" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Отмена
          </Button>
          <Button type="submit">
            {mode === 'create' ? 'Создать' : 'Сохранить изменения'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default JournalMetadataForm;
