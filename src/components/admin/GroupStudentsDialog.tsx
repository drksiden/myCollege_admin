import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Group, StudentUser } from '@/types';
import { getUsers, updateUser } from '@/lib/firebaseService/userService';
import { toast } from 'sonner';

interface GroupStudentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  group: Group;
}

export function GroupStudentsDialog({ open, onOpenChange, onSuccess, group }: GroupStudentsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { users } = await getUsers();
        const studentUsers = users.filter(user => user.role === 'student') as StudentUser[];
        setStudents(studentUsers);
      } catch (error) {
        console.error('Error fetching students:', error);
        toast.error('Ошибка при загрузке студентов');
      }
    };

    if (open) {
      fetchStudents();
    }
  }, [open]);

  const handleAddStudent = async () => {
    if (!selectedStudentId) return;

    try {
      setLoading(true);
      const student = students.find(s => s.uid === selectedStudentId);
      if (!student) {
        throw new Error('Student not found');
      }
      const updateData: Partial<StudentUser> = { role: 'student', groupId: group.id };
      await updateUser(selectedStudentId, updateData);
      toast.success('Студент добавлен в группу');
      onSuccess();
      setSelectedStudentId('');
    } catch (error) {
      console.error('Error adding student to group:', error);
      toast.error('Ошибка при добавлении студента');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    try {
      setLoading(true);
      const student = students.find(s => s.uid === studentId);
      if (!student) {
        throw new Error('Student not found');
      }
      const updateData: Partial<StudentUser> = { role: 'student', groupId: null };
      await updateUser(studentId, updateData);
      toast.success('Студент удален из группы');
      onSuccess();
    } catch (error) {
      console.error('Error removing student from group:', error);
      toast.error('Ошибка при удалении студента');
    } finally {
      setLoading(false);
    }
  };

  const groupStudents = students.filter(student => student.groupId === group.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Управление студентами группы</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите студента" />
              </SelectTrigger>
              <SelectContent>
                {students
                  .filter(student => !student.groupId)
                  .map(student => (
                    <SelectItem key={student.uid} value={student.uid}>
                      {student.firstName} {student.lastName}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddStudent} disabled={loading || !selectedStudentId}>
              Добавить
            </Button>
          </div>

          <div className="space-y-2">
            <Label>Студенты в группе</Label>
            {groupStudents.map(student => (
              <div key={student.uid} className="flex items-center justify-between p-2 border rounded">
                <span>{student.firstName} {student.lastName}</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveStudent(student.uid)}
                  disabled={loading}
                >
                  Удалить
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 