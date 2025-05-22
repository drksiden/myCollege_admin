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
import { getScheduleByGroupId, createSchedule, addScheduleEntry, updateScheduleEntry, deleteScheduleEntry } from '@/lib/firebaseService/scheduleService';
import { getUsersByRole } from '@/lib/firebaseService/userService';
import type { Group, User, Schedule, ScheduleEntry } from '@/types';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

const formSchema = z.object({
  dayOfWeek: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  subject: z.string(),
  teacherId: z.string(),
  room: z.string(),
});

type ScheduleFormValues = z.infer<typeof formSchema>;

interface ScheduleTabProps {
  group: Group;
}

export function ScheduleTab({ group }: ScheduleTabProps) {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dayOfWeek: '',
      startTime: '',
      endTime: '',
      subject: '',
      teacherId: '',
      room: '',
    },
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Load schedule
        const scheduleData = await getScheduleByGroupId(group.id);
        setSchedule(scheduleData);

        // Load teachers
        const teachersData = await getUsersByRole(db, 'teacher');
        setTeachers(teachersData);
      } catch (error) {
        console.error('Error loading schedule data:', error);
        toast.error('Failed to load schedule data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [group.id]);

  const handleCreateSchedule = async () => {
    try {
      const newSchedule = await createSchedule(group.id, {
        groupId: group.id,
        entries: [],
        semester: 1,
        year: new Date().getFullYear(),
      });
      setSchedule(newSchedule);
      toast.success('Schedule created successfully');
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast.error('Failed to create schedule');
    }
  };

  const onSubmit = async (values: ScheduleFormValues) => {
    if (!schedule) {
      await handleCreateSchedule();
    }

    try {
      const entry: ScheduleEntry = {
        id: editingEntry?.id || uuidv4(),
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
        subject: values.subject,
        teacherId: values.teacherId,
        room: values.room,
      };

      if (editingEntry) {
        await updateScheduleEntry(schedule!.id, entry.id, entry);
        toast.success('Schedule entry updated successfully');
      } else {
        await addScheduleEntry(schedule!.id, entry);
        toast.success('Schedule entry added successfully');
      }

      // Reload schedule
      const updatedSchedule = await getScheduleByGroupId(group.id);
      setSchedule(updatedSchedule);
      setIsCreateDialogOpen(false);
      setEditingEntry(null);
      form.reset();
    } catch (error) {
      console.error('Error saving schedule entry:', error);
      toast.error('Failed to save schedule entry');
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!confirm('Are you sure you want to delete this schedule entry?')) {
      return;
    }

    try {
      await deleteScheduleEntry(schedule!.id, entryId);
      const updatedSchedule = await getScheduleByGroupId(group.id);
      setSchedule(updatedSchedule);
      toast.success('Schedule entry deleted successfully');
    } catch (error) {
      console.error('Error deleting schedule entry:', error);
      toast.error('Failed to delete schedule entry');
    }
  };

  const handleEditEntry = (entry: ScheduleEntry) => {
    setEditingEntry(entry);
    form.reset({
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      subject: entry.subject,
      teacherId: entry.teacherId,
      room: entry.room,
    });
    setIsCreateDialogOpen(true);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Schedule</h2>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          Add Schedule Entry
        </Button>
      </div>

      {schedule ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.entries.map((entry) => {
              const teacher = teachers.find(t => t.uid === entry.teacherId);
              return (
                <TableRow key={entry.id}>
                  <TableCell>{entry.dayOfWeek}</TableCell>
                  <TableCell>{entry.startTime} - {entry.endTime}</TableCell>
                  <TableCell>{entry.subject}</TableCell>
                  <TableCell>{teacher ? `${teacher.firstName} ${teacher.lastName}` : 'Unknown'}</TableCell>
                  <TableCell>{entry.room}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditEntry(entry)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteEntry(entry.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted-foreground">No schedule created yet</p>
          <Button onClick={handleCreateSchedule} className="mt-2">
            Create Schedule
          </Button>
        </div>
      )}

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
} 