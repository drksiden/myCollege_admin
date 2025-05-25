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
import { db } from '@/lib/firebase';
import {
  createGroup,
  updateGroup,
  getGroup,
} from '@/lib/firebaseService/groupService';
import { getAllTeachers as getAllTeacherProfiles } from '@/lib/firebaseService/teacherService';
import { getUsersFromFirestore } from '@/lib/firebaseService/userService';
import type { Teacher } from '@/types';

// Zod schema for the form
const groupSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100, 'Name too long'),
  year: z.number()
    .min(new Date().getFullYear() - 10, `Year too old`) 
    .max(new Date().getFullYear() + 5, `Year too far in future`),
  specialization: z.string().min(1, 'Specialization is required').max(100, 'Specialization too long'),
  curatorId: z.string().min(1, 'Curator is required'),
  course: z.number().min(1, 'Course is required').max(5, 'Course too high'),
});

type GroupFormValues = z.infer<typeof groupSchema>;

interface GroupFormProps {
  mode: 'create' | 'edit';
  groupId?: string;
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
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string; patronymic?: string }>>([]);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      year: new Date().getFullYear(),
      specialization: '',
      curatorId: '',
      course: 1,
    },
  });

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const [teacherProfiles, allUsers] = await Promise.all([
          getAllTeacherProfiles(db),
          getUsersFromFirestore(db),
        ]);

        const userMap = new Map(allUsers.map(u => [u.uid, u]));
        const teachersWithNames = teacherProfiles.map(t => ({
          id: t.id,
          firstName: userMap.get(t.userId)?.firstName || '',
          lastName: userMap.get(t.userId)?.lastName || '',
          patronymic: userMap.get(t.userId)?.middleName,
        }));
        setTeachers(teachersWithNames);
      } catch (error) {
        console.error('Error fetching teachers:', error);
        toast.error('Failed to load teachers');
      }
    };

    fetchTeachers();
  }, []);

  useEffect(() => {
    if (mode === 'edit' && groupId) {
      const fetchGroup = async () => {
        setInitialDataLoading(true);
        try {
          const group = await getGroup(groupId);
          if (group) {
            form.reset({
              name: group.name,
              year: group.year,
              specialization: group.specialization,
              curatorId: group.curatorId || '',
              course: group.course,
            });
          }
        } catch (error) {
          console.error('Error fetching group:', error);
          toast.error('Failed to load group data');
        } finally {
          setInitialDataLoading(false);
        }
      };
      fetchGroup();
    }
  }, [mode, groupId, form]);

  const onSubmit = async (values: GroupFormValues) => {
    setIsLoading(true);
    try {
      if (mode === 'create') {
        await createGroup(values);
        toast.success('Group created successfully');
      } else if (mode === 'edit' && groupId) {
        await updateGroup(groupId, values);
        toast.success('Group updated successfully');
      }
      onFormSubmitSuccess();
    } catch (error) {
      console.error('Error submitting group:', error);
      toast.error('Failed to save group');
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
                <Input 
                  type="number" 
                  placeholder="e.g., 2023" 
                  {...field} 
                  disabled={isLoading} 
                  onChange={e => field.onChange(Number(e.target.value))}
                  value={field.value}
                />
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
        <FormField
          control={form.control}
          name="curatorId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Curator</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select curator" />
                </SelectTrigger>
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
        <FormField
          control={form.control}
          name="course"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Курс</FormLabel>
              <Select onValueChange={value => field.onChange(Number(value))} value={field.value?.toString() || ''} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите курс" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                  <SelectItem value="5">5</SelectItem>
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
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : (mode === 'create' ? 'Create Group' : 'Save Changes')}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default GroupForm;