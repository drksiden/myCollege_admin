import { useState, useEffect } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { Group, Teacher, User } from '@/types';
import { createGroup, updateGroup } from '@/lib/firebaseService/groupService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import { getUsersFromFirestoreByIds } from '@/lib/firebaseService/userService';
import { toast } from 'sonner';

const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  year: z.coerce.number().min(2000).max(2100),
  specialization: z.string().min(1, 'Specialization is required'),
  curatorId: z.string().min(1, 'Curator ID is required'),
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
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const fetchedTeachers = await getAllTeachers();
        console.log('Fetched teachers:', fetchedTeachers);
        setTeachers(fetchedTeachers);
        
        const userIds = fetchedTeachers.map(t => t.userId).filter(Boolean);
        console.log('Teacher user IDs:', userIds);
        if (userIds.length > 0) {
          const fetchedUsers = await getUsersFromFirestoreByIds(userIds);
          console.log('Fetched users:', fetchedUsers);
          setUsers(fetchedUsers);
        }
      } catch (error) {
        console.error('Error fetching teachers:', error);
        toast.error('Failed to load teachers');
      }
    };

    if (open) {
      fetchTeachers();
    }
  }, [open]);

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return 'Unknown Teacher';
    const user = users.find(u => u.uid === teacher.userId);
    if (!user) return 'Unknown Teacher';
    const fullName = [
      user.lastName,
      user.firstName,
      user.middleName
    ].filter(Boolean).join(' ');
    return fullName || 'Unknown Teacher';
  };

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group?.name || '',
      year: group?.year || new Date().getFullYear(),
      specialization: group?.specialization || '',
      curatorId: group?.curatorId || '',
    },
  });

  const onSubmit = async (values: GroupFormValues) => {
    try {
      setLoading(true);
      if (group) {
        await updateGroup(group.id, {
          name: values.name,
          year: values.year,
          specialization: values.specialization,
          curatorId: values.curatorId,
        });
        toast.success('Group updated successfully');
      } else {
        await createGroup({
          name: values.name,
          year: values.year,
          specialization: values.specialization,
          curatorId: values.curatorId,
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
            <FormField
              control={form.control}
              name="curatorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Куратор</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите куратора">
                          {field.value ? getTeacherName(field.value) : "Выберите куратора"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teachers.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {getTeacherName(teacher.id)}
                        </SelectItem>
                      ))}
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