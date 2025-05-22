import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { db } from '@/lib/firebase';
import { 
  getStudentsInGroupDetails, 
  addStudentToGroup, 
  removeStudentFromGroup 
} from '@/lib/firebaseService/groupService';
import { getUsersByRole } from '@/lib/firebaseService/userService';
import type { Group, Student, User } from '@/types';

interface ManageStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: Group;
  onSuccess?: () => void;
}

export function ManageStudentsDialog({ open, onOpenChange, group, onSuccess }: ManageStudentsDialogProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      // Load current students in the group
      const currentStudents = await getStudentsInGroupDetails(db, group.students);
      setStudents(currentStudents);

      // Load all students (users with role 'student')
      const allStudents = await getUsersByRole(db, 'student');
      // Filter out students that are already in the group
      const available = allStudents.filter(
        student => !group.students.includes(student.uid)
      );
      setAvailableStudents(available);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    }
  }, [group.students, group.id]);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, loadData]);

  const handleAddStudent = async (student: User) => {
    try {
      await addStudentToGroup(db, group.id, student.uid);
      toast.success('Student added to group');
      loadData();
      onSuccess?.();
    } catch (error) {
      console.error('Error adding student:', error);
      toast.error('Failed to add student to group');
    }
  };

  const handleRemoveStudent = async (student: Student) => {
    try {
      await removeStudentFromGroup(db, group.id, student.id);
      toast.success('Student removed from group');
      loadData();
      onSuccess?.();
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student from group');
    }
  };

  const filteredAvailableStudents = availableStudents.filter(student =>
    student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Manage Students - {group.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Students */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Current Students</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.firstName} {student.lastName}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveStudent(student)}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Add Students */}
          <div>
            <h3 className="text-lg font-semibold mb-2">Add Students</h3>
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4"
            />
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAvailableStudents.map((student) => (
                  <TableRow key={student.uid}>
                    <TableCell>{student.firstName} {student.lastName}</TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddStudent(student)}
                      >
                        Add
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 