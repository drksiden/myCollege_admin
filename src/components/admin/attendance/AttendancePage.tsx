import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { getGroups } from '@/lib/firebaseService/groupService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import { getAttendanceByDate, createAttendanceRecord } from '@/lib/firebaseService/attendanceService';
import type { Group, Subject, Attendance } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

const formSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  date: z.string().min(1, 'Date is required'),
  records: z.array(z.object({
    studentId: z.string(),
    status: z.enum(['present', 'absent', 'late', 'excused']),
    notes: z.string().optional(),
  })),
});

type AttendanceFormValues = z.infer<typeof formSchema>;

export default function AttendancePage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const form = useForm<AttendanceFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      groupId: '',
      subjectId: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      records: [],
    },
  });

  const loadAttendance = useCallback(async () => {
    try {
      const data = await getAttendanceByDate(selectedDate);
      setAttendance(data);
    } catch (error) {
      console.error('Error loading attendance:', error);
      toast.error('Failed to load attendance records');
    }
  }, [selectedDate]);

  useEffect(() => {
    loadData();
  }, []);

  const groupId = form.watch('groupId');
  useEffect(() => {
    if (groupId) {
      loadAttendance();
    }
  }, [groupId, selectedDate, loadAttendance]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [groupsData, subjectsData] = await Promise.all([
        getGroups(),
        getSubjects(),
      ]);
      setGroups(groupsData);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: AttendanceFormValues) => {
    try {
      for (const record of values.records) {
        await createAttendanceRecord({
          studentId: record.studentId,
          subjectId: values.subjectId,
          groupId: values.groupId,
          date: Timestamp.fromDate(new Date(values.date)),
          status: record.status,
          notes: record.notes,
        });
      }
      toast.success('Attendance records created successfully');
      setIsDialogOpen(false);
      form.reset();
      loadAttendance();
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance records');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Attendance</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Attendance</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Attendance Record</DialogTitle>
              <DialogDescription>
                Fill in the attendance information below.
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

                <FormField
                  control={form.control}
                  name="subjectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subject</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
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
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit">Save Attendance</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mb-4">
        <Input
          type="date"
          value={format(selectedDate, 'yyyy-MM-dd')}
          onChange={(e) => setSelectedDate(new Date(e.target.value))}
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendance.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.studentId}</TableCell>
              <TableCell>{record.subjectId}</TableCell>
              <TableCell>{record.status}</TableCell>
              <TableCell>{record.notes}</TableCell>
              <TableCell>
                {format(record.date.toDate(), 'MMM dd, yyyy')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 