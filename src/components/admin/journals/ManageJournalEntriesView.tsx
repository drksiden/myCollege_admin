import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { format, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  getJournalEntriesByDate, 
  addOrUpdateJournalEntriesForDate, 
  removeJournalEntriesForDate 
} from '@/lib/firebaseService/journalService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Journal, Group, StudentUser, JournalEntry, GradeValue } from '@/types';
import { Timestamp } from 'firebase/firestore';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Save, Loader2, Trash2 } from "lucide-react";

// Form schema for a single journal entry row
const journalEntryRowSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  attendance: z.enum(['present', 'absent', 'late', 'excused']),
  grade: z.coerce.number().optional().refine((val) => val === undefined || (val >= 0 && val <= 100), {
    message: "Grade must be between 0 and 100"
  }),
  comment: z.string(),
});

// Form schema for the entire form
const manageEntriesSchema = z.object({
  selectedDate: z.date({ required_error: "Please select a date." }),
  entries: z.array(journalEntryRowSchema),
});

type FormValues = z.infer<typeof manageEntriesSchema>;

interface StudentWithUserData extends StudentUser {
  fullName?: string;
}

interface ManageJournalEntriesViewProps {
  journal: Journal;
  group: Group | null;
  onEntriesUpdated: () => void;
  className?: string;
}

const ManageJournalEntriesView: React.FC<ManageJournalEntriesViewProps> = ({
  journal,
  group,
  onEntriesUpdated,
  className,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentsInGroup, setStudentsInGroup] = useState<StudentWithUserData[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dateToDelete, setDateToDelete] = useState<Timestamp | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(manageEntriesSchema),
    defaultValues: {
      selectedDate: startOfDay(new Date()),
      entries: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "entries"
  });

  const selectedDate = form.watch("selectedDate");

  useEffect(() => {
    const fetchStudents = async () => {
      if (!group) {
        setStudentsInGroup([]);
        return;
      }
      try {
        const { users } = await getUsers({ role: 'student' });
        const studentsWithNames = users
          .filter((user): user is StudentUser => user.role === 'student' && user.groupId === group.id)
          .map(user => ({
            ...user,
            fullName: `${user.lastName || ''} ${user.firstName || ''} ${user.middleName || ''}`.trim() || 'Безымянный студент'
          }));
        setStudentsInGroup(studentsWithNames);
      } catch (error) {
        toast.error("Не удалось загрузить студентов для группы.");
        console.error("Ошибка при загрузке студентов:", error);
        setStudentsInGroup([]);
      }
    };
    fetchStudents();
  }, [group]);

  useEffect(() => {
    if (!selectedDate || !studentsInGroup || studentsInGroup.length === 0) {
      replace([]);
      return;
    }

    const emptyEntries = studentsInGroup.map(student => ({
      studentId: student.uid,
      studentName: student.fullName || 'Unknown Student',
      attendance: 'present' as const,
      grade: undefined,
      comment: "",
    }));

    // Загружаем записи для выбранной даты
    const loadEntriesForDate = async () => {
      try {
        const entries = await getJournalEntriesByDate(journal.id, Timestamp.fromDate(startOfDay(selectedDate)));
        if (entries.length === 0) {
          replace(emptyEntries);
          return;
        }

        // Заполняем записи данными из журнала
        const filledEntries = studentsInGroup.map(student => {
          const entry = entries.find(e => e.studentId === student.uid);
          return {
            studentId: student.uid,
            studentName: student.fullName || 'Unknown Student',
            attendance: entry?.attendanceStatus || 'present',
            grade: entry?.grade ? parseInt(entry.grade) : undefined,
            comment: entry?.comment || "",
          };
        });

        replace(filledEntries);
      } catch (error) {
        console.error('Error loading journal entries:', error);
        toast.error('Не удалось загрузить записи в журнале');
        replace(emptyEntries);
      }
    };

    loadEntriesForDate();
  }, [selectedDate, studentsInGroup, journal.id, replace]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const dateForFirestore = Timestamp.fromDate(startOfDay(values.selectedDate));
      
      // Создаем записи в журнале для каждого студента
      const entries: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>[] = values.entries.map(entry => ({
        journalId: journal.id,
        lessonId: '', // TODO: Добавить lessonId
        studentId: entry.studentId,
        date: dateForFirestore,
        present: entry.attendance === 'present',
        attendanceStatus: entry.attendance,
        grade: entry.grade?.toString() as GradeValue,
        gradeType: 'current',
        comment: entry.comment,
        topicCovered: `Занятие ${format(values.selectedDate, "dd.MM.yyyy")}`,
      }));

      await addOrUpdateJournalEntriesForDate(journal.id, dateForFirestore, entries);
      toast.success('Записи в журнале обновлены');
      onEntriesUpdated();
    } catch (error) {
      console.error('Error saving journal entries:', error);
      toast.error('Не удалось сохранить записи в журнале');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntriesForDate = async () => {
    if (!dateToDelete) return;

    setIsSubmitting(true);
    try {
      await removeJournalEntriesForDate(journal.id, dateToDelete);
      toast.success('Записи в журнале удалены');
      onEntriesUpdated();
      setShowDeleteConfirm(false);
      setDateToDelete(null);
    } catch (error) {
      console.error('Error deleting journal entries:', error);
      toast.error('Не удалось удалить записи в журнале');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteConfirm = () => {
    setDateToDelete(Timestamp.fromDate(startOfDay(selectedDate)));
    setShowDeleteConfirm(true);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center justify-between">
            <FormField
              control={form.control}
              name="selectedDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Дата занятия</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={format(field.value, "yyyy-MM-dd")}
                      onChange={(e) => {
                        const date = new Date(e.target.value);
                        field.onChange(date);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="destructive"
              onClick={openDeleteConfirm}
              disabled={isSubmitting}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить записи
            </Button>
          </div>

          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Студент</TableHead>
                  <TableHead>Посещаемость</TableHead>
                  <TableHead>Оценка</TableHead>
                  <TableHead>Комментарий</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>{field.studentName}</TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`entries.${index}.attendance`}
                        render={({ field }) => (
                          <FormItem>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Выберите статус" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="present">Присутствует</SelectItem>
                                <SelectItem value="absent">Отсутствует</SelectItem>
                                <SelectItem value="late">Опоздал</SelectItem>
                                <SelectItem value="excused">Уважительная причина</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`entries.${index}.grade`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                {...field}
                                onChange={(e) => {
                                  const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                    <TableCell>
                      <FormField
                        control={form.control}
                        name={`entries.${index}.comment`}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                {...field}
                                placeholder="Комментарий"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить записи</AlertDialogTitle>
            <AlertDialogDescription>
              Вы уверены, что хотите удалить все записи за выбранную дату? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEntriesForDate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Удаление...
                </>
              ) : (
                'Удалить'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageJournalEntriesView;
