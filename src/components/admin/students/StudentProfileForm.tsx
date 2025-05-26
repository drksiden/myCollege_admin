import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { createStudentProfile, updateStudentProfile, getStudentProfile } from '@/lib/firebaseService/studentService';
import { getAllGroups } from '@/lib/firebaseService/groupService';
import type { Group } from '@/types';
import { Timestamp } from 'firebase/firestore';

const formSchema = z.object({
  userId: z.string(),
  enrollmentDate: z.date(),
  dateOfBirth: z.date(),
  status: z.enum(['active', 'inactive', 'graduated']),
  address: z.string(),
  groupId: z.string(),
  studentCardId: z.string(),
  phone: z.string(),
  firstName: z.string(),
  lastName: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

interface StudentProfileFormProps {
  mode: 'create' | 'edit';
  studentProfileId?: string;
  userId: string;
  onFormSubmitSuccess: (studentId: string) => void;
  onCancel: () => void;
}

const StudentProfileForm: React.FC<StudentProfileFormProps> = ({
  mode,
  studentProfileId,
  userId,
  onFormSubmitSuccess,
  onCancel,
}) => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      userId,
      status: 'active',
      enrollmentDate: new Date(),
      dateOfBirth: new Date(),
      address: '',
      groupId: '',
      studentCardId: '',
      phone: '',
      firstName: '',
      lastName: '',
    },
  });

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const groupsData = await getAllGroups();
        setGroups(groupsData);
      } catch (error) {
        console.error('Error loading groups:', error);
        toast.error('Failed to load groups');
      }
    };

    fetchGroups();
  }, [toast]);

  useEffect(() => {
    const fetchStudentProfile = async () => {
      if (mode === 'edit' && studentProfileId) {
        try {
          const profile = await getStudentProfile(studentProfileId);
          if (profile) {
            form.reset({
              ...profile,
              enrollmentDate: profile.enrollmentDate.toDate(),
              dateOfBirth: profile.dateOfBirth.toDate(),
            });
          }
        } catch (error) {
          console.error('Error fetching student profile:', error);
          toast.error('Failed to load student profile');
        }
      }
    };

    fetchStudentProfile();
  }, [mode, studentProfileId, form]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const profileData = {
        ...values,
        enrollmentDate: Timestamp.fromDate(values.enrollmentDate),
        dateOfBirth: Timestamp.fromDate(values.dateOfBirth),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      if (mode === 'create') {
        const newProfile = await createStudentProfile(profileData);
        onFormSubmitSuccess(newProfile);
      } else if (mode === 'edit' && studentProfileId) {
        await updateStudentProfile(studentProfileId, profileData);
        onFormSubmitSuccess(studentProfileId);
      }

      toast.success(`Student profile ${mode === 'create' ? 'created' : 'updated'} successfully`);
    } catch (error) {
      console.error('Error saving student profile:', error);
      toast.error(`Failed to ${mode === 'create' ? 'create' : 'update'} student profile`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            {...form.register('firstName')}
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            {...form.register('lastName')}
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="studentCardId">Student Card ID</Label>
        <Input
          id="studentCardId"
          {...form.register('studentCardId')}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          {...form.register('phone')}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          {...form.register('address')}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="groupId">Group</Label>
        <Select
          value={form.watch('groupId')}
          onValueChange={(value) => form.setValue('groupId', value)}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={form.watch('status')}
          onValueChange={(value) => form.setValue('status', value as 'active' | 'inactive' | 'graduated')}
          disabled={isLoading}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="graduated">Graduated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
        </Button>
      </div>
    </form>
  );
};

export default StudentProfileForm;
