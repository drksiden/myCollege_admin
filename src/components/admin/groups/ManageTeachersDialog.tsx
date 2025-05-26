import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { PlusCircle, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getAllTeachers, assignTeacherToGroup, removeTeacherFromGroup } from '@/lib/firebaseService/teacherService';
import type { Group, Teacher } from '@/types';

interface ManageTeachersDialogProps {
  open: boolean;
  group: Group;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManageTeachersDialog: React.FC<ManageTeachersDialogProps> = ({
  open,
  group,
  onClose,
  onSuccess,
}) => {
  const [assignedTeachers, setAssignedTeachers] = useState<Teacher[]>([]);
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadTeachers();
    }
  }, [open, group]);

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const allTeachers = await getAllTeachers();
      
      // Filter teachers that are already assigned to this group
      const assigned = allTeachers.filter(teacher => 
        teacher.groups && teacher.groups.includes(group.id)
      );
      setAssignedTeachers(assigned);

      // Filter teachers that are not assigned to this group
      const available = allTeachers.filter(teacher => 
        !teacher.groups || !teacher.groups.includes(group.id)
      );
      setAvailableTeachers(available);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Failed to load teachers');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignTeacher = async (teacher: Teacher) => {
    setIsSubmitting(true);
    try {
      await assignTeacherToGroup(teacher.id, group.id);
      toast.success('Teacher assigned to group');
      await loadTeachers();
      onSuccess();
    } catch (error) {
      console.error('Error assigning teacher:', error);
      toast.error('Failed to assign teacher to group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveTeacher = async (teacher: Teacher) => {
    setIsSubmitting(true);
    try {
      await removeTeacherFromGroup(teacher.id, group.id);
      toast.success('Teacher removed from group');
      await loadTeachers();
      onSuccess();
    } catch (error) {
      console.error('Error removing teacher:', error);
      toast.error('Failed to remove teacher from group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Teachers - {group.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading teachers...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Assigned Teachers</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell>{`${teacher.firstName} ${teacher.lastName}`}</TableCell>
                        <TableCell>{teacher.specialization}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveTeacher(teacher)}
                            disabled={isSubmitting}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Available Teachers</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableTeachers.map((teacher) => (
                      <TableRow key={teacher.id}>
                        <TableCell>{`${teacher.firstName} ${teacher.lastName}`}</TableCell>
                        <TableCell>{teacher.specialization}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignTeacher(teacher)}
                            disabled={isSubmitting}
                          >
                            <PlusCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}; 