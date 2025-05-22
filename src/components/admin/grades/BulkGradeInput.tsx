import { useState } from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Student, Subject, Group } from '@/types';
import { createGrade } from '@/lib/firebaseService/gradeService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

const formSchema = z.object({
  subjectId: z.string().min(1, 'Subject is required'),
  groupId: z.string().min(1, 'Group is required'),
  teacherId: z.string().min(1, 'Teacher is required'),
  type: z.enum(['exam', 'test', 'homework', 'project']),
  semester: z.coerce.number().min(1).max(8),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional(),
  grades: z.array(z.object({
    studentId: z.string(),
    value: z.coerce.number().min(0).max(100),
  })),
});

type BulkGradeFormValues = z.infer<typeof formSchema>;

interface BulkGradeInputProps {
  students: Student[];
  subjects: Subject[];
  groups: Group[];
  onSuccess: () => void;
}

export default function BulkGradeInput({ students, subjects, groups, onSuccess }: BulkGradeInputProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>('');

  const form = useForm<BulkGradeFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subjectId: '',
      groupId: '',
      teacherId: '',
      type: 'exam',
      semester: 1,
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      grades: [],
    },
  });

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    const groupStudents = students.filter(student => student.groupId === groupId);
    form.setValue('grades', groupStudents.map(student => ({
      studentId: student.id,
      value: 0,
    })));
  };

  const onSubmit = async (values: BulkGradeFormValues) => {
    try {
      const promises = values.grades.map(grade => 
        createGrade({
          ...values,
          studentId: grade.studentId,
          value: grade.value,
          date: Timestamp.fromDate(new Date(values.date)),
        })
      );

      await Promise.all(promises);
      toast.success('Grades added successfully');
      setIsDialogOpen(false);
      form.reset();
      onSuccess();
    } catch (error) {
      console.error('Error adding grades:', error);
      toast.error('Failed to add grades');
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Bulk Add Grades</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Grades for Group</DialogTitle>
          <DialogDescription>
            Enter grades for all students in the selected group.
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
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleGroupChange(value);
                    }}
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

            {selectedGroup && (
              <div className="space-y-4">
                <h3 className="font-medium">Student Grades</h3>
                {form.watch('grades').map((grade, index) => {
                  const student = students.find(s => s.id === grade.studentId);
                  return (
                    <div key={grade.studentId} className="flex items-center space-x-4">
                      <span className="w-48">
                        {student ? `${student.firstName} ${student.lastName}` : grade.studentId}
                      </span>
                      <FormField
                        control={form.control}
                        name={`grades.${index}.value`}
                        render={({ field }) => (
                          <FormItem className="flex-1">
                            <FormControl>
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            <Button type="submit">Add Grades</Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 