import React, { useEffect, useState, useCallback } from 'react';
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
import { Input } from '@/components/ui/input'; // For Year
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { createJournal, updateJournal, getJournal } from '@/lib/firebaseService/journalService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getAllTeachers as getAllTeacherProfiles } from '@/lib/firebaseService/teacherService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { Group, Subject, Teacher } from '@/types';
import { Loader2 } from 'lucide-react';

// Zod schema for the form
const journalMetadataSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  teacherId: z.string().min(1, 'Teacher is required'), // Teacher Profile ID
  semester: z.coerce.number().min(1, 'Semester must be 1 or 2').max(2, 'Semester must be 1 or 2'),
  year: z.coerce
    .number({invalid_type_error: "Year must be a number"})
    .min(new Date().getFullYear() - 3, `Year too old`) 
    .max(new Date().getFullYear() + 5, `Year too far in future`), 
});

export type JournalMetadataFormValues = z.infer<typeof journalMetadataSchema>;

interface TeacherWithUser extends Teacher {
  displayName?: string;
}

interface JournalMetadataFormProps {
  mode: 'create' | 'edit';
  journalId?: string; // Required for 'edit' mode
  onFormSubmitSuccess: (journalId: string) => void; 
  onCancel?: () => void;
}

const JournalMetadataForm: React.FC<JournalMetadataFormProps> = ({
  mode,
  journalId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submission
  const [dataLoading, setDataLoading] = useState(true); // For fetching dropdown data
  
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherWithUser[]>([]);

  const form = useForm<JournalMetadataFormValues>({
    resolver: zodResolver(journalMetadataSchema),
    defaultValues: {
      groupId: '',
      subjectId: '',
      teacherId: '',
      semester: 1,
      year: new Date().getFullYear(),
    },
  });

  const fetchDataForDropdowns = useCallback(async () => {
    setDataLoading(true);
    try {
      const [fetchedGroups, fetchedSubjects, fetchedTeacherProfiles, allUsers] = await Promise.all([
        getAllGroups(db),
        getAllSubjects(db),
        getAllTeacherProfiles(db),
        getUsersFromFirestore(db),
      ]);
      setGroups(fetchedGroups);
      setSubjects(fetchedSubjects);

      const userMap = new Map(allUsers.map(u => [u.uid, u]));
      const teachersWithNames = fetchedTeacherProfiles.map(t => ({
        ...t,
        displayName: `${userMap.get(t.userId)?.firstName || ''} ${userMap.get(t.userId)?.lastName || 'N/A (User)'}`.trim() || 'Unnamed Teacher'
      }));
      setTeachers(teachersWithNames);

    } catch (error) {
      toast.error("Failed to load data for selections (groups, subjects, teachers).");
      console.error("Error fetching dropdown data:", error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataForDropdowns();
  }, [fetchDataForDropdowns]);

  useEffect(() => {
    // This effect runs after dropdown data is potentially loaded
    if (mode === 'create') {
      form.reset({
        groupId: '', subjectId: '', teacherId: '',
        semester: 1, year: new Date().getFullYear(),
      });
      setDataLoading(false); // No more data to load for create mode
    } else if (mode === 'edit' && journalId) {
      const fetchJournalData = async () => {
        // setDataLoading(true); // Already true from dropdowns or set if that finished
        try {
          const journal = await getJournal(db, journalId);
          if (journal) {
            form.reset({
              groupId: journal.groupId,
              subjectId: journal.subjectId,
              teacherId: journal.teacherId,
              semester: journal.semester,
              year: journal.year,
            });
          } else {
            toast.error('Journal not found.');
            if (onCancel) onCancel();
          }
        } catch (error) {
          console.error('Error fetching journal:', error);
          toast.error('Failed to load journal details.');
          if (onCancel) onCancel();
        } finally {
          setDataLoading(false); // All loading finished
        }
      };
      // Only fetch journal data if dropdown data has been attempted
      if (!dataLoading || (groups.length || subjects.length || teachers.length)) {
         fetchJournalData();
      } else if(dataLoading && !groups.length && !subjects.length && !teachers.length) {
        // If dropdown data is still loading, wait for it. This effect will re-run.
      } else {
        // Dropdown data failed to load, can't proceed with edit.
        setDataLoading(false);
      }
    } else {
      setDataLoading(false); // Should not happen if logic is correct
    }
  }, [mode, journalId, form, onCancel, dataLoading]); // Add dataLoading to dependencies

  const onSubmit = async (values: JournalMetadataFormValues) => {
    setIsSubmitting(true);
    try {
      const journalData = { ...values };
      let resultingJournalId = journalId;

      if (mode === 'create') {
        const newJournalId = await createJournal(db, journalData);
        resultingJournalId = newJournalId;
        toast.success('Journal created successfully! You can now add entries.');
      } else if (mode === 'edit' && journalId) {
        await updateJournal(db, journalId, {
            groupId: journalData.groupId,
            subjectId: journalData.subjectId,
            teacherId: journalData.teacherId,
            semester: journalData.semester,
            year: journalData.year,
        });
        toast.success('Journal details updated successfully!');
      }
      if (resultingJournalId) {
        onFormSubmitSuccess(resultingJournalId);
      }
      if (mode === 'create') form.reset();
    } catch (error) {
      console.error('Error submitting journal metadata form:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save journal details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (dataLoading) { 
    return <div className="flex items-center justify-center p-6"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading form data...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-1 max-h-[75vh] overflow-y-auto pr-3">
        <FormField control={form.control} name="groupId" render={({ field }) => (
            <FormItem><FormLabel>Group</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || groups.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a group" /></SelectTrigger></FormControl>
                <SelectContent><ScrollArea className="h-auto max-h-[150px]">
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name} ({g.specialization} - {g.year})</SelectItem>)}
                  {groups.length === 0 && <p className="p-2 text-sm text-muted-foreground">No groups available.</p>}
                </ScrollArea></SelectContent>
              </Select><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="subjectId" render={({ field }) => (
            <FormItem><FormLabel>Subject</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || subjects.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a subject" /></SelectTrigger></FormControl>
                <SelectContent><ScrollArea className="h-auto max-h-[150px]">
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.type})</SelectItem>)}
                  {subjects.length === 0 && <p className="p-2 text-sm text-muted-foreground">No subjects available.</p>}
                </ScrollArea></SelectContent>
              </Select><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="teacherId" render={({ field }) => (
            <FormItem><FormLabel>Teacher</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || teachers.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select a teacher" /></SelectTrigger></FormControl>
                <SelectContent><ScrollArea className="h-auto max-h-[150px]">
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.displayName}</SelectItem>)}
                  {teachers.length === 0 && <p className="p-2 text-sm text-muted-foreground">No teachers available.</p>}
                </ScrollArea></SelectContent>
              </Select><FormMessage /></FormItem>)} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="semester" render={({ field }) => (
              <FormItem><FormLabel>Semester</FormLabel>
                <Select onValueChange={value => field.onChange(parseInt(value))} value={field.value?.toString()} disabled={isSubmitting}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Semester" /></SelectTrigger></FormControl>
                  <SelectContent><SelectItem value="1">1st</SelectItem><SelectItem value="2">2nd</SelectItem></SelectContent>
                </Select><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="year" render={({ field }) => (
              <FormItem><FormLabel>Academic Year (Start)</FormLabel>
                <FormControl><Input type="number" placeholder={`${new Date().getFullYear()}`} {...field} disabled={isSubmitting} /></FormControl>
                <FormMessage /></FormItem>)} />
        </div>
        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
          <Button type="submit" disabled={isSubmitting || dataLoading || (mode === 'create' && (groups.length === 0 || subjects.length === 0 || teachers.length === 0))}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSubmitting ? 'Saving...' : (mode === 'create' ? 'Create Journal' : 'Save Changes')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default JournalMetadataForm;
