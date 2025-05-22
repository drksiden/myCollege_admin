import { useState, useEffect, useMemo } from 'react';
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
import { getSubjects, createSubject, updateSubject, deleteSubject } from '@/lib/firebaseService/subjectService';
import type { Subject } from '@/types';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(2, 'Description must be at least 2 characters'),
  credits: z.coerce.number().min(0, 'Credits must be a positive number'),
  hours: z.coerce.number().min(0, 'Hours must be a positive number'),
  hoursPerSemester: z.coerce.number().min(0, 'Hours per semester must be a positive number'),
  type: z.enum(['lecture', 'practice', 'laboratory'], {
    required_error: 'Type is required',
  }),
});

type SubjectFormValues = z.infer<typeof formSchema>;

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  const defaultValues = useMemo(() => ({
    name: '',
    description: '',
    credits: 0,
    hours: 0,
    hoursPerSemester: 0,
    type: 'lecture' as const,
  }), []);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues,
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      setLoading(true);
      const data = await getSubjects();
      setSubjects(data);
    } catch (error) {
      console.error('Error loading subjects:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (values: SubjectFormValues) => {
    try {
      if (editingSubject) {
        await updateSubject(db, editingSubject.id, values);
        toast.success('Subject updated successfully');
      } else {
        await createSubject(db, values);
        toast.success('Subject created successfully');
      }
      setIsDialogOpen(false);
      setEditingSubject(null);
      form.reset(defaultValues);
      loadSubjects();
    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save subject');
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    form.reset({
      name: subject.name,
      description: subject.description,
      credits: subject.credits,
      hours: subject.hours,
      hoursPerSemester: subject.hoursPerSemester,
      type: subject.type,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) {
      return;
    }

    try {
      await deleteSubject(db, id);
      toast.success('Subject deleted successfully');
      loadSubjects();
    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete subject');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading subjects...
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Subject</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </DialogTitle>
              <DialogDescription>
                {editingSubject
                  ? 'Update the subject information below.'
                  : 'Fill in the subject information below.'}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credits</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hoursPerSemester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours per Semester</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
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
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit">
                  {editingSubject ? 'Update' : 'Create'}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Credits</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Hours per Semester</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((subject) => (
            <TableRow key={subject.id}>
              <TableCell>{subject.name}</TableCell>
              <TableCell>{subject.description}</TableCell>
              <TableCell>{subject.credits}</TableCell>
              <TableCell>{subject.hours}</TableCell>
              <TableCell>{subject.hoursPerSemester}</TableCell>
              <TableCell>{subject.type}</TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(subject)}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(subject.id)}
                  >
                    Delete
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 