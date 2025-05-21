import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, Save, Loader2, Trash2 } from "lucide-react";
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
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { Journal, JournalEntry, Student, Group } from '@/types';
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

// Form schema for a single journal entry row
const journalEntryRowSchema = z.object({
  studentId: z.string(),
  studentName: z.string(),
  attendance: z.enum(['present', 'absent', 'late']),
  grade: z.string().optional().transform((val) => {
    if (val === "" || val === undefined) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }).refine((val) => val === undefined || (val >= 0 && val <= 100), {
    message: "Grade must be between 0 and 100"
  }),
  comment: z.string().optional().transform(val => val === "" ? undefined : val),
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
      if (!group || !group.students || group.students.length === 0) {
        setStudentsInGroup([]);
        setIsStudentDataLoading(false);
        return;
      }
      setIsStudentDataLoading(true);
      try {
        const studentProfiles = await getStudentsInGroupDetails(db, group.students);
        const userIds = studentProfiles.map(s => s.userId);
        if (userIds.length === 0) {
          setStudentsInGroup(studentProfiles.map(sp => ({...sp, fullName: 'User data missing'})));
          setIsStudentDataLoading(false);
          return;
        }
        const users = await getUsersFromFirestore(db);
        const userMap = new Map(users.map(u => [u.uid, u]));

        const studentsWithNames = studentProfiles.map(sp => ({
          ...sp,
          fullName: `${userMap.get(sp.userId)?.firstName || ''} ${userMap.get(sp.userId)?.lastName || 'N/A'}`.trim() || 'Unnamed Student'
        }));
        setStudentsInGroup(studentsWithNames);
      } catch (error) {
        toast.error("Failed to load students for the group.");
        console.error("Error fetching students:", error);
      } finally {
        setIsStudentDataLoading(false);
      }
    };
    if (group) fetchStudents(); else setIsStudentDataLoading(false);
  }, [group]);

  useEffect(() => {
    if (!selectedDate || studentsInGroup.length === 0) {
      replace([]);
      return;
    }
    const dateNormalized = startOfDay(selectedDate);
    const entriesForDate = journal.entries.filter(entry =>
      isEqual(startOfDay(entry.date.toDate()), dateNormalized)
    );

    const newFormEntries = studentsInGroup.map(student => {
      const existingEntry = entriesForDate.find(e => e.studentId === student.id);
      return {
        studentId: student.id,
        studentName: student.fullName || 'Unknown Student',
        attendance: existingEntry?.attendance || 'present',
        grade: existingEntry?.grade !== undefined ? String(existingEntry.grade) : "",
        comment: existingEntry?.comment ?? "",
      };
    });
    replace(newFormEntries);
  }, [selectedDate, journal.entries, studentsInGroup, replace]);

  const onSubmit = async (values: ManageEntriesFormValues) => {
    setIsSubmitting(true);
    try {
      const dateForFirestore = Timestamp.fromDate(startOfDay(values.selectedDate));
      const entriesToSave: JournalEntry[] = values.entries.map(e => ({
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
          grade: "",
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
                <FormLabel className="mb-1">Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button variant={"outline"} className={cn("w-[240px] pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                        {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )} />
            <div className="flex-grow"></div>
            <Button type="button" variant="destructive" onClick={openDeleteConfirm} disabled={isSubmitting || isStudentDataLoading || fields.length === 0} size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> Delete Entries for Date
            </Button>
            <Button type="submit" disabled={isSubmitting || isStudentDataLoading || fields.length === 0} size="sm">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Save Entries for Date
            </Button>
          </div>
        </form>
      </Form>

      {isStudentDataLoading && <div className="flex items-center justify-center p-4"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading student list...</div>}
      {!isStudentDataLoading && studentsInGroup.length === 0 && <p className="text-muted-foreground text-center py-4">No students in this group to record entries for.</p>}

      {fields.length > 0 && !isStudentDataLoading && (
        <ScrollArea className="flex-grow">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Comment</TableHead>
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
                              <SelectItem value="present">Present</SelectItem>
                              <SelectItem value="absent">Absent</SelectItem>
                              <SelectItem value="late">Late</SelectItem>
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
                              value={field.value || ""}
                              onChange={e => field.onChange(e.target.value)}
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
                              placeholder="Optional comment"
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

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Entries</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all entries for {dateToDelete ? format(dateToDelete.toDate(), "PPP") : "this date"}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEntriesForDate}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ManageJournalEntriesView;
