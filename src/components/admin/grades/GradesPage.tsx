import { useState, useEffect } from 'react';
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
import { getGrades, createGrade, updateGrade, deleteGrade } from '@/lib/firebaseService/gradeService';
import { getStudents } from '@/lib/firebaseService/studentService';
import { getSubjects } from '@/lib/firebaseService/subjectService';
import { getGroups } from '@/lib/firebaseService/groupService';
import type { Grade, Student, Subject, Group } from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { exportGradesToExcel } from '@/lib/exportService';
import BulkGradeInput from './BulkGradeInput';

const formSchema = z.object({
  studentId: z.string().min(1, 'Student is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  groupId: z.string().min(1, 'Group is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  value: z.coerce.number().min(0).max(100),
  type: z.enum(['exam', 'test', 'homework', 'project']),
  semester: z.coerce.number().min(1).max(8),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
});

type GradeFormValues = z.infer<typeof formSchema>;

export default function GradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);

  const form = useForm<GradeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      studentId: '',
      subjectId: '',
      groupId: '',
      teacherId: '',
      value: 0,
      type: 'exam',
      semester: 1,
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gradesData, studentsData, subjectsData, groupsData] = await Promise.all([
        getGrades(),
        getStudents(),
        getSubjects(),
        getGroups(),
      ]);
      setGrades(gradesData);
      setStudents(studentsData);
      setSubjects(subjectsData);
      setGroups(groupsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: GradeFormValues) => {
    try {
      if (editingGrade) {
        await updateGrade(editingGrade.id, values);
        toast.success('Grade updated successfully');
      } else {
        await createGrade(values);
        toast.success('Grade created successfully');
      }
      setIsDialogOpen(false);
      setEditingGrade(null);
      form.reset();
      loadData();
    } catch (error) {
      console.error('Error saving grade:', error);
      toast.error('Failed to save grade');
    }
  };

  const handleEdit = (grade: Grade) => {
    setEditingGrade(grade);
    form.reset({
      studentId: grade.studentId,
      subjectId: grade.subjectId,
      groupId: grade.groupId,
      teacherId: grade.teacherId,
      value: grade.value,
      type: grade.type,
      semester: grade.semester,
      date: format(grade.date.toDate(), 'yyyy-MM-dd'),
      notes: grade.notes,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this grade?')) {
      try {
        await deleteGrade(id);
        toast.success('Grade deleted successfully');
        loadData();
      } catch (error) {
        console.error('Error deleting grade:', error);
        toast.error('Failed to delete grade');
      }
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Grades Management</h1>
        <div className="flex space-x-4">
          <BulkGradeInput
            students={students}
            subjects={subjects}
            groups={groups}
            onSuccess={loadData}
          />
          <Button
            variant="outline"
            onClick={() => exportGradesToExcel({ grades, students, subjects, groups })}
          >
            Export to Excel
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>Add Grade</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingGrade ? 'Edit Grade' : 'Add New Grade'}
                </DialogTitle>
                <DialogDescription>
                  Fill in the grade information below.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students.map((student) => (
                              <SelectItem key={student.id} value={student.id}>
                                {student.firstName} {student.lastName}
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
                    name="value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Grade Value</FormLabel>
                        <FormControl>
                          <Input type="number" min={0} max={100} {...field} />
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
                        <FormLabel>Grade Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="exam">Exam</SelectItem>
                            <SelectItem value="test">Test</SelectItem>
                            <SelectItem value="homework">Homework</SelectItem>
                            <SelectItem value="project">Project</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit">
                    {editingGrade ? 'Update Grade' : 'Add Grade'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Group</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Semester</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grades.map((grade) => {
            const student = students.find(s => s.id === grade.studentId);
            const subject = subjects.find(s => s.id === grade.subjectId);
            const group = groups.find(g => g.id === grade.groupId);

            return (
              <TableRow key={grade.id}>
                <TableCell>
                  {student ? `${student.firstName} ${student.lastName}` : grade.studentId}
                </TableCell>
                <TableCell>{subject?.name || grade.subjectId}</TableCell>
                <TableCell>{group?.name || grade.groupId}</TableCell>
                <TableCell>{grade.value}</TableCell>
                <TableCell>{grade.type}</TableCell>
                <TableCell>{grade.semester}</TableCell>
                <TableCell>
                  {format(grade.date.toDate(), 'MMM dd, yyyy')}
                </TableCell>
                <TableCell>{grade.notes}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(grade)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(grade.id)}
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
    </div>
  );
} 