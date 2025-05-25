import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Group } from '@/types';
import { createGroup, updateGroup } from '@/lib/firebaseService/groupService';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  year: z.coerce.number().min(2000).max(2100),
  specialization: z.string().min(1, 'Specialization is required'),
  students: z.array(z.string()),
  scheduleId: z.string().optional(),
});

type GroupFormValues = z.infer<typeof formSchema>;

interface GroupFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  group?: Group;
}

export default function GroupFormDialog({
  open,
  onClose,
  onSuccess,
  group,
}: GroupFormDialogProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group?.name || '',
      year: group?.year || new Date().getFullYear(),
      specialization: group?.specialization || '',
      students: group?.students || [],
      scheduleId: group?.scheduleId || '',
    },
  });

  const onSubmit = async (values: GroupFormValues) => {
    try {
      setLoading(true);
      if (group) {
        await updateGroup(db, group.id, {
          name: values.name,
          year: values.year,
          specialization: values.specialization,
          students: values.students,
          scheduleId: values.scheduleId,
        });
        toast.success('Group updated successfully');
      } else {
        await createGroup({
          name: values.name,
          year: values.year,
          specialization: values.specialization,
          students: values.students,
          scheduleId: values.scheduleId,
        });
        toast.success('Group created successfully');
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error('Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {group ? 'Edit Group' : 'Add New Group'}
          </DialogTitle>
          <DialogDescription>
            Fill in the group information below.
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
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 