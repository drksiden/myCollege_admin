import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { getUsers } from '@/lib/firebaseService/userService';
import { updateGroup } from '@/lib/firebaseService/groupService';
import type { Group, TeacherUser } from '@/types';

interface ManageTeachersDialogProps {
  open: boolean;
  group: Group;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ManageTeachersDialog: React.FC<ManageTeachersDialogProps> = ({
  open,
  group,
  onOpenChange,
  onSuccess,
}) => {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | undefined>(group.curatorId);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadTeachers();
      setSelectedTeacherId(group.curatorId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group]);

  const loadTeachers = async () => {
    setIsLoading(true);
    try {
      const { users } = await getUsers({ role: 'teacher' });
      setTeachers(users as TeacherUser[]);
    } catch (error) {
      console.error('Error loading teachers:', error);
      toast.error('Не удалось загрузить преподавателей');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    try {
      await updateGroup(group.id, { curatorId: selectedTeacherId });
      toast.success(selectedTeacherId ? 'Куратор назначен' : 'Куратор снят');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating curator:', error);
      toast.error('Ошибка при обновлении куратора');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Назначение куратора для группы: {group.name}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Загрузка преподавателей...
          </div>
        ) : (
          <div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Специализация</TableHead>
                  <TableHead className="text-right">Статус</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow
                    key={teacher.uid}
                    className={
                      selectedTeacherId === teacher.uid
                        ? 'bg-green-50 dark:bg-green-900/20'
                        : ''
                    }
                    onClick={() => setSelectedTeacherId(teacher.uid)}
                    style={{ cursor: 'pointer' }}
                  >
                    <TableCell>{`${teacher.lastName} ${teacher.firstName}`}</TableCell>
                    <TableCell>{teacher.specialization || '-'}</TableCell>
                    <TableCell className="text-right">
                      {selectedTeacherId === teacher.uid ? (
                        <CheckCircle className="text-green-600 inline-block" />
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex items-center gap-2 mt-4">
              <Button
                variant={selectedTeacherId === undefined ? 'default' : 'outline'}
                onClick={() => setSelectedTeacherId(undefined)}
                disabled={isSubmitting}
              >
                <XCircle className="mr-2 h-4 w-4" />Снять куратора
              </Button>
              <span className="text-muted-foreground text-sm">Можно оставить группу без куратора</span>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button onClick={handleSave} disabled={isSubmitting || isLoading}>
            {isSubmitting ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 