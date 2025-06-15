import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SemesterForm from './SemesterForm';
import { getSemester, createSemester, updateSemester } from '@/lib/firebaseService/semesterService';
import type { Semester } from '@/types';
import { toast } from 'sonner';

interface SemesterFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  semesterId?: string;
  onSuccess?: () => void;
}

export default function SemesterFormDialog({
  open,
  onOpenChange,
  mode,
  semesterId,
  onSuccess,
}: SemesterFormDialogProps) {
  const [semester, setSemester] = useState<Semester | null>(null);

  useEffect(() => {
    const loadSemester = async () => {
      if (mode === 'edit' && semesterId) {
        try {
          const data = await getSemester(semesterId);
          setSemester(data);
        } catch (error) {
          console.error('Error loading semester:', error);
          toast.error('Не удалось загрузить данные семестра');
        }
      } else {
        setSemester(null);
      }
    };

    if (open) {
      loadSemester();
    }
  }, [open, mode, semesterId]);

  const handleFormSubmitSuccess = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleSubmit = async (data: Omit<Semester, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (mode === 'edit' && semesterId) {
        await updateSemester(semesterId, data);
        toast.success('Семестр успешно обновлен');
      } else {
        await createSemester(data);
        toast.success('Семестр успешно создан');
      }
      handleFormSubmitSuccess();
    } catch (error) {
      console.error('Error saving semester:', error);
      toast.error('Не удалось сохранить семестр');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Редактирование семестра' : 'Создание семестра'}
          </DialogTitle>
        </DialogHeader>
        <SemesterForm
          semester={semester}
          onSubmit={handleSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
} 