import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
import { getStudent, updateStudent } from '@/lib/firebaseService/studentService';
import { getGroups } from '@/lib/firebaseService/groupService';
import { getAttendanceByStudent } from '@/lib/firebaseService/attendanceService';
import type { Student, Group, Attendance } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

const formSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  groupId: z.string().optional(),
  specialization: z.string().optional(),
  year: z.coerce.number().min(1).max(6).optional(),
});

type StudentFormValues = z.infer<typeof formSchema>;

export function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [student, setStudent] = useState<Student | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      groupId: '',
      specialization: '',
      year: undefined,
    },
  });

  const loadData = useCallback(async () => {
    if (!studentId) return;

    try {
      setLoading(true);
      const [studentData, groupsData] = await Promise.all([
        getStudent(studentId),
        getGroups(),
      ]);

      if (studentData) {
        setStudent(studentData);
        form.reset({
          firstName: studentData.firstName,
          lastName: studentData.lastName,
          email: studentData.email,
          groupId: studentData.groupId || '',
          specialization: studentData.specialization || '',
          year: studentData.year,
        });

        const attendanceData = await getAttendanceByStudent(studentData.uid);
        setAttendance(attendanceData);
      }

      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, [studentId, form]);

  useEffect(() => {
    if (studentId) {
      loadData();
    }
  }, [studentId, loadData]);

  const onSubmit = async (values: StudentFormValues) => {
    if (!studentId) return;

    try {
      await updateStudent(studentId, values);
      toast.success('Student profile updated successfully');
      setIsEditing(false);
      loadData();
    } catch (error) {
      console.error('Error updating student:', error);
      toast.error('Failed to update student profile');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!student) {
    return <div>Student not found</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Student Profile</h1>
        <Button
          variant={isEditing ? "secondary" : "default"}
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing} />
                    </FormControl>
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
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={!isEditing}
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
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <FormControl>
                      <Input {...field} disabled={!isEditing} />
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
                      <Input
                        type="number"
                        min={1}
                        max={6}
                        {...field}
                        disabled={!isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <Button type="submit">Save Changes</Button>
              )}
            </form>
          </Form>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Attendance History</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    {format(record.date.toDate(), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{record.subjectId}</TableCell>
                  <TableCell>{record.status}</TableCell>
                  <TableCell>{record.notes}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
} 