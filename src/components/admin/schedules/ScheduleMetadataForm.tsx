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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createSchedule, updateSchedule, getSchedule } from '@/services/firestore';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import type { Group } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Zod schema for the form
const scheduleMetadataSchema = z.object({
  groupId: z.string().min(1, 'Группа обязательна'),
  semester: z.coerce.number().min(1, 'Семестр должен быть 1 или 2').max(2, 'Семестр должен быть 1 или 2'),
  year: z.coerce
    .number({invalid_type_error: "Год должен быть числом"})
    .min(new Date().getFullYear() - 3, `Слишком старый год`) 
    .max(new Date().getFullYear() + 5, `Слишком далёкий год`), 
});

export type ScheduleMetadataFormValues = z.infer<typeof scheduleMetadataSchema>;

interface ScheduleMetadataFormProps {
  mode: 'create' | 'edit';
  scheduleId?: string; // Required for 'edit' mode
  onFormSubmitSuccess: (scheduleId: string) => void;
  onCancel?: () => void;
}

const ScheduleMetadataForm: React.FC<ScheduleMetadataFormProps> = ({
  mode,
  scheduleId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const form = useForm<ScheduleMetadataFormValues>({
    resolver: zodResolver(scheduleMetadataSchema),
    defaultValues: {
      groupId: '',
      semester: 1,
      year: new Date().getFullYear(),
    },
  });

  useEffect(() => {
    const fetchGroups = async () => {
      setIsLoading(true); // Combined loading state for initial setup
      try {
        const fetchedGroups = await getAllGroups();
        setGroups(fetchedGroups);
        if (fetchedGroups.length === 0) {
            toast.warning("No groups available. Please create groups first to assign schedules.");
        }
      } catch (error) {
        toast.error("Failed to load groups for selection.");
        console.error("Error fetching groups:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    if (mode === 'create') {
      form.reset({ // Reset to defaults for create mode, especially if dialog is reused
        groupId: '',
        semester: 1,
        year: new Date().getFullYear(),
      });
    } else if (mode === 'edit' && scheduleId) {
      const fetchScheduleData = async () => {
        setInitialDataLoading(true);
        setIsLoading(true);
        try {
          const schedule = await getSchedule(scheduleId);
          if (schedule) {
            form.reset({
              groupId: schedule.groupId,
              semester: schedule.semester,
              year: schedule.year,
            });
          } else {
            toast.error('Schedule not found.');
            if (onCancel) onCancel();
          }
        } catch (error) {
          console.error('Error fetching schedule:', error);
          toast.error('Failed to load schedule details.');
          if (onCancel) onCancel();
        } finally {
          setInitialDataLoading(false);
          setIsLoading(false);
        }
      };
      fetchScheduleData();
    }
  }, [mode, scheduleId, form, onCancel]);

  const onSubmit = async (values: ScheduleMetadataFormValues) => {
    setIsLoading(true);
    try {
      let resultingScheduleId = scheduleId; 

      if (mode === 'create') {
        const newScheduleId = await createSchedule({
          groupId: values.groupId,
          semester: values.semester,
          year: values.year,
          lessons: [],
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        resultingScheduleId = newScheduleId;
        toast.success('Schedule created successfully! You can now add lessons.');
      } else if (mode === 'edit' && scheduleId) {
        await updateSchedule(scheduleId, {
          groupId: values.groupId,
          semester: values.semester,
          year: values.year,
          updatedAt: Timestamp.now(),
        });
        toast.success('Schedule metadata updated successfully!');
      }
      if (resultingScheduleId) {
        onFormSubmitSuccess(resultingScheduleId);
      }
      if (mode === 'create') form.reset();
    } catch (error: unknown) {
      console.error('Error submitting schedule metadata form:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save schedule metadata.');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialDataLoading && mode === 'edit') {
    return <p className="text-center p-4">Loading schedule data...</p>;
  }
   if (isLoading && groups.length === 0 && mode === 'create') {
     return <p className="text-center p-4">Loading group data for selection... Ensure groups exist.</p>;
  }


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="groupId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Группа</FormLabel>
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
                  {groups.length === 0 && <p className="p-2 text-sm text-muted-foreground">Нет доступных групп</p>}
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
              <FormLabel>Семестр</FormLabel>
              <Select 
                onValueChange={(value) => field.onChange(parseInt(value, 10))} 
                value={field.value?.toString()}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите семестр" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="1">1 Семестр</SelectItem>
                  <SelectItem value="2">2 Семестр</SelectItem>
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
              <FormLabel>Учебный год (начальный год)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder={`например, ${new Date().getFullYear()}`} 
                  {...field} 
                  disabled={isLoading}
                  // RHF handles string-to-number conversion with Zod schema
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Отмена
            </Button>
          )}
          <Button type="submit" disabled={isLoading || (mode === 'create' && groups.length === 0)}>
            {isLoading ? 'Saving...' : (mode === 'create' ? 'Создать и добавить занятия' : 'Сохранить изменения')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default ScheduleMetadataForm;
