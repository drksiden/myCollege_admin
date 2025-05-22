import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { getUsersByRole } from '@/lib/firebaseService/userService';
import { getTeachersByGroup, assignTeacherToGroup, removeTeacherFromGroup } from '@/lib/firebaseService/teacherService';
import { db } from '@/lib/firebase';
import type { Group, Teacher } from '@/types';
import { toast } from 'sonner';

interface ManageTeachersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  onSuccess: () => void;
}

export function ManageTeachersDialog({
  open,
  onOpenChange,
  group,
  onSuccess,
}: ManageTeachersDialogProps) {
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [assignedTeachers, setAssignedTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadTeachers = async () => {
      try {
        setLoading(true);
        const [allTeachers, groupTeachers] = await Promise.all([
          getUsersByRole(db, 'teacher'),
          getTeachersByGroup(group.id),
        ]);
        setTeachers(allTeachers);
        setAssignedTeachers(groupTeachers);
      } catch (error) {
        console.error('Error loading teachers:', error);
        toast.error('Failed to load teachers');
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      loadTeachers();
    }
  }, [open, group.id]);

  const handleAssignTeacher = async (teacherId: string) => {
    try {
      await assignTeacherToGroup(teacherId, group.id);
      const updatedTeachers = await getTeachersByGroup(group.id);
      setAssignedTeachers(updatedTeachers);
      toast.success('Teacher assigned successfully');
      onSuccess();
    } catch (error) {
      console.error('Error assigning teacher:', error);
      toast.error('Failed to assign teacher');
    }
  };

  const handleRemoveTeacher = async (teacherId: string) => {
    try {
      await removeTeacherFromGroup(teacherId, group.id);
      const updatedTeachers = await getTeachersByGroup(group.id);
      setAssignedTeachers(updatedTeachers);
      toast.success('Teacher removed successfully');
      onSuccess();
    } catch (error) {
      console.error('Error removing teacher:', error);
      toast.error('Failed to remove teacher');
    }
  };

  const filteredTeachers = teachers.filter((teacher) => {
    const fullName = `${teacher.firstName} ${teacher.lastName}`.toLowerCase();
    const search = searchTerm.toLowerCase();
    return fullName.includes(search);
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage Teachers for {group.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTeachers.map((teacher) => {
                const isAssigned = assignedTeachers.some(t => t.uid === teacher.uid);
                return (
                  <TableRow key={teacher.uid}>
                    <TableCell>
                      {teacher.firstName} {teacher.lastName}
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.specialization || 'N/A'}</TableCell>
                    <TableCell>
                      {isAssigned ? 'Assigned' : 'Not Assigned'}
                    </TableCell>
                    <TableCell>
                      {isAssigned ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemoveTeacher(teacher.uid)}
                        >
                          Remove
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAssignTeacher(teacher.uid)}
                        >
                          Assign
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
} 