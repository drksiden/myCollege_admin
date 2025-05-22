import React, { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  createSubject,
  updateSubject,
  getSubject,
} from '@/lib/firebaseService/subjectService';
import type { Subject } from '@/types';

// Обновленная Zod-схема для SubjectForm
const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  hoursPerSemester: z.coerce.number().min(1, 'Hours must be positive').max(500, 'Hours seem too high'),
  type: z.enum(['lecture', 'practice', 'laboratory'], {
    required_error: 'Type is required',
  }),
  teacherId: z.string().optional(),
  groupId: z.string().optional(),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectFormProps {
  mode: 'create' | 'edit';
  subjectId?: string;
  onFormSubmitSuccess: (data: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
  teachers: Array<{ id: string; firstName: string; lastName: string; patronymic?: string }>;
}

const SubjectForm: React.FC<SubjectFormProps> = ({
  mode,
  subjectId,
  onFormSubmitSuccess,
  onCancel,
  teachers,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
      hoursPerSemester: 0,
      type: undefined,
      teacherId: undefined,
      groupId: undefined,
    },
  });

  useEffect(() => {
    if (mode === 'create') {
      form.reset({
        name: '',
        description: '',
        hoursPerSemester: 0,
        type: undefined,
        teacherId: undefined,
        groupId: undefined,
      });
    } else if (mode === 'edit' && subjectId) {
      const fetchSubjectData = async () => {
        setInitialDataLoading(true);
        try {
          const subject = await getSubject(db, subjectId);
          if (subject) {
            form.reset({
              name: subject.name,
              description: subject.description,
              hoursPerSemester: subject.hoursPerSemester,
              type: subject.type,
              teacherId: subject.teacherId,
              groupId: subject.groupId,
            });
          } else {
            toast.error('Subject not found.');
            if (onCancel) onCancel();
          }
        } catch (error) {
          console.error('Error fetching subject:', error);
          toast.error('Failed to load subject details.');
          if (onCancel) onCancel();
        } finally {
          setInitialDataLoading(false);
        }
      };
      fetchSubjectData();
    }
  }, [mode, subjectId, form, onCancel]);

  const onSubmit = async (values: SubjectFormValues) => {
    setIsLoading(true);
    try {
      const subjectData: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'> = {
        name: values.name,
        description: values.description,
        hoursPerSemester: values.hoursPerSemester,
        type: values.type as Subject['type'],
        teacherId: values.teacherId,
        groupId: values.groupId,
      };

      if (mode === 'create') {
        await createSubject(db, subjectData);
        toast.success('Subject created successfully!');
      } else if (mode === 'edit' && subjectId) {
        await updateSubject(db, subjectId, subjectData);
        toast.success('Subject updated successfully!');
      }
      onFormSubmitSuccess(subjectData);
      if (mode === 'create') form.reset();
    } catch (error) {
      console.error('Error submitting subject form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save subject.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (initialDataLoading && mode === 'edit') {
    return <p className="text-center p-4">Loading subject data...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Introduction to Programming" {...field} disabled={isLoading} />
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
                <Textarea placeholder="Detailed description of the subject..." {...field} rows={3} disabled={isLoading} />
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
              <FormLabel>Hours Per Semester</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 60" {...field} disabled={isLoading} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
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
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
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
        <FormField
          control={form.control}
          name="teacherId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Teacher</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {teachers.map(teacher => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {`${teacher.firstName} ${teacher.lastName}${teacher.patronymic ? ` ${teacher.patronymic}` : ''}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isLoading || (initialDataLoading && mode === 'edit')}>
            {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Subject' : 'Save Changes')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default SubjectForm;