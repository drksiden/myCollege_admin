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
import { getStudentsInGroupDetails } from '@/lib/firebaseService/groupService';
import { getUsersFromFirestoreByIds } from '@/lib/firebaseService/userService';
import type { Journal, Student, Group, User, JournalEntry } from '@/types';
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

interface StudentWithUserData extends Student {
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
      if (!group || !Array.isArray(group.students) || group.students.length === 0) {
        setStudentsInGroup([]);
        setIsStudentDataLoading(false);
        return;
      }
      setIsStudentDataLoading(true);
      try {
        const validStudentIds = group.students.filter(Boolean);
        if (validStudentIds.length === 0) {
          setStudentsInGroup([]);
          setIsStudentDataLoading(false);
          return;
        }
        const studentProfiles = await getStudentsInGroupDetails(validStudentIds);
        if (!studentProfiles.length) {
          setStudentsInGroup([]);
          setIsStudentDataLoading(false);
          return;
        }
        const userIds = studentProfiles.map(s => s.userId).filter(Boolean);
        let users: User[] = [];
        if (userIds.length > 0) {
          users = await getUsersFromFirestoreByIds(userIds);
        }
        const userMap = new Map(users.map(u => [u.uid, u]));
        const studentsWithNames = studentProfiles.map(sp => ({
          ...sp,
          fullName: (() => {
            const user = userMap.get(sp.userId);
            if (!user) return 'Нет данных';
            return `${user.lastName || ''} ${user.firstName || ''} ${user.middleName || ''}`.trim() || 'Безымянный студент';
          })()
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
    const dateNormalized = startOfDay(selectedDate);
    const entriesForDate = Array.isArray(journal.entries)
      ? journal.entries.filter(entry => entry && entry.date && isEqual(startOfDay(entry.date.toDate()), dateNormalized))
      : [];

    if (!entriesForDate.length) {
      const emptyEntries = studentsInGroup.map(student => ({
        studentId: student.id,
        studentName: student.fullName || 'Unknown Student',
        attendance: 'present' as const,
        grade: undefined,
        comment: "",
      }));
      replace(emptyEntries);
      return;
    }

    const filledEntries = studentsInGroup.map(student => {
      const entry = entriesForDate.find(e => e && Array.isArray(e.attendance) && e.attendance.find(a => a.studentId === student.id));
      let attendance: 'present' | 'absent' | 'late' = 'present';
      if (entry?.attendance) {
        const studentAttendance = Array.isArray(entry.attendance) ? entry.attendance.find(a => a.studentId === student.id) : undefined;
        if (studentAttendance) {
          if (studentAttendance.status === 'present' || studentAttendance.status === 'absent' || studentAttendance.status === 'late') {
            attendance = studentAttendance.status;
          } else if (studentAttendance.status === 'excused') {
            attendance = 'absent';
          }
        }
      }
      return {
        studentId: student.id,
        studentName: student.fullName || 'Unknown Student',
        attendance,
        grade: undefined,
        comment: entry?.notes || "",
      };
    });
    replace(filledEntries);
  }, [selectedDate, studentsInGroup, journal.entries, replace]);

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    setIsSubmitting(true);
    try {
      const dateForFirestore = Timestamp.fromDate(startOfDay(values.selectedDate));
      const entriesToSave: JournalEntry[] = values.entries.map(e => ({
        id: `${dateForFirestore.toMillis()}-${e.studentId}`,
        journalId: journal.id,
        date: dateForFirestore,
        topic: journal.entries.find(entry => entry.date.isEqual(dateForFirestore))?.topic || '',
        hours: 0,
        type: 'lecture',
        notes: e.comment,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));

      await addOrUpdateJournalEntriesForDate(journal.id, dateForFirestore, entriesToSave);
      toast.success(`Entries for ${format(values.selectedDate, "PPP")} saved successfully.`);
      onEntriesUpdated();
    } catch (error) {
      console.error("Error saving journal entries:", error);
      toast.error("Failed to save entries.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntriesForDate = async () => {
    if (!dateToDelete) return;
    setIsSubmitting(true);
    try {
      await removeJournalEntriesForDate(journal.id, dateToDelete);
      toast.success(`All entries for ${format(dateToDelete.toDate(), "PPP")} deleted.`);
      onEntriesUpdated();
      if (selectedDate && isEqual(startOfDay(selectedDate), startOfDay(dateToDelete.toDate()))) {
        const resetEntries = studentsInGroup.map(student => ({
          studentId: student.id,
          studentName: student.fullName || 'Unknown Student',
          attendance: 'present' as const,
          grade: undefined,
          comment: "",
        }));
        replace(resetEntries);
      }
    } catch (error) {
      console.error("Error deleting entries for date:", error);
      toast.error("Failed to delete entries for the date.");
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
      setDateToDelete(null);
    }
  };

  const openDeleteConfirm = () => {
    if (selectedDate) {
      const dateNormalized = startOfDay(selectedDate);
      const entriesExistForDate = journal.entries.some(entry =>
        isEqual(startOfDay(entry.date.toDate()), dateNormalized)
      );
      if (!entriesExistForDate) {
        toast.info(`No entries exist for ${format(selectedDate, "PPP")} to delete.`);
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
