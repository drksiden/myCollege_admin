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
import { toast } from 'sonner';
import { createLesson, updateLesson } from '@/lib/firebaseService/lessonService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import type { Teacher, Group, Subject } from '@/types';

const formSchema = z.object({
  teacherId: z.string().min(1, 'Teacher is required'),
  groupId: z.string().min(1, 'Group is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  room: z.string().min(1, 'Room is required'),
  type: z.enum(['lecture', 'practice', 'laboratory']),
});

type FormValues = z.infer<typeof formSchema>;

interface LessonFormProps {
  mode: 'create' | 'edit';
  lessonId?: string;
  onFormSubmitSuccess: (lessonId: string) => void;
  onCancel: () => void;
}

const LessonForm: React.FC<LessonFormProps> = ({
  mode,
  lessonId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      teacherId: '',
      groupId: '',
      subjectId: '',
      dayOfWeek: 0,
      startTime: '',
      endTime: '',
      room: '',
      type: 'lecture',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teachersData, groupsData, subjectsData] = await Promise.all([
          getAllTeachers(),
          getAllGroups(),
          getAllSubjects(),
        ]);
        setTeachers(teachersData);
        setGroups(groupsData);
        setSubjects(subjectsData);
      } catch (error) {
        console.error('Error fetching form data:', error);
        toast.error('Failed to load form data');
      }
    };

    fetchData();
  }, []);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const lessonData = {
        ...values,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (mode === 'create') {
        const newLesson = await createLesson(lessonData);
        onFormSubmitSuccess(newLesson);
      } else if (mode === 'edit' && lessonId) {
        await updateLesson(lessonId, lessonData);
        onFormSubmitSuccess(lessonId);
      }

      toast.success(`Lesson ${mode === 'create' ? 'created' : 'updated'} successfully`);
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error('Failed to save lesson');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="teacherId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teacher</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a teacher" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {`${teacher.firstName} ${teacher.lastName}`}
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
          name="groupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group" />
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
              <FormLabel>Subject</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
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
          name="dayOfWeek"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Day of Week</FormLabel>
              <Select
                value={field.value.toString()}
                onValueChange={(value) => field.onChange(parseInt(value))}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">Monday</SelectItem>
                  <SelectItem value="1">Tuesday</SelectItem>
                  <SelectItem value="2">Wednesday</SelectItem>
                  <SelectItem value="3">Thursday</SelectItem>
                  <SelectItem value="4">Friday</SelectItem>
                  <SelectItem value="5">Saturday</SelectItem>
                  <SelectItem value="6">Sunday</SelectItem>
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
                <FormControl>
                  <Input type="time" {...field} disabled={isLoading} />
                </FormControl>
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
                <FormControl>
                  <Input type="time" {...field} disabled={isLoading} />
                </FormControl>
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
              <FormLabel>Room</FormLabel>
              <FormControl>
                <Input {...field} disabled={isLoading} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default LessonForm; 