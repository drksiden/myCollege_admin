import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getFunctions, httpsCallable } from 'firebase/functions';
import type { Schedule } from '@/types';
import { toast } from 'sonner';
import { Trash2, Plus } from 'lucide-react';

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];

const entrySchema = z.object({
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  subject: z.string().min(1, 'Subject is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  room: z.string().min(1, 'Room is required'),
});

const formSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
  semester: z.coerce.number().min(1).max(8),
  year: z.coerce.number().min(2000).max(2100),
  entries: z.array(entrySchema),
});

type ScheduleFormValues = z.infer<typeof formSchema>;

interface ScheduleFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schedule?: Schedule;
}

interface CloudFunctionResponse<T> {
  data: {
    success: boolean;
    message?: string;
  } & T;
}

interface GroupsResponse {
  groups: Array<{ id: string; name: string }>;
}

interface SubjectsResponse {
  subjects: Array<{ id: string; name: string }>;
}

interface TeachersResponse {
  teachers: Array<{ id: string; firstName: string; lastName: string; middleName?: string }>;
}

export default function ScheduleFormDialog({
  open,
  onClose,
  onSuccess,
  schedule,
}: ScheduleFormDialogProps) {
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [subjects, setSubjects] = useState<Array<{ id: string; name: string }>>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string; middleName?: string }>>([]);
  const [loading, setLoading] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupId: schedule?.groupId || '',
      semester: schedule?.semester || 1,
      year: schedule?.year || new Date().getFullYear(),
      entries: schedule?.entries || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'entries',
  });

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const functions = getFunctions();
      const [groupsResult, subjectsResult, teachersResult] = await Promise.all([
        httpsCallable<Record<string, never>, CloudFunctionResponse<GroupsResponse>>(functions, 'getGroups')({}),
        httpsCallable<Record<string, never>, CloudFunctionResponse<SubjectsResponse>>(functions, 'getSubjects')({}),
        httpsCallable<Record<string, never>, CloudFunctionResponse<TeachersResponse>>(functions, 'getTeachers')({}),
      ]);

      setGroups(groupsResult.data.data.groups);
      setSubjects(subjectsResult.data.data.subjects);
      setTeachers(teachersResult.data.data.teachers);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    }
  };

  const onSubmit = async (values: ScheduleFormValues) => {
    try {
      setLoading(true);
      const functions = getFunctions();
      const createScheduleFn = httpsCallable(functions, 'createSchedule');
      const updateScheduleFn = httpsCallable(functions, 'updateSchedule');

      if (schedule) {
        await updateScheduleFn({
          scheduleId: schedule.id,
          data: values,
        });
        toast.success('Schedule updated successfully');
      } else {
        await createScheduleFn(values);
        toast.success('Schedule created successfully');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            {schedule ? 'Edit Schedule' : 'Create Schedule'}
          </DialogTitle>
          <DialogDescription>
            Fill in the schedule information below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="semester"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Semester</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={8} {...field} />
                    </FormControl>
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
                    <FormControl>
                      <Input type="number" min={2000} max={2100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Lessons</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({
                    dayOfWeek: 'monday',
                    startTime: '09:00',
                    endTime: '10:30',
                    subject: '',
                    teacherId: '',
                    room: '',
                  })}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lesson
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Lesson {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name={`entries.${index}.dayOfWeek`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((day) => (
                              <SelectItem key={day.value} value={day.value}>
                                {day.label}
                              </SelectItem>
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
                      name={`entries.${index}.startTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`entries.${index}.endTime`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`entries.${index}.subject`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select subject" />
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
                      name={`entries.${index}.teacherId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teacher</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select teacher" />
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
                  </div>

                  <FormField
                    control={form.control}
                    name={`entries.${index}.room`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 