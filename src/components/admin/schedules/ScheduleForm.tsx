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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  createSchedule,
  updateSchedule,
  getSchedule,
} from '@/lib/firebaseService/scheduleService';
import type { Schedule, Group } from '@/types';

const scheduleSchema = z.object({
  groupId: z.string().min(1, 'Group is required'),
  semester: z.coerce.number().min(1).max(8),
  year: z.coerce.number().min(2024).max(2030),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

interface ScheduleFormProps {
  mode: 'create' | 'edit';
  scheduleId?: string;
  groups: Group[];
  onFormSubmitSuccess: (schedule: Schedule) => void;
  onCancel: () => void;
}

const ScheduleForm: React.FC<ScheduleFormProps> = ({
  mode,
  scheduleId,
  groups,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      groupId: '',
      semester: 1,
      year: new Date().getFullYear(),
    },
  });

  useEffect(() => {
    if (mode === 'create') {
      form.reset({
        groupId: '',
        semester: 1,
        year: new Date().getFullYear(),
      });
    } else if (mode === 'edit' && scheduleId) {
      const fetchScheduleData = async () => {
        setInitialDataLoading(true);
        try {
          const schedule = await getSchedule(db, scheduleId);
          if (schedule) {
            form.reset({
              groupId: schedule.groupId,
              semester: schedule.semester,
              year: schedule.year,
            });
          } else {
            toast.error('Schedule not found.');
            onCancel();
          }
        } catch (error) {
          console.error('Error fetching schedule:', error);
          toast.error('Failed to load schedule details.');
          onCancel();
        } finally {
          setInitialDataLoading(false);
        }
      };
      fetchScheduleData();
    }
  }, [mode, scheduleId, form, onCancel]);

  const onSubmit = async (values: ScheduleFormValues) => {
    setIsLoading(true);
    try {
      const scheduleData: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'> = {
        groupId: values.groupId,
        semester: values.semester,
        year: values.year,
        lessons: [],
      };

      if (mode === 'create') {
        const newSchedule = await createSchedule(db, scheduleData);
        toast.success('Schedule created successfully!');
        onFormSubmitSuccess(newSchedule);
      } else if (mode === 'edit' && scheduleId) {
        await updateSchedule(db, scheduleId, scheduleData);
        toast.success('Schedule updated successfully!');
        onFormSubmitSuccess({ id: scheduleId, ...scheduleData } as Schedule);
      }
      if (mode === 'create') form.reset();
    } catch (error) {
      console.error('Error submitting schedule form:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save schedule.';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (initialDataLoading && mode === 'edit') {
    return <p className="text-center p-4">Loading schedule data...</p>;
  }

  return (
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
                value={field.value}
                disabled={isLoading || groups.length === 0}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите группу" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {groups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.name} ({group.specialization} - {group.year})
                    </SelectItem>
                  ))}
                  {groups.length === 0 && (
                    <p className="p-2 text-sm text-muted-foreground">
                      No groups available.
                    </p>
                  )}
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
              <Select
                onValueChange={field.onChange}
                value={field.value.toString()}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((semester) => (
                    <SelectItem key={semester} value={semester.toString()}>
                      Semester {semester}
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
          name="year"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Year</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  min={2024}
                  max={2030}
                  disabled={isLoading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ScheduleForm; 