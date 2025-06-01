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
import { getUsers, updateUser } from '@/lib/firebaseService/userService';
import type { Group, StudentUser } from '@/types';

interface GroupStudentsDialogProps {
  open: boolean;
  group: Group;
  onClose: () => void;
  onSuccess: () => void;
}

export const GroupStudentsDialog: React.FC<GroupStudentsDialogProps> = ({
  open,
  group,
  onClose,
  onSuccess,
}) => {
  const [assignedStudents, setAssignedStudents] = useState<StudentUser[]>([]);
  const [availableStudents, setAvailableStudents] = useState<StudentUser[]>([]);
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
      // Загружаем студентов группы
      const { users: groupStudents } = await getUsers({ 
        role: 'student',
        groupId: group.id 
      });
      setAssignedStudents(groupStudents as StudentUser[]);

      // Загружаем студентов без группы
      const { users: unassignedStudents } = await getUsers({ 
        role: 'student',
        groupId: null 
      });
      setAvailableStudents(unassignedStudents as StudentUser[]);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Не удалось загрузить список студентов');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignStudent = async (student: StudentUser) => {
    setIsSubmitting(true);
    try {
      await updateUser(student.uid, { groupId: group.id });
      toast.success('Студент добавлен в группу');
      await loadStudents();
      onSuccess();
    } catch (error) {
      console.error('Error assigning student:', error);
      toast.error('Не удалось добавить студента в группу');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveStudent = async (student: StudentUser) => {
    setIsSubmitting(true);
    try {
      await updateUser(student.uid, { groupId: null });
      toast.success('Студент удален из группы');
      await loadStudents();
      onSuccess();
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Не удалось удалить студента из группы');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Управление студентами - {group.name}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Загрузка студентов...
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Студенты в группе</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ФИО</TableHead>
                      <TableHead>Номер студ. билета</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedStudents.map((student) => (
                      <TableRow key={student.uid}>
                        <TableCell>{`${student.lastName} ${student.firstName} ${student.middleName || ''}`}</TableCell>
                        <TableCell>{student.studentIdNumber || '-'}</TableCell>
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
              <h3 className="text-lg font-semibold mb-2">Доступные студенты</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ФИО</TableHead>
                      <TableHead>Номер студ. билета</TableHead>
                      <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {availableStudents.map((student) => (
                      <TableRow key={student.uid}>
                        <TableCell>{`${student.lastName} ${student.firstName} ${student.middleName || ''}`}</TableCell>
                        <TableCell>{student.studentIdNumber || '-'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleAssignStudent(student)}
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