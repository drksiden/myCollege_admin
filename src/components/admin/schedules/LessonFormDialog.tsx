import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LessonForm from './LessonForm';
import { getSubjectsByGroup } from '@/lib/firebaseService/subjectService';
import { getUsers } from '@/lib/firebaseService/userService';
import { createLesson } from '@/lib/firebaseService/scheduleService';
import { toast } from 'sonner';
import type { Subject, TeacherUser, Lesson, Group } from '@/types';

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId: string;
  semesterId: string;
  onSuccess?: () => void;
  groups: Group[];
}

export const LessonFormDialog: React.FC<LessonFormDialogProps> = ({
  open,
  onOpenChange,
  groupId,
  semesterId,
  onSuccess,
  groups,
}) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subjectsData, teachersData] = await Promise.all([
          getSubjectsByGroup(groupId),
          getUsers({ role: 'teacher' })
        ]);
        setSubjects(subjectsData);
        setTeachers(teachersData.users as TeacherUser[]);
      } catch (error) {
        console.error('Error loading form data:', error);
        toast.error('Не удалось загрузить данные формы');
      }
    };

    if (open) {
      loadData();
    }
  }, [open, groupId]);

  const handleSubmit = async (data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createLesson({
        ...data,
        groupId,
        semesterId,
      });
      toast.success('Занятие успешно создано');
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast.error('Не удалось создать занятие');
    }
  };

  const handleDelete = () => {
    // Since this is a create dialog, we don't need to implement delete functionality
    console.log('Delete not implemented for create dialog');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Создать занятие</DialogTitle>
        </DialogHeader>
        <LessonForm
          open={open}
          onOpenChange={onOpenChange}
          onSubmit={handleSubmit}
          onDelete={handleDelete}
          subjects={subjects}
          teachers={teachers}
          groupId={groupId}
          semesterId={semesterId}
          lesson={null}
          groups={groups}
        />
      </DialogContent>
    </Dialog>
  );
}; 