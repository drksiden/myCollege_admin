import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db } from '@/lib/firebase';
import { getScheduleByGroupId, createSchedule, addLesson, updateLesson, deleteLesson } from '@/lib/firebaseService/scheduleService';
import { getUsersByRole } from '@/lib/firebaseService/userService';
import type { Group, User, Schedule, Lesson } from '@/types';
import { toast } from 'sonner';
import { PlusCircle, Trash2, Loader2, Edit2 } from 'lucide-react';

const formSchema = z.object({
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  subject: z.string(),
  teacherId: z.string(),
  room: z.string(),
  type: z.enum(['lecture', 'practice', 'laboratory']),
});

type ScheduleFormValues = z.infer<typeof formSchema>;

interface ScheduleTabProps {
  group: Group;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({ group }) => {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Lesson | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      subject: '',
      teacherId: '',
      room: '',
      type: 'lecture',
    },
  });

  useEffect(() => {
    loadSchedule();
  }, [group.id]);

  const loadSchedule = async () => {
    setIsLoading(true);
    try {
      const scheduleData = await getScheduleByGroupId(db, group.id);
      setSchedule(scheduleData);

      // Load teachers
      const teachersData = await getUsersByRole(db, 'teacher');
      setTeachers(teachersData);
    } catch (error) {
      console.error('Error loading schedule:', error);
      toast.error('Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    setIsSubmitting(true);
    try {
      const newSchedule = await createSchedule(db, {
        groupId: group.id,
        semester: 1,
        year: new Date().getFullYear(),
        lessons: [],
      });
      setSchedule(newSchedule);
      toast.success('Schedule created successfully');
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddEntry = async (entry: Omit<Lesson, 'id'>) => {
    setIsSubmitting(true);
    try {
      await addLesson(db, schedule!.id, {
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        room: entry.room,
        type: entry.type,
      });
      const updatedSchedule = await getScheduleByGroupId(db, group.id);
      setSchedule(updatedSchedule);
      toast.success('Schedule entry added successfully');
    } catch (error) {
      console.error('Error adding schedule entry:', error);
      toast.error('Failed to add schedule entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    setIsSubmitting(true);
    try {
      await deleteLesson(db, schedule!.id, entryId);
      const updatedSchedule = await getScheduleByGroupId(db, group.id);
      setSchedule(updatedSchedule);
      toast.success('Schedule entry deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      toast.error('Failed to delete schedule entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditEntry = (entry: Lesson) => {
    setEditingEntry(entry);
    form.reset({
      dayOfWeek: entry.dayOfWeek.toString(),
      startTime: entry.startTime,
      endTime: entry.endTime,
      subject: entry.subjectId,
      teacherId: entry.teacherId,
      room: entry.room,
      type: entry.type,
    });
    setIsCreateDialogOpen(true);
  };

  const onSubmit = async (values: ScheduleFormValues) => {
    if (!schedule) {
      await handleCreateSchedule();
      return;
    }

    const entry: Omit<Lesson, 'id'> = {
      dayOfWeek: parseInt(values.dayOfWeek),
      startTime: values.startTime,
      endTime: values.endTime,
      subjectId: values.subject,
      teacherId: values.teacherId,
      room: values.room,
      type: values.type,
    };

    try {
      if (editingEntry) {
        await updateLesson(db, schedule.id, editingEntry.id, entry);
      } else {
        await addLesson(db, schedule.id, entry);
      }

      const updatedSchedule = await getScheduleByGroupId(db, group.id);
      setSchedule(updatedSchedule);
      setIsCreateDialogOpen(false);
      setEditingEntry(null);
      form.reset();
    } catch (error) {
      console.error('Error saving schedule entry:', error);
      toast.error('Failed to save schedule entry');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading schedule...
      </div>
    );
  }

  if (!schedule) {
    return (
      <div className="flex flex-col items-center justify-center p-4 space-y-4">
        <p className="text-muted-foreground">No schedule found for this group.</p>
        <Button onClick={handleCreateSchedule} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Schedule
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Schedule</h3>
        <Button onClick={() => handleAddEntry({
          dayOfWeek: 1,
          startTime: '09:00',
          endTime: '10:30',
          subjectId: '',
          teacherId: '',
          room: '',
          type: 'lecture',
        })} disabled={isSubmitting}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.lessons.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{getDayName(entry.dayOfWeek)}</TableCell>
                <TableCell>{`${entry.startTime} - ${entry.endTime}`}</TableCell>
                <TableCell>{entry.subjectId}</TableCell>
                <TableCell>{entry.teacherId}</TableCell>
                <TableCell>{entry.room}</TableCell>
                <TableCell className="capitalize">{entry.type}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditEntry(entry)}
                    disabled={isSubmitting}
                    className="mr-2"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteEntry(entry.id)}
                    disabled={isSubmitting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEntry ? 'Edit Schedule Entry' : 'Add Schedule Entry'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
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
                        <SelectItem value="Monday">Monday</SelectItem>
                        <SelectItem value="Tuesday">Tuesday</SelectItem>
                        <SelectItem value="Wednesday">Wednesday</SelectItem>
                        <SelectItem value="Thursday">Thursday</SelectItem>
                        <SelectItem value="Friday">Friday</SelectItem>
                        <SelectItem value="Saturday">Saturday</SelectItem>
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
                        <Input type="time" {...field} />
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
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
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
                          <SelectItem key={teacher.uid} value={teacher.uid}>
                            {teacher.firstName} {teacher.lastName}
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
                name="room"
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

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
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

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingEntry(null);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingEntry ? 'Update' : 'Add'} Entry
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const getDayName = (dayOfWeek: number): string => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[dayOfWeek - 1] || 'Unknown';
}; 