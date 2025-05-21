import React, { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area'; // For potentially long dropdowns
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import { getAllTeachers as getAllTeacherProfiles } from '@/lib/firebaseService/teacherService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { Lesson, Subject, Teacher, User } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Zod schema for the form
const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:MM format
const lessonSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  dayOfWeek: z.coerce.number().min(1, 'Day of week is required (1-7)').max(7, 'Day of week must be 1-7'),
  startTime: z.string().regex(timeRegex, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(timeRegex, 'Invalid time format (HH:MM)'),
  room: z.string().min(1, 'Room/Location is required').max(50, 'Room name too long'),
  type: z.enum(['lecture', 'practice', 'laboratory'], {
    required_error: 'Lesson type is required',
  }),
}).refine(data => data.startTime < data.endTime, {
  message: "End time must be after start time",
  path: ["endTime"], 
});

export type LessonFormValues = z.infer<typeof lessonSchema>;

interface TeacherWithUser extends Teacher {
  displayName?: string;
}

interface LessonFormProps {
  mode: 'create' | 'edit';
  // scheduleId: string; // Not directly used by form submission logic here, but parent needs it
  lesson?: Lesson; // Existing lesson data for 'edit' mode
  onFormSubmitSuccess: (lesson: Lesson) => void; // Parent handles Firestore update
  onCancel?: () => void;
}

const LessonForm: React.FC<LessonFormProps> = ({
  mode,
  lesson,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false); // For form submission state
  const [dataLoading, setDataLoading] = useState(true); // For fetching dropdown data
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherWithUser[]>([]);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    // Default values are set in useEffect based on mode
  });
  
  useEffect(() => {
    const fetchDataForDropdowns = async () => {
      setDataLoading(true);
      try {
        const [fetchedSubjects, fetchedTeacherProfiles, allUsers] = await Promise.all([
          getAllSubjects(db),
          getAllTeacherProfiles(db),
          getUsersFromFirestore(db),
        ]);
        setSubjects(fetchedSubjects);

        const userMap = new Map(allUsers.map(u => [u.uid, u]));
        const teachersWithNames = fetchedTeacherProfiles.map(t => ({
          ...t,
          displayName: `${userMap.get(t.userId)?.firstName || ''} ${userMap.get(t.userId)?.lastName || 'N/A (User)'}`.trim() || 'Unnamed Teacher'
        }));
        setTeachers(teachersWithNames);

      } catch (error) {
        toast.error("Failed to load subjects or teachers for selection.");
        console.error("Error fetching dropdown data:", error);
      } finally {
        setDataLoading(false);
      }
    };
    fetchDataForDropdowns();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && lesson) {
      form.reset({
        ...lesson,
        dayOfWeek: lesson.dayOfWeek, // Zod schema coerces, so keep as number
      });
    } else if (mode === 'create') {
      form.reset({
        subjectId: '',
        teacherId: '',
        dayOfWeek: 1, // Default to Monday
        startTime: '09:00',
        endTime: '10:30',
        room: '',
        type: undefined, // No default type, user must select
      });
    }
  }, [mode, lesson, form]);


  const onSubmit = (values: LessonFormValues) => { // No async here, parent handles async Firestore call
    setIsLoading(true); // Indicate form processing
    try {
      const lessonData: Lesson = {
        id: mode === 'edit' && lesson ? lesson.id : uuidv4(),
        subjectId: values.subjectId,
        teacherId: values.teacherId,
        dayOfWeek: values.dayOfWeek, // Already a number from Zod coercion
        startTime: values.startTime,
        endTime: values.endTime,
        room: values.room,
        type: values.type as Lesson['type'],
      };
      
      onFormSubmitSuccess(lessonData); // Pass data to parent
      // Toast for success will be shown by parent after successful Firestore op.
      // if (mode === 'create') form.reset(); // Parent dialog closure will likely unmount/reset
      
    } catch (error: any) { // Should not happen if validation is robust, but good for safety
      console.error('Error preparing lesson data:', error);
      toast.error(error.message || 'Failed to prepare lesson data.');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (dataLoading) {
    return <p className="text-center p-4">Loading form data (subjects, teachers)...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 p-1 max-h-[70vh] overflow-y-auto pr-2">
        <FormField
          control={form.control}
          name="subjectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || subjects.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
                <SelectContent><ScrollArea className="h-auto max-h-[200px]">
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  {subjects.length === 0 && <p className="p-2 text-sm text-muted-foreground">No subjects available.</p>}
                </ScrollArea></SelectContent>
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
              <FormLabel>Teacher</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading || teachers.length === 0}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger></FormControl>
                <SelectContent><ScrollArea className="h-auto max-h-[200px]">
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.displayName}</SelectItem>)}
                  {teachers.length === 0 && <p className="p-2 text-sm text-muted-foreground">No teachers available.</p>}
                </ScrollArea></SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dayOfWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Day of Week</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                value={field.value?.toString()} 
                disabled={isLoading}
              >
                <FormControl><SelectTrigger><SelectValue placeholder="Select day" /></SelectTrigger></FormControl>
                <SelectContent>
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, i) => (
                    <SelectItem key={i+1} value={(i+1).toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl><Input type="time" {...field} disabled={isLoading} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl><Input type="time" {...field} disabled={isLoading} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="room"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Room/Location</FormLabel>
              <FormControl><Input placeholder="e.g., Room 101, Online" {...field} disabled={isLoading} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Lesson Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                <SelectContent>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="practice">Practice</SelectItem>
                  <SelectItem value="laboratory">Laboratory</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || dataLoading}>Cancel</Button>
          )}
          <Button type="submit" disabled={isLoading || dataLoading}>
            {isLoading ? 'Saving...' : (mode === 'create' ? 'Add Lesson' : 'Save Lesson Changes')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LessonForm;
