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
import { getUsers } from '@/lib/firebaseService/userService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import { getAllSubjects } from '@/lib/firebaseService/subjectService';
import type { TeacherUser, Group, Subject } from '@/types';

const formSchema = z.object({
  teacherId: z.string().min(1, 'Выберите преподавателя'),
  type: z.enum(['lecture', 'practice', 'laboratory']),
  subjectId: z.string().min(1, 'Выберите предмет'),
  groupId: z.string().min(1, 'Выберите группу'),
  dayOfWeek: z.number().min(1).max(7),
  startTime: z.string(),
  endTime: z.string(),
  room: z.string().min(1, 'Укажите аудиторию'),
  semesterId: z.string().min(1, 'Выберите семестр'),
  weekType: z.enum(['all', 'odd', 'even']),
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
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
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
      semesterId: '',
      weekType: 'all',
    },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teachersData, groupsData, subjectsData] = await Promise.all([
          getUsers(),
          getAllGroups(),
          getAllSubjects(),
        ]);
        const teachersDataFiltered = teachersData.users.filter(user => user.role === 'teacher') as TeacherUser[];
        setTeachers(teachersDataFiltered);
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
        teacherId: values.teacherId,
        type: values.type,
        subjectId: values.subjectId,
        groupId: values.groupId,
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        room: values.room,
        semesterId: values.semesterId,
        weekType: values.weekType,
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

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.uid === teacherId);
    return teacher ? `${teacher.firstName} ${teacher.lastName}` : '—';
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
                    <SelectItem key={teacher.uid} value={teacher.uid}>
                      {getTeacherName(teacher.uid)}
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
                  <SelectItem value="1">Monday</SelectItem>
                  <SelectItem value="2">Tuesday</SelectItem>
                  <SelectItem value="3">Wednesday</SelectItem>
                  <SelectItem value="4">Thursday</SelectItem>
                  <SelectItem value="5">Friday</SelectItem>
                  <SelectItem value="6">Saturday</SelectItem>
                  <SelectItem value="7">Sunday</SelectItem>
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