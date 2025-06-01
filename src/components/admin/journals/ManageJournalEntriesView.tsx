import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { format, startOfDay, isEqual } from "date-fns";
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
import { addOrUpdateJournalEntriesForDate, removeJournalEntriesForDate } from '@/lib/firebaseService/journalService';
import { getUsers } from '@/lib/firebaseService/userService';
import type { Journal, Group, StudentUser } from '@/types';
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
  attendance: z.enum(['present', 'absent', 'late']),
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
  const [isStudentDataLoading, setIsStudentDataLoading] = useState(true);
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
        setIsStudentDataLoading(false);
        return;
      }
      setIsStudentDataLoading(true);
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
      } finally {
        setIsStudentDataLoading(false);
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

    // Если нет записей в журнале, возвращаем пустые записи
    if (!journal.attendance || !journal.grades) {
      replace(emptyEntries);
      return;
    }

    // Заполняем записи данными из журнала
    const filledEntries = studentsInGroup.map(student => {
      const attendance = journal.attendance.find(a => a.studentId === student.uid);
      const grade = journal.grades.find(g => g.studentId === student.uid);

      return {
        studentId: student.uid,
        studentName: student.fullName || 'Unknown Student',
        attendance: attendance?.present ? 'present' as const : 'absent' as const,
        grade: grade?.grade,
        comment: grade?.comment || "",
      };
    });

    replace(filledEntries);
  }, [selectedDate, studentsInGroup, journal.attendance, journal.grades, replace]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const dateForFirestore = Timestamp.fromDate(startOfDay(values.selectedDate));
      
      // Обновляем журнал с новыми данными
      const updatedJournal: Partial<Journal> = {
        attendance: values.entries.map(e => ({
          studentId: e.studentId,
          present: e.attendance === 'present'
        })),
        grades: values.entries
          .filter(e => e.grade !== undefined)
          .map(e => ({
            studentId: e.studentId,
            grade: e.grade!,
            comment: e.comment
          })),
        updatedAt: Timestamp.now()
      };

      await addOrUpdateJournalEntriesForDate(journal.id, dateForFirestore, [updatedJournal]);
      toast.success(`Записи за ${format(values.selectedDate, "PPP")} успешно сохранены.`);
      onEntriesUpdated();
    } catch (error) {
      console.error("Error saving journal entries:", error);
      toast.error("Не удалось сохранить записи.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntriesForDate = async () => {
    if (!dateToDelete) return;
    setIsSubmitting(true);
    try {
      await removeJournalEntriesForDate(journal.id, dateToDelete);
      toast.success(`Все записи за ${format(dateToDelete.toDate(), "PPP")} удалены.`);
      onEntriesUpdated();
      if (selectedDate && isEqual(startOfDay(selectedDate), startOfDay(dateToDelete.toDate()))) {
        const resetEntries = studentsInGroup.map(student => ({
          studentId: student.uid,
          studentName: student.fullName || 'Unknown Student',
          attendance: 'present' as const,
          grade: undefined,
          comment: "",
        }));
        replace(resetEntries);
      }
    } catch (error) {
      console.error("Error deleting entries for date:", error);
      toast.error("Не удалось удалить записи за эту дату.");
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
      setDateToDelete(null);
    }
  };

  const openDeleteConfirm = () => {
    if (selectedDate) {
      const dateNormalized = startOfDay(selectedDate);
      const hasEntries = journal.attendance?.length > 0 || journal.grades?.length > 0;
      
      if (!hasEntries) {
        toast.info(`Нет записей за ${format(selectedDate, "PPP")} для удаления.`);
        return;
      }
      setDateToDelete(Timestamp.fromDate(dateNormalized));
      setShowDeleteConfirm(true);
    }
  };

  return (
    <div className={cn("p-1 space-y-4 h-full flex flex-col", className)}>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className={cn("space-y-4", className)}>
          <FormField
            control={form.control}
            name="selectedDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Дата</FormLabel>
                <FormControl>
                  <Input
                    type="date"
                    {...field}
                    value={format(field.value, 'yyyy-MM-dd')}
                    onChange={(e) => field.onChange(new Date(e.target.value))}
                    disabled={isStudentDataLoading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {isStudentDataLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Загрузка списка студентов...
            </div>
          ) : studentsInGroup.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              В этой группе нет студентов для заполнения журнала.
            </p>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
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
                                disabled={isStudentDataLoading}
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
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  value={field.value || ''}
                                  disabled={isStudentDataLoading}
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
                                <Textarea {...field} disabled={isStudentDataLoading} />
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
          )}

          <div className="flex justify-between">
            <Button
              type="button"
              variant="destructive"
              onClick={openDeleteConfirm}
              disabled={isSubmitting || isStudentDataLoading || fields.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Удалить записи
            </Button>
            <Button type="submit" disabled={isSubmitting || isStudentDataLoading || fields.length === 0}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
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
              Вы уверены, что хотите удалить все записи за {dateToDelete ? format(dateToDelete.toDate(), "PPP") : "эту дату"}? Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntriesForDate}>Удалить</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageJournalEntriesView;
