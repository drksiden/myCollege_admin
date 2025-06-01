import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import SubjectForm from './SubjectForm';

interface SubjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  subjectId?: string;
  onSuccess?: () => void;
}

const SubjectFormDialog: React.FC<SubjectFormDialogProps> = ({
  open,
  onOpenChange,
  mode,
  subjectId,
  onSuccess,
}) => {
  const handleFormSubmitSuccess = () => {
    onOpenChange(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Редактирование предмета' : 'Создание предмета'}
          </DialogTitle>
        </DialogHeader>
        <SubjectForm
          mode={mode}
          subjectId={subjectId}
          onFormSubmitSuccess={handleFormSubmitSuccess}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
};

export default SubjectFormDialog; 