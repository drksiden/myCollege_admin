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
  getSubject, // To pre-fill form in edit mode
} from '@/lib/firebaseService/subjectService';
import type { Subject } from '@/types';

// Zod schema for the form
const subjectSchema = z.object({
  name: z.string().min(1, 'Subject name is required').max(100, 'Name too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long'),
  hoursPerSemester: z.coerce.number().min(1, 'Hours must be positive').max(500, 'Hours seem too high'),
  type: z.enum(['lecture', 'practice', 'laboratory'], {
    required_error: 'Subject type is required',
  }),
});

export type SubjectFormValues = z.infer<typeof subjectSchema>;

interface SubjectFormProps {
  mode: 'create' | 'edit';
  subjectId?: string; // Required for 'edit' mode
  onFormSubmitSuccess: () => void;
  onCancel?: () => void;
}

const SubjectForm: React.FC<SubjectFormProps> = ({
  mode,
  subjectId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);

  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: {
      name: '',
      description: '',
      hoursPerSemester: 0, // Default to 0 or a more sensible default like 30
      type: undefined,
    },
  });

  useEffect(() => {
    // Reset form fields when mode changes or for create mode
    if (mode === 'create') {
      form.reset({
        name: '',
        description: '',
        hoursPerSemester: 0, // Or a sensible default like 30
        type: undefined,
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
      const subjectData = {
        name: values.name,
        description: values.description,
        hoursPerSemester: values.hoursPerSemester,
        type: values.type as Subject['type'], // Ensure correct type
      };

      if (mode === 'create') {
        await createSubject(db, subjectData);
        toast.success('Subject created successfully!');
      } else if (mode === 'edit' && subjectId) {
        await updateSubject(db, subjectId, subjectData);
        toast.success('Subject updated successfully!');
      }
      onFormSubmitSuccess(); // Callback to refresh list or close dialog
      if (mode === 'create') form.reset(); // Only reset for create mode for better UX
    } catch (error: any) {
      console.error('Error submitting subject form:', error);
      toast.error(error.message || 'Failed to save subject.');
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
              <FormLabel>Subject Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject type" />
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