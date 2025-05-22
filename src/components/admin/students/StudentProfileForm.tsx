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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import {
  createStudentProfile,
  updateStudentProfile,
  getStudentProfile,
} from '@/lib/firebaseService/studentService';
import { updateUserInFirestore } from '@/lib/firebaseService/userService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import type { Student, Group } from '@/types';
import { Timestamp } from 'firebase/firestore';

// Обновленная Zod-схема для StudentProfileForm
const studentProfileSchema = z.object({
  studentCardId: z.string().min(1, 'Student Card ID is required').max(50, 'Student Card ID too long'),
  groupId: z.string().min(1, 'Group ID is required').max(50, 'Group ID too long'),
  enrollmentDate: z.date({ required_error: 'Enrollment date is required.' }),
  status: z.enum(['active', 'inactive', 'graduated'], {
    required_error: 'Status is required',
  }),
});

export type StudentProfileFormValues = z.infer<typeof studentProfileSchema>;

// Обновленный интерфейс StudentProfileFormProps
interface StudentProfileFormProps {
  mode: 'create' | 'edit';
  userId?: string; // Required for 'create' mode
  studentProfileId?: string; // Required for 'edit' mode
  userName?: string; // For display
  onFormSubmitSuccess: () => void;
  onCancel?: () => void;
}

// Обновленный компонент StudentProfileForm
const StudentProfileForm: React.FC<StudentProfileFormProps> = ({
  mode,
  userId,
  studentProfileId,
  userName,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [initialDataLoading, setInitialDataLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);

  const form = useForm<StudentProfileFormValues>({
    resolver: zodResolver(studentProfileSchema),
    defaultValues: {
      studentCardId: '',
      groupId: '',
      enrollmentDate: new Date(), // Default for create mode
      status: 'active',
    },
  });

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupsList = await getAllGroups(db);
        setGroups(groupsList);
      } catch (error) {
        console.error('Error fetching groups:', error);
        toast.error('Failed to load groups');
      }
    };

    fetchGroups();
  }, []);

  useEffect(() => {
    // Reset form fields when mode or key IDs change, especially for create mode
    if (mode === 'create') {
      form.reset({
        studentCardId: '',
        groupId: '',
        enrollmentDate: new Date(),
        status: 'active',
      });
    } else if (mode === 'edit' && studentProfileId) {
      const fetchProfile = async () => {
        setInitialDataLoading(true);
        try {
          const profile = await getStudentProfile(db, studentProfileId);
          if (profile) {
            form.reset({
              studentCardId: profile.studentCardId,
              groupId: profile.groupId,
              enrollmentDate: profile.enrollmentDate.toDate(), // Convert Firestore Timestamp to Date
              status: profile.status,
            });
          } else {
            toast.error('Student profile not found.');
            if (onCancel) onCancel();
          }
        } catch (error) {
          console.error('Error fetching student profile:', error);
          toast.error('Failed to load student profile.');
          if (onCancel) onCancel();
        } finally {
          setInitialDataLoading(false);
        }
      };
      fetchProfile();
    }
  }, [mode, studentProfileId, form, onCancel]); // Added onCancel to deps

  const onSubmit = async (values: StudentProfileFormValues) => {
    setIsLoading(true);
    try {
      // Prepare data for Firestore, converting Date to Timestamp
      const profileDataForService = {
        studentCardId: values.studentCardId,
        groupId: values.groupId,
        enrollmentDate: Timestamp.fromDate(values.enrollmentDate),
        status: values.status as Student['status'],
      };

      if (mode === 'create') {
        if (!userId) {
          toast.error('User ID is missing. Cannot create student profile.');
          setIsLoading(false);
          return;
        }
        // Create student profile and then update user document
        await createStudentProfile(db, { id: 'temp-id', ...profileDataForService, userId });
        // Link this student profile ID to the user document
        await updateUserInFirestore(db, userId, {});
        toast.success(`Student profile created for ${userName || 'user'} and linked.`);
      } else if (mode === 'edit' && studentProfileId) {
        // Update existing student profile
        await updateStudentProfile(db, studentProfileId, profileDataForService);
        toast.success(`Student profile for ${userName || 'user'} updated.`);
      }
      onFormSubmitSuccess(); // Callback to refresh list or close dialog
      if (mode === 'create') form.reset(); // Reset form only on create for better UX
    } catch (error: unknown) {
      console.error('Error submitting student profile:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save student profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (initialDataLoading && mode === 'edit') {
    return <p className="text-center p-4">Loading profile data...</p>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 p-1">
        <FormField
          control={form.control}
          name="studentCardId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Student Card ID (Номер студенческого)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., S12345" {...field} disabled={isLoading} />
              </FormControl>
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
                disabled={isLoading}
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
          name="enrollmentDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Enrollment Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                      disabled={isLoading}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date > new Date() || date < new Date("1900-01-01")
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
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
            {isLoading ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default StudentProfileForm;
