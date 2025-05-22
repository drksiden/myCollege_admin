import { useState } from 'react';
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
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { createGroup, updateGroup } from '@/lib/firebaseService/groupService';
import type { Group } from '@/types';

interface GroupFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group?: Group;
  onSuccess?: () => void;
}

export function GroupFormDialog({ open, onOpenChange, group, onSuccess }: GroupFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: group?.name || '',
    year: group?.year || new Date().getFullYear(),
    specialization: group?.specialization || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (group) {
        // Update existing group
        await updateGroup(db, group.id, {
          name: formData.name,
          year: formData.year,
          specialization: formData.specialization,
        });

        toast.success('Group updated successfully');
      } else {
        // Create new group
        await createGroup(db, {
          name: formData.name,
          year: formData.year,
          specialization: formData.specialization,
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