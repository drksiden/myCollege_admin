import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { db } from '@/lib/firebase';
import { createGroup, updateGroup } from '@/lib/firebaseService/groupService';
import { getAllTeachers } from '@/lib/firebaseService/teacherService';
import { getUsersByRole } from '@/lib/firebaseService/userService';
import type { Group, Teacher, User } from '@/types';

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group;
  onSuccess?: () => void;
}

export function GroupFormDialog({ open, onOpenChange, group, onSuccess }: GroupFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    name: group?.name || '',
    year: group?.year || new Date().getFullYear(),
    specialization: group?.specialization || '',
    curatorId: group?.curatorId || '',
  });

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        const [teacherProfiles, teacherUsers] = await Promise.all([
          getAllTeachers(db),
          getUsersByRole(db, 'teacher')
        ]);
        
        // Создаем мапу пользователей для быстрого доступа
        const userMap = new Map(teacherUsers.map(user => [user.uid, user]));
        
        // Объединяем данные профилей с данными пользователей
        const teachersWithUserData = teacherProfiles.map(profile => {
          const user = userMap.get(profile.userId);
          return {
            ...profile,
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
          };
        });
        
        setTeachers(teachersWithUserData);
        setUsers(teacherUsers);
      } catch (error) {
        console.error('Error loading teachers:', error);
        toast.error('Failed to load teachers');
      }
    };
    loadTeachers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (group) {
        // Update existing group
        await updateGroup(group.id, {
          name: formData.name,
          year: formData.year,
          specialization: formData.specialization,
          curatorId: formData.curatorId,
        });

        toast.success('Group updated successfully');
      } else {
        // Create new group
        await createGroup({
          name: formData.name,
          year: formData.year,
          specialization: formData.specialization,
          curatorId: formData.curatorId,
        });

        toast.success('Group created successfully');
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving group:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{group ? 'Edit Group' : 'Create New Group'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Group Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialization">Specialization</Label>
            <Input
              id="specialization"
              value={formData.specialization}
              onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="curatorId">Curator</Label>
            <Select
              value={formData.curatorId}
              onValueChange={(value) => setFormData({ ...formData, curatorId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select curator" />
              </SelectTrigger>
              <SelectContent>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.userId}>
                    {`${teacher.lastName} ${teacher.firstName}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : group ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 