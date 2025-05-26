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
import { getStudentsByGroup } from '@/lib/firebaseService/studentService';
import { addStudentToGroup, removeStudentFromGroup } from '@/lib/firebaseService/groupService';
import type { Group, Student } from '@/types';

interface ManageStudentsDialogProps {
  open: boolean;
  group: Group;
  onClose: () => void;
  onSuccess: () => void;
}

export const ManageStudentsDialog: React.FC<ManageStudentsDialogProps> = ({
  open,
  group,
  onClose,
  onSuccess,
}) => {
  const [currentStudents, setCurrentStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadStudents();
    }
  }, [open, group]);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const currentStudents = await getStudentsByGroup(group.id);
      setCurrentStudents(currentStudents);

      // TODO: Implement fetching available students
      // For now, we'll just set an empty array
      setAvailableStudents([]);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddStudent = async (student: Student) => {
    setIsSubmitting(true);
    try {
      await addStudentToGroup(group.id, student.id);
      toast.success('Student added to group');
      await loadStudents();
      onSuccess();
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Failed to add student to group');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (student: Student) => {
    setIsSubmitting(true);
    try {
      await removeStudentFromGroup(group.id, student.id);
      toast.success('Student removed from group');
      await loadStudents();
      onSuccess();
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student from group');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Students - {group.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading students...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Current Students</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{`${student.firstName} ${student.lastName}`}</TableCell>
                        <TableCell>{student.studentCardId}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveStudent(student)}
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
              <h3 className="text-lg font-semibold mb-2">Available Students</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Student ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell>{`${student.firstName} ${student.lastName}`}</TableCell>
                        <TableCell>{student.studentCardId}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAddStudent(student)}
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