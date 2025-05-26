import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { db } from '@/lib/firebase';
import { addOrUpdateJournalEntriesForDate, removeJournalEntriesForDate } from '@/lib/firebaseService/journalService';
import { getStudentsInGroupDetails } from '@/lib/firebaseService/groupService';
import { getUsersFromFirestoreByIds } from '@/lib/firebaseService/userService';
import type { Journal, Student, Group } from '@/types';
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
  comment: z.string().default("").transform(val => val || ""),
});

// Form schema for the entire form
const manageEntriesSchema = z.object({
  selectedDate: z.date({ required_error: "Please select a date." }),
  entries: z.array(journalEntryRowSchema),
});

type ManageEntriesFormValues = z.infer<typeof manageEntriesSchema>;

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

  const form = useForm<ManageEntriesFormValues>({
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
        // Фильтруем пустые и невалидные ID
        const validStudentIds = group.students.filter(Boolean);
        if (validStudentIds.length === 0) {
          setStudentsInGroup([]);
          setIsStudentDataLoading(false);
          return;
        }
        // Получаем профили студентов по их ID
        const studentProfiles = await getStudentsInGroupDetails(validStudentIds);
        if (!studentProfiles.length) {
          setStudentsInGroup([]);
          setIsStudentDataLoading(false);
          return;
        }
        // Получаем userId для каждого студента
        const userIds = studentProfiles.map(s => s.userId).filter(Boolean);
        let users: any[] = [];
        if (userIds.length > 0) {
          users = await getUsersFromFirestoreByIds(db, userIds);
        }
        // DEBUG LOGS
        console.log('users:', users);
        const userMap = new Map(users.map(u => [u.id, u]));
        console.log('userMap keys:', Array.from(userMap.keys()));
        console.log('studentProfiles userIds:', studentProfiles.map(sp => sp.userId));
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

    // Если нет записей за дату, просто создаём пустые строки для студентов
    if (!entriesForDate.length) {
      const emptyEntries = studentsInGroup.map(student => ({
        studentId: student.id,
        studentName: student.fullName || 'Unknown Student',
        attendance: 'present',
        grade: undefined,
        comment: "",
      }));
      replace(emptyEntries);
      return;
    }

    // Если есть записи за дату, заполняем их
    const filledEntries = studentsInGroup.map(student => {
      const entry = entriesForDate.find((e: any) => e && e.studentId === student.id);
      let attendance: 'present' | 'absent' | 'late' = 'present';
      if (entry && typeof entry.attendance === 'string') {
        if (entry.attendance === 'present' || entry.attendance === 'absent' || entry.attendance === 'late') {
          attendance = entry.attendance;
        } else if (entry.attendance === 'excused') {
          attendance = 'absent';
        }
      }
      return {
        studentId: student.id,
        studentName: student.fullName || 'Unknown Student',
        attendance,
        grade: entry && typeof entry.grade === 'number' ? entry.grade : undefined,
        comment: entry && typeof entry.comment === 'string' ? entry.comment : "",
      };
    });
    replace(filledEntries);
  }, [selectedDate, journal.entries, studentsInGroup, replace]);

  const onSubmit = async (values: ManageEntriesFormValues) => {
    setIsSubmitting(true);
    try {
      const dateForFirestore = Timestamp.fromDate(startOfDay(values.selectedDate));
      const entriesToSave = values.entries.map(e => ({
        date: dateForFirestore,
        studentId: e.studentId,
        attendance: e.attendance,
        grade: e.grade,
        comment: e.comment,
      }));

      await addOrUpdateJournalEntriesForDate(db, journal.id, dateForFirestore, entriesToSave);
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
      await removeJournalEntriesForDate(db, journal.id, dateToDelete);
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b">
            <FormField control={form.control} name="selectedDate" render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="mb-1">Дата</FormLabel>
                <FormControl>
                  <input
                    type="date"
                    className="flex h-10 w-[240px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                    onChange={(e) => {
                      const date = e.target.value ? new Date(e.target.value) : null;
                      field.onChange(date);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex-grow"></div>
            <Button type="button" variant="destructive" onClick={openDeleteConfirm} disabled={isSubmitting || isStudentDataLoading || fields.length === 0} size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> Удалить записи за дату
            </Button>
            <Button type="submit" disabled={isSubmitting || isStudentDataLoading || fields.length === 0} size="sm">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Сохранить записи за дату
            </Button>
          </div>

          {isStudentDataLoading && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Загрузка списка студентов...</div>}
          {!isStudentDataLoading && studentsInGroup.length === 0 && <p className="text-muted-foreground text-center py-4">В этой группе нет студентов для заполнения журнала.</p>}

          {fields.length > 0 && !isStudentDataLoading && (
            <ScrollArea className="flex-grow">
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
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="present">Присутствовал</SelectItem>
                                  <SelectItem value="absent">Отсутствовал</SelectItem>
                                  <SelectItem value="late">Опоздал</SelectItem>
                                </SelectContent>
                              </Select>
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
                                  min="0"
                                  max="100"
                                  placeholder="0-100"
                                  {...field}
                                  value={field.value ?? ""}
                                  onChange={e => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                />
                              </FormControl>
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
                                  placeholder="Комментарий (необязательно)"
                                  className="resize-none"
                                  {...field}
                                  value={field.value || ""}
                                  onChange={e => field.onChange(e.target.value)}
                                />
                              </FormControl>
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
