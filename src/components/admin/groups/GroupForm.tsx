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
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  createGroup,
  updateGroup,
  getGroup,
} from '@/lib/firebaseService/groupService';
// Group type is not explicitly imported as it's inferred or handled by service

// Zod schema for the form
const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long'),
  // Ensure year is treated as a number. Default browser behavior for type="number" can be tricky.
  year: z.preprocess(
    (val) => (typeof val === 'string' ? parseInt(val, 10) : val),
    z.number({ invalid_type_error: 'Year must be a number' })
     .min(new Date().getFullYear() - 10, `Year too old`) 
     .max(new Date().getFullYear() + 5, `Year too far in future`)
  ),
  specialization: z.string().min(1, 'Specialization is required').max(100, 'Specialization too long'),
});

export type GroupFormValues = z.infer<typeof groupSchema>;

interface GroupFormProps {
  mode: 'create' | 'edit';
  groupId?: string; // Required for 'edit' mode
  onFormSubmitSuccess: () => void;
  onCancel?: () => void;
}

const GroupForm: React.FC<GroupFormProps> = ({
  mode,
  groupId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      year: new Date().getFullYear(), // Default to current year
      specialization: '',
    },
  });

  useEffect(() => {
    if (mode === 'create') {
      form.reset({
        name: '',
        year: new Date().getFullYear(),
        specialization: '',
      });
    } else if (mode === 'edit' && groupId) {
      const fetchGroupData = async () => {
        setInitialDataLoading(true);
        try {
          const group = await getGroup(db, groupId);
          if (group) {
            form.reset({
              name: group.name,
              year: group.year,
              specialization: group.specialization,
            });
          } else {
            toast.error('Group not found.');
            if (onCancel) onCancel();
          }
        } catch (error) {
          console.error('Error fetching group:', error);
          toast.error('Failed to load group details.');
          if (onCancel) onCancel();
        } finally {
          setInitialDataLoading(false);
        }
      };
      fetchGroupData();
    }
  }, [mode, groupId, form, onCancel]);

  const onSubmit = async (values: GroupFormValues) => {
    setIsLoading(true);
    try {
      const groupData = {
        name: values.name,
        year: values.year, // Already a number due to Zod preprocessing & schema
        specialization: values.specialization,
      };

      if (mode === 'create') {
        // students and scheduleId will be initialized by the service
        await createGroup(db, groupData);
        toast.success('Group created successfully!');
      } else if (mode === 'edit' && groupId) {
        await updateGroup(db, groupId, groupData);
        toast.success('Group updated successfully!');
      }
      onFormSubmitSuccess();
      if (mode === 'create') form.reset(); // Reset only on create
    } catch (error: any) {
      console.error('Error submitting group form:', error);
      toast.error(error.message || 'Failed to save group.');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialDataLoading && mode === 'edit') {
    return <p className="text-center p-4">Loading group data...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., CS-101, Engineering Year 1" {...field} disabled={isLoading} />
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
              <FormLabel>Enrollment Year</FormLabel>
              <FormControl>
                {/* Ensure input type is number, but rely on RHF and Zod for state management */}
                <Input type="number" placeholder="e.g., 2023" {...field} disabled={isLoading} 
                       onChange={e => field.onChange(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                       value={field.value ?? ''} />
              </FormControl>
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
                <Input placeholder="e.g., Computer Science, Mechanical Engineering" {...field} disabled={isLoading} />
              </FormControl>
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
            {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Group' : 'Save Changes')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default GroupForm;